---
title: "Suricata 源码阅读(零)：一个数据包如何穿过 Suricata"
tags: Suricata
categories: Suricata
date: 2026-06-16
---

在一个有 Suricata 盯着的网络里，执行一次：

```bash
curl http://example.com/
```

几毫秒后，Suricata 的 `eve.json` 里多出这样一行(为了好读，这里做了换行和缩进；字段顺序与 8.0.7 的实际输出一致)：

```json
{
  "timestamp": "2026-09-24T14:03:21.482913+0800",
  "flow_id": 1712362980541209,
  "in_iface": "eth0",
  "event_type": "http",
  "src_ip": "10.0.0.23",
  "src_port": 51724,
  "dest_ip": "93.184.215.14",
  "dest_port": 80,
  "proto": "TCP",
  "ip_v": 4,
  "pkt_src": "wire/pcap",
  "tx_id": 0,
  "http": {
    "hostname": "example.com",
    "url": "/",
    "http_user_agent": "curl/8.7.1",
    "http_content_type": "text/html",
    "http_method": "GET",
    "protocol": "HTTP/1.1",
    "status": 200,
    "length": 1256
  }
}
```

从网线上的一串字节，到这行结构清楚的 JSON，中间发生了什么？这个系列想回答的就是这个问题。

<!-- more -->

## 1. Suricata 是什么

Suricata 是一个开源的网络威胁检测引擎。它实时读取网络流量，拿规则库去匹配，常见用法有三种：当 IDS，只告警不拦截；内联部署当 IPS，直接拦下恶意流量；或者当 NSM，把协议元数据和文件记下来，留给事后分析——开头那行 http 日志就是 NSM 的产物。

名字来自非洲草原上的猫鼬(学名 *Suricata suricatta*)。猫鼬群居，总有几只直立放哨，一有风吹草动就尖声报警。2009 年，OISF(Open Information Security Foundation)用这个名字做了一个开源、多线程的 IDS/IPS 引擎，想在当时基本单线程的 Snort 之外，提供另一个选择。名字挑得很贴切：这个引擎做的也是放哨——盯着每一个包，一有可疑动静就报警。

## 2. 跟着这个包走一遍

我们盯住 curl 发出的那个带着 `GET /` 请求的 TCP 包，看它在 Suricata 里走过哪些地方。假设 Suricata 用 af-packet 从网卡抓包、以 workers 模式运行，这是生产环境里很常见的组合，也是后面各篇默认的场景。

整条路线画出来是这样的，下面按顺序一站一站走：

<img src="/images/suricata/suricata-pipeline.svg" alt="Suricata 数据包流水线总览" width="80%">

**① 开工之前。** 包到来之前，进程早已准备好一切：读配置、注册处理模块、加载规则，再创建好一批 worker 线程，每个线程上都串好了 `ReceiveAFP → DecodeAFP → FlowWorker → RespondReject` 这几道工位。启动时经过的五个阶段，是第 1 篇的内容；工位怎么串、线程怎么分工，是第 2 篇的内容。

**② 进门：从网卡到 `Packet`。** 包到达网卡后，内核把它放进 AF_PACKET 的环形缓冲区。这块内存用 mmap 同时映射到内核和 Suricata 进程里，用户态读包时省掉了一次拷贝。worker 线程在 `ReceiveAFPLoop()` 里用 `poll()` 等待数据，`AFPReadFromRing()`(启用 TPACKET_V3 时是 `AFPReadFromRingV3()`)取出一帧，再从本线程的包池里拿一个预先分配好的 `Packet`，让它直接指向这一帧的数据(零拷贝)，交给 `TmThreadsSlotProcessPkt()` 顺着工位链往下送；等包处理完，这一帧才还给内核。→ 第 3 篇

