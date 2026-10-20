---
title: "Suricata 源码阅读(六)：TCP 重组为什么这么难——Stream 引擎"
tags: Suricata
categories: Suricata
date: 2026-07-27
---

> 这是系列第 6 篇。上一篇讲了 `Flow`：同一条连接的包已经能归到一起了，`Flow` 上还挂着一个 `protoctx` 指针，指向这条连接的 TCP 会话。这一篇就看这个会话：TCP 的段可能乱序到达、可能重传、可能互相重叠，还可能有一部分根本没被抓到，Suricata 怎么把它们拼成一条连续、可信的字节流，交给应用层去解析？

先给答案，Stream 引擎做了三件事：

1. **用状态机跟踪连接。** 握手、挥手、序号、窗口，Suricata 都按 TCP 协议自己跟一遍。每个包先检查"它出现在这条连接里合不合理"，不合理的记事件。
2. **按序号把数据拼起来。** 乱序、重传、重叠的段，按序号放进一棵红黑树，数据拷进一个流式缓冲区，拼成连续的字节流。重叠的部分如果数据不同，还要决定信哪一份。
3. **只交出对方确认收到的数据。** IDS 模式下，一个方向的数据要等另一方回了 ACK，才交给应用层；对方确认了、Suricata 却没抓到的部分，作为"缺口"通知应用层。

画出来是这样的：

![TCP 重组：一个方向上的字节流](/images/suricata/suricata-stream-reassembly.svg)

<!-- more -->

## 1. 一条连接，两个方向

`Flow->protoctx` 指向的是一个 `TcpSession`(`src/stream-tcp-private.h:283`)：

```c
typedef struct TcpSession_ {
    ...
    uint8_t state:4;            /* TCP 状态：SYN_SENT、ESTABLISHED、FIN_WAIT1 …… */
    uint8_t pstate:4;           /* 上一个状态 */
    ...
    uint32_t flags;
    uint32_t reassembly_depth;  /* 每个方向最多重组多少字节 */
    TcpStream server;           /* 服务器发出的数据 */
    TcpStream client;           /* 客户端发出的数据 */
    ...
} TcpSession;
```

一条 TCP 连接有两个方向，各自有独立的序号空间，所以 `TcpSession` 里有两个 `TcpStream`(`src/stream-tcp-private.h:106`)，每个方向一个：

```c
typedef struct TcpStream_ {
    ...
    uint8_t os_policy;          /* 重叠时按哪种操作系统的规则处理，见第 5 节 */
    uint32_t isn;               /* 初始序号 */
    uint32_t next_seq;          /* 下一个期望的序号 */
    uint32_t last_ack;          /* 对方已经确认收到的位置 */
    uint32_t next_win;          /* 窗口允许的最大序号 */
    uint32_t window;
    ...
    uint32_t base_seq;          /* 缓冲区起点对应的序号 */
    uint32_t app_progress_rel;  /* 应用层已经读到哪里 */
    uint32_t raw_progress_rel;  /* 原始数据检测已经看到哪里 */
    uint32_t log_progress_rel;  /* 流式日志已经写到哪里 */
    ...
    StreamingBuffer sb;         /* 流式缓冲区：段里的数据实际存在这里 */
    struct TCPSEG seg_tree;     /* 红黑树：按序号排好的段 */
    ...
} TcpStream;
```

前半部分(`isn`、`next_seq`、`last_ack`、窗口)是给状态机用的，跟 TCP 协议栈里的那一套差不多；后半部分是给重组用的：段放在 `seg_tree` 里，数据放在 `sb` 里。三个 `*_progress_rel` 是三个"读者"各自的进度：应用层解析、原始数据检测(第 8、9 篇)、流式日志各读各的，互不干扰。

## 2. 入口：先查校验和，再走状态机

`FlowWorker` 对 TCP 包调用 `StreamTcp()`(`src/stream-tcp.c:6079`)。它先做一件第 4 篇提过的事：