**③ 剥壳：解码。** `DecodeAFP()` 把包交给 `DecodeLinkLayer()`，从以太网头开始一层层往里剥：`DecodeEthernet()` → `DecodeIPV4()` → `DecodeTCP()`。每剥一层，就把这一层头部的位置记进 `Packet`(只记指针，不拷贝)，同时检查长度和各个字段是否合法，发现畸形就记一个解码事件。剥到 TCP 这一层，`FlowSetupPacket()` 给包打上"需要找流"的标记，并按五元组算好哈希值。→ 第 4 篇

**④ 认亲：找到所属的 Flow。** 接下来进入 `FlowWorker`，后面几步全在这一个模块里完成。`FlowHandlePacket()` 拿着哈希值去流表里找：同一条 TCP 连接的所有包，都归到同一个 `Flow` 上，找不到就新建一个。我们这个包在三次握手之后才出现，所以对应的 `Flow` 早就建好了。流表由所有 worker 线程共享，按哈希桶加锁。→ 第 5 篇

**⑤ 拼接：TCP 重组。** `StreamTcp()` 先用 TCP 状态机检查这个包在连接里是否合理(序号对不对、连接处于什么状态)，再把它携带的数据按序号放进重组缓冲区。网络上的包可能乱序、重传、重叠，只有把字节拼成连续的流，后面的应用层解析才靠得住。→ 第 6 篇

**⑥ 读懂：应用层解析。** 数据拼好后，重组模块调用 `AppLayerHandleTCPData()` 交给应用层。连接上的第一段数据会先做协议识别：`AppLayerProtoDetectGetProto()` 结合端口和内容特征，认出这是 HTTP。之后数据交给 HTTP 解析器(8.0 里是用 Rust 实现的 libhtp，在 `rust/htp/` 下)，解析出方法、Host、URI、User-Agent，组成一个事务(transaction)。→ 第 7 篇

**⑦ 检查：规则检测。** `Detect()` 登场。几万条规则不可能对每个包都挨个试一遍，所以先按协议、端口、方向挑出一个规则组(SGH)，再用多模式匹配(MPM)，在包和 HTTP 字段里一次性搜出所有规则的关键字。只有关键字命中了的少数规则，才会被逐条完整检查。→ 第 8、9 篇

**⑧ 记录：输出。** 最后 `OutputLoggerLog()` 调用各类日志模块。这里有个细节：http 事件是按事务记录的，要等服务器的响应也回来、事务完成之后才写出，所以开头那行 JSON 里才会有 `status` 和 `length`。如果有规则命中，还会额外写一条 `event_type` 为 `alert` 的记录。→ 第 10 篇

在 workers 模式下，从 ② 到 ⑧ 全程都在同一个 worker 线程里完成，包不用在线程之间传来传去。

## 3. 读完能得到什么

如果你在用 Suricata，读源码能回答很多手册回答不了的问题：某条日志是在哪一步产生的，丢包该看哪个计数器，为什么有的规则特别慢。

如果你关心的是工程本身，Suricata 是一个很好的样本。一个要跑到线速(链路跑满时也能处理完每一个包)的网络程序，会用到的套路它几乎都用上了：

- **每个线程跑完整条流水线**：避免包在线程之间来回交接。
- **包池预分配**：热路径上不做 malloc。
- **共享的流表按哈希桶加锁**：锁的粒度只有一个桶，多个线程可以同时查表。
- **多模式匹配预过滤**：把几万条规则压到每个包只需细查少数几条。
- **处处是状态机**：TCP 连接、应用层解析、检测进度，都是用状态机来管理的。

这些做法在其他高性能网络程序里也会反复出现。

## 4. 怎么跟着读

**拿到代码。** 本系列基于 Suricata 8.0.7，文中的 `文件:行号` 都以这个版本为准：

```bash
git clone https://github.com/OISF/suricata.git
cd suricata
git checkout suricata-8.0.7
```

**准备工具。** 能跳转到定义、能查找引用就够了：VS Code 或 CLion 配 clangd，或者用 ctags。clangd 需要 `compile_commands.json`，可以在编译时用 bear 生成。

**想动手的话。** 编一个带调试信息的版本(比如 `CFLAGS="-O0 -g"`)，用 `-r` 读一个 pcap 文件，再在 gdb 里给 `FlowHandlePacket()`、`Detect()` 下断点，就能亲眼看着一个包走完上面这八步。从源码编译的具体步骤，见官方文档的安装说明。

**阅读原则。** `src/` 下有上千个文件、几十万行代码，一上来就想"通读"，基本等于劝退自己。所以这个系列不按目录走，而是按包实际经过的顺序走：先问"这一步在流水线的哪个工位"，再去看对应的代码。每篇只挖一条主线，旁支细节先记下来，不在当篇展开。

## 5. 系列篇目

1. **[启动一个 Suricata 进程，到底要经过多少步？](/suricata/01-startup-and-architecture/)** —— 从 `main()` 到第一个包被处理，要走哪五个阶段？进程在这期间把什么搭了起来？[已发布]
2. **[一条流水线是怎么跑起来的：线程模型与 TmModule](/suricata/02-thread-model-and-tmmodule/)** —— `TmModule` 和 `ThreadVars` 如何把各个处理阶段串起来？single、autofp、workers 三种模式，到底差在哪里？[已发布]
3. **[包是怎么进来的：捕获模块与 Packet 结构体](/suricata/03-capture-and-packet/)** —— AF_PACKET、PCAP、NFQ 抓到的都只是原始字节，它们如何把一个包交给引擎？`Packet` 又为什么不只是一个普通结构体？[已发布]
4. **[把字节剥成协议：解码层](/suricata/04-decode-layer/)** —— 从以太网到 IP，再到 TCP，一层层拆开的过程并不只是"取几个字段"。畸形包、隧道和边界情况，会在这里露出真面目。[已发布]
5. **[引擎开始记住事情：Flow](/suricata/05-flow/)** —— 单个包很快就过去了，`Flow` 才让 Suricata 记住一段通信。流表怎么查找、什么时候过期、谁来回收，这里是理解后续模块的关键。[已发布]
6. **[TCP 重组为什么这么难：Stream 引擎](/suricata/06-stream-engine/)** —— 乱序、重传、gap，还有专门用来绕过检测的 evasion。看似只是把 TCP 段拼起来，实际上是一场持续处理不确定性的状态机游戏。[已发布]
7. **[从端口到协议：应用层解析框架](/suricata/07-app-layer-framework/)** —— Suricata 怎么判断眼前是 HTTP、TLS 还是别的协议？以 probing parser 和 HTTP 为例，走一遍解析器被发现、注册和调用的完整路径。[已发布]
8. **[规则还没开始匹配：检测引擎如何把文本变成结构](/suricata/08-rule-parsing/)** —— 一行规则加载之后，会被拆成什么？`Signature`、`SigMatch` 这些结构，如何把规则描述转换成可执行的检测条件？[已发布]
9. **[几万条规则一起跑：多模式匹配与规则分组](/suricata/09-mpm-and-rule-grouping/)** —— 规则数量上来之后，逐条检查显然行不通。MPM 和签名分组(SGH)如何把搜索空间压下来，让检测引擎仍然有机会跑到线速？[已发布]
10. **[命中之后发生什么：从规则匹配到一行 JSON](/suricata/10-from-rule-match-to-json/)** —— 一条告警不是凭空写进日志的。`output` 模块如何注册，事件如何一路传到 EVE，最后又怎样变成我们看到的 JSON？[已发布]

顺序可能会随着源码阅读的进展微调，但主线不会变：跟着一个包，从进门一直走到变成日志。

下一篇，从 `main()` 开始：一个 Suricata 进程在处理第一个包之前，先把哪些东西搭了起来？

## 附：架构全景图

上面的流水线只画了主干。把控制平面、后台管理线程、共享状态和基础设施都画上，整个引擎长这样，适合读到后面几篇时回来对照：

![Suricata 架构总览：控制平面、数据平面、后台管理线程与基础设施](/images/suricata/suricata-architecture.svg)