```c
if (stream_config.flags & STREAMTCP_INIT_FLAG_CHECKSUM_VALIDATION) {
    if (StreamTcpValidateChecksum(p) == 0) {
        StatsIncr(tv, stt->counter_tcp_invalid_checksum);
        return TM_ECODE_OK;
    }
}
(void)StreamTcpPacket(tv, p, stt, pq);
```

校验和不对的包直接跳过，不参与重组，计数器 `tcp.invalid_checksum` 加一。默认配置里 `stream.checksum-validation` 是开着的。如果在 `stats.log` 里看到这个计数器涨得很快，常见原因之一是网卡做了校验和卸载，而抓包时没有识别出来(第 4 篇讲过抓包时的识别逻辑)。

接着进入 `StreamTcpPacket()`(`src/stream-tcp.c:5675`)，按会话状态分两种情况：

**还没有会话。** 交给 `StreamTcpPacketStateNone()`(`src/stream-tcp.c:1197`)。正常情况下，第一个包是客户端的 SYN，于是新建一个 `TcpSession`，状态设为 `SYN_SENT`。如果第一个包不是 SYN 呢？比如 Suricata 启动时连接已经在进行中，它看到的第一个包是 SYN/ACK 或者普通的数据包。默认配置下(`stream.midstream: false`)，Suricata 不会为这种连接建立 TCP 会话：这条流照样在流表里，但不做重组，后面的应用层解析也就无从谈起。开启 `midstream` 后，Suricata 会"中途接管"，根据看到的包猜一个合理的状态，计数器 `tcp.midstream_pickups` 加一；上一篇提到的 `FlowSwap()` 翻转方向，就发生在这种接管里。

**已经有会话。** 先识别几类特殊的包：keepalive、keepalive 的 ACK、重复 ACK、窗口更新，它们不带新数据，不需要走完整的检查。其余的包交给 `StreamTcpStateDispatch()`(`src/stream-tcp.c:5578`)，按当前状态分发：

```c
switch (state) {
    case TCP_SYN_SENT:    StreamTcpPacketStateSynSent(tv, p, stt, ssn);     break;
    case TCP_SYN_RECV:    StreamTcpPacketStateSynRecv(tv, p, stt, ssn);     break;
    case TCP_ESTABLISHED: StreamTcpPacketStateEstablished(tv, p, stt, ssn); break;
    case TCP_FIN_WAIT1:   StreamTcpPacketStateFinWait1(tv, p, stt, ssn);    break;
    ...
}
```

每个状态有一个处理函数，按 TCP 协议检查这个包、决定下一个状态。状态一变，`StreamTcpPacketSetState()`(`src/stream-tcp.c:998`)顺手更新 `Flow` 的状态：`ESTABLISHED` 和挥手前半段对应流的 `ESTABLISHED`，挥手的最后阶段和关闭对应流的 `CLOSED`。上一篇说流状态决定超时时长，TCP 流的状态就是从这里来的。

## 3. 一个数据包要过哪几道检查

连接建立之后，绝大多数包都在 `ESTABLISHED` 状态下处理。以客户端发往服务器的包为例，`HandleEstablishedPacketToServer()`(`src/stream-tcp.c:2909`)大致按这个顺序检查：

1. **是不是太旧了。** 包的数据如果整个落在对方已经确认过的位置(`last_ack`)之前，就是一个早就被接收过的旧包，记 `STREAM_EST_PKT_BEFORE_LAST_ACK` 事件并拒绝。也有少数例外，比如异步流，或者对方已经确认了一段 Suricata 没见过的数据，这时会放行一部分。
2. **是不是零窗口探测。** 对方窗口为 0 时，发送方会定期发 1 个字节去试探，这种包要特殊对待，不当成越界。
3. **在不在窗口里。** 包的最后一个字节不能超过 `next_win`，也就是接收方通告的窗口允许的范围。超出了，接收方本来就不会收，记 `STREAM_EST_PACKET_OUT_OF_WINDOW` 事件。
4. **都通过了**，更新窗口、`last_ack`、`next_win`，再把数据交给重组：`StreamTcpReassembleHandleSegment()`。

和第 4 篇的解码事件一样，这些流事件也会进统计、可以被规则匹配。Suricata 自带的 `rules/stream-events.rules` 里就有这样的规则：

```text
alert tcp any any -> any any (msg:"SURICATA STREAM ESTABLISHED packet out of window"; stream-event:est_packet_out_of_window; ...)
```

检查不通过的包会怎样？IDS 模式下只是记事件，包照样往下走。inline 模式下默认会丢弃这种包(`stream.drop-invalid`，不配置时默认开启)：IPS 要保证转发出去的流量和自己检测过的一致，对说不清楚的包宁可丢掉。

## 4. 拼接：红黑树加流式缓冲区

`StreamTcpReassembleHandleSegment()`(`src/stream-tcp-reassemble.c:2009`)负责把数据放进去。核心是两个结构：

- **`seg_tree`**：一棵按序号排序的红黑树，每个节点是一个段的元信息(序号、长度、数据在缓冲区里的位置)。段先到后到无所谓，插进去就是按序号排好的。
- **`sb`**：流式缓冲区，段里的数据按序号拷进对应的位置(`StreamingBufferInsertAt()`，`src/stream-tcp-list.c:99`)。

注意这里是拷贝。第 3 篇讲过，包处理完，环里的那一帧就要还给内核，所以重组需要的数据必须另存一份。这块内存受 `stream.reassembly.memcap` 限制(默认配置 256 MiB)，超了就存不下新的段，计数器 `tcp.segment_memcap_drop` 加一。

拿开头那张图里的情况来说：

- **乱序**：#3 比 #2 晚到，但它的序号在前。插进红黑树、拷进缓冲区时都按序号放，晚到的段自然落在该在的位置。
- **重传**：#4 和 #2 的序号、数据完全一样，是发送方没等到 ACK 又发了一遍。这段数据还没被对方确认，所以能通过第 3 节的检查；重组模块发现这段已经有了，不会重复存。(已经被确认过的数据再重传，在第 3 节就会被当成旧包拒绝。)
- **深度上限**：每个方向最多重组 `stream.reassembly.depth` 字节(默认 1 MiB)。超过之后，这个方向的后续数据不再重组，应用层会被告知"这个方向不会再有数据了"。这样，大文件下载这类连接后面的内容，就不会再占用重组的内存和 CPU。

## 5. 重叠：同一段序号，两份不同的数据

图里的 #5 和 #2 有一部分序号重叠。如果重叠部分的数据一样，就是普通的重传；如果不一样，事情就麻烦了。

这是一种经典的绕过检测手段：攻击者对同一段序号发两份内容不同的数据，一份无害、一份恶意。接收方的操作系统只会采用其中一份，而**不同的操作系统采用的那份不一样**：有的以先到的为准，有的以后到的为准，还有的按重叠的位置分情况处理。如果检测引擎采用的那份和接收方不同，它检查的就是一份接收方根本没用的数据，真正的攻击内容就溜过去了。

Suricata 的对策叫"基于目标的重组"：按接收方的操作系统，模仿它的处理方式。

- **接收方是什么系统**：建立会话时，`StreamTcpSetOSPolicy()`(`src/stream-tcp.c:1032`)按目的地址查配置里的 `host-os-policy`，决定这个方向用哪种策略，存在 `TcpStream->os_policy` 里。默认配置把所有地址(`0.0.0.0/0`)都设成了 windows；如果配置里一个都没写，代码里的兜底值是 BSD(`src/stream-tcp-reassemble.h:91`)。
- **IDS 模式**：`DoHandleDataOverlap()`(`src/stream-tcp-list.c:221`)按 `os_policy` 决定重叠部分用旧数据还是新数据，和接收方保持一致。
- **inline 模式**：IPS 能改包，处理得更彻底：把新包里重叠部分的数据替换成先到的那份再转发出去，保证接收方收到的，就是 Suricata 检查过的那份。

发现重叠部分数据不同时，还会记一个 `STREAM_REASSEMBLY_OVERLAP_DIFFERENT_DATA` 事件。比较数据要花时间，所以这个检查是按需开启的：配置里打开了 `stream.reassembly.check-overlap-different-data`、运行在 inline 模式，或者加载的规则里用到了这个事件(`src/detect-engine-event.c:245`)，三者满足其一才会比较。

## 6. 什么时候交给应用层

数据拼好了，并不是马上交给应用层。`StreamTcpReassembleHandleSegment()` 开头有这么一段：

```c
/* default IDS: update opposing side (triggered by ACK) */
enum StreamUpdateDir dir = UPDATE_DIR_OPPOSING;
/* inline and stream end and flow timeout packets trigger same dir handling */
if (StreamTcpInlineMode()) {
    dir = UPDATE_DIR_PACKET;
} else if (p->flags & PKT_PSEUDO_STREAM_END) {
    dir = UPDATE_DIR_PACKET;
}
...
```

IDS 模式下默认是 `UPDATE_DIR_OPPOSING`：收到一个包时，用它携带的 ACK 去推进**对面那个方向**的数据。比如服务器回了一个 ACK，确认收到了客户端发来的前 1100 个字节，这时客户端方向上、到 1100 为止已经拼好的数据，才会交给应用层。

为什么要等 ACK？因为 Suricata 只想检查接收方真正收下的数据。窗口外、校验和错这类接收方不会收的包，前面的检查已经挡掉了；但还有些手法能让一个包被检测设备看到、却到不了接收方(比如把 TTL 设得刚好在半路过期)，单看这个包本身是看不出问题的。等接收方用 ACK 表态之后再处理，这类"只给检测设备看"的数据就骗不过去了。代价是检测会慢半拍：数据要等到对方 ACK 之后才被解析和检查。

inline 模式则是 `UPDATE_DIR_PACKET`：收到数据就立刻处理。IPS 要在转发之前做出放行还是丢弃的决定，不能等对方 ACK。流超时时那些用来冲刷残留数据的伪包(带 `PKT_PSEUDO_STREAM_END`，上一篇讲过)也一样，直接处理。

真正把数据交出去的是 `ReassembleUpdateAppLayer()`(`src/stream-tcp-reassemble.c:1265`)。它从应用层的进度(`app_progress`)开始，取出缓冲区里的数据，用 `AdjustToAcked()` 截到已经被确认的位置，再调用 `AppLayerHandleTCPData()` 交给应用层。

**缺口。** 图里 1050 到 1200 之间的数据，Suricata 一直没抓到，可对方已经 ACK 到了 1100：说明接收方收到了，只是 Suricata 这边丢了(通常是抓包时内核丢包，第 3 篇的 `capture.kernel_drops`)。这时不能一直等下去，`ReassembleUpdateAppLayer()` 会调用 `AppLayerHandleTCPData()`，但不给数据，只带一个 `STREAM_GAP` 标志，告诉应用层"这里少了一段"，同时计数器 `tcp.reassembly_gap` 加一。应用层解析器能不能从缺口之后接着解析，取决于协议和解析器自己，这是下一篇的内容。

## 小结

- 每条 TCP 连接对应一个 `TcpSession`，里面两个 `TcpStream` 分别管两个方向：一半字段给状态机用，一半给重组用。
- 入口先查校验和，再按 TCP 状态分发；默认不接管看不到握手的连接(`midstream: false`)。状态变化会同步到 `Flow` 的状态上。
- 数据包要检查是否过旧、是否越出窗口，不合理的记流事件；inline 模式下默认直接丢弃。
- 段按序号插进红黑树，数据拷进流式缓冲区；乱序、重传自然解决，每个方向最多重组 `depth` 字节。
- 重叠且数据不同时，按目标主机的操作系统策略决定用哪份(IDS)，或把包改回先到的那份(inline)。
- IDS 模式下，数据要等对方 ACK 才交给应用层；对方确认了、Suricata 却没抓到的部分，作为缺口通知应用层。

下一篇进入应用层：拼好的字节流交给 `AppLayerHandleTCPData()` 之后，Suricata 怎么认出这是 HTTP 还是 TLS，解析器又是怎么被找到、注册和调用的？
