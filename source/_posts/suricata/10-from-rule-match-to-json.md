---
title: "Suricata 源码阅读(十)：命中之后发生什么——从规则匹配到一行 JSON"
tags: Suricata
categories: Suricata
date: 2026-08-24
---

> 这是系列第 10 篇，也是最后一篇。上一篇结尾，一条规则的所有条件都满足了，"产生一条告警"。可告警不是凭空出现在 `eve.json` 里的：它要先经过一轮收尾，再由日志模块拼成 JSON、写到文件里。00 篇开头那行 http 事件，走的也是这条路。这一篇就把最后这一段走完。

先给答案，输出这一段做了三件事：

1. **告警先攒起来，再统一收尾。** 规则命中时，告警先放进一个队列；整个包检测完，再统一排序、做抑制和阈值检查、执行 `drop` 这类动作，最后挂到 `p->alerts` 上。
2. **日志按类型分发。** 包处理的最后一步，`OutputLoggerLog()` 把包交给几类"根日志器"：包、事务、文件……每一类管着一批日志模块，各模块按自己的条件，或者按事务的进度，决定写不写。
3. **拼成一行 JSON，写出去。** EVE 的每个日志模块用同一套工具拼 JSON：先拼所有事件共用的头，再加自己的字段，最后写到文件、syslog、unix socket 或 redis。

画出来是这样的：

![从规则命中到一行 JSON](/images/suricata/suricata-output.svg)

<!-- more -->

## 1. 告警：先进队列，再统一收尾

规则检测命中时，检测引擎并不马上把告警写进包里，而是调用 `AlertQueueAppend()`(`src/detect-engine-alert.c:393`)把它放进本线程的告警队列。原因是：一个包可能命中好几条规则，而这些规则之间会互相影响。比如命中了一条 `pass` 规则，排在它后面的告警就不该再出现；`drop` 也要等所有规则都看完才能确定。

整个包检测完，`PacketAlertFinalize()`(`src/detect-engine-alert.c:785`)统一处理这个队列：

1. **排序**：按规则的顺序排好(上一篇的规则排序在这里又起作用了)。
2. **逐条检查**：`PacketAlertHandle()`(`src/detect-engine-alert.c:74`)先看抑制(`suppress`)，再看阈值(`threshold`)。比如规则写了"同一个源地址 60 秒内只告警一次"，第二次命中就在这里被拦下。
3. **执行动作**：`drop`、`pass` 这类动作在这里生效，`drop` 会把包标记为丢弃(IPS 模式下，第 3 篇讲过，这个包就不会被转发出去)。
4. **写进 `p->alerts`**：通过检查的告警，写进第 3 篇讲过的 `Packet` 里的 `alerts` 字段。每个包最多 15 条(`packet-alert-max`，`src/decode.h:284`)；被抑制的只计入 `suppressed`，超出上限的只计入 `discarded`。

到这里，告警还只是 `Packet` 上的一段数据。真正写到日志里，是下一步的事。

## 2. 日志：按类型分发

第 5 篇讲 `FlowWorker` 时提到，它的最后一步是 `OutputLoggerLog()`，而且对每个包都会调用。它本身非常简单(`src/output.c:785`)：

```c
TmEcode OutputLoggerLog(ThreadVars *tv, Packet *p, void *thread_data)
{
    LoggerThreadStore *thread_store = (LoggerThreadStore *)thread_data;
    RootLogger *logger = TAILQ_FIRST(&active_loggers);
    LoggerThreadStoreNode *thread_store_node = TAILQ_FIRST(thread_store);
    while (logger && thread_store_node) {
        logger->LogFunc(tv, p, thread_store_node->thread_data);
        logger = TAILQ_NEXT(logger, entries);
        thread_store_node = TAILQ_NEXT(thread_store_node, entries);
    }
    return TM_ECODE_OK;
}
```

它依次调用几个"根日志器"。这些根日志器在 `OutputRegisterRootLoggers()`(`src/output.c:935`)里注册，一共有包、事务、文件、文件数据、流式数据几类，每一类再管着一批具体的日志模块。

**包日志器。** `OutputPacketLog()`(`src/output-packet.c:84`)遍历挂在它下面的模块，每个模块带一个条件函数，满足条件才写：

```c
if (logger->ConditionFunc(tv, store->thread_data, (const Packet *)p)) {
    logger->LogFunc(tv, store->thread_data, (const Packet *)p);
}
```

EVE 的告警模块就挂在这里，它的条件函数很直白(`src/output-json-alert.c:927`)：

```c
static bool JsonAlertLogCondition(ThreadVars *tv, void *thread_data, const Packet *p)
{
    return (p->alerts.cnt || (p->flags & PKT_HAS_TAG));
}
```

包上有告警(或者有 `tag` 关键字标记的数据)才写。绝大多数包没有告警，这一步就直接跳过了。

**事务日志器。** `OutputTxLog()`(`src/output-tx.c:336`)遍历这条流上的事务，对每个事务、每个还没写过的日志模块判断一次：事务进度够不够。够了就写，写完在事务的 `logged` 标志里记一笔，下次就不再写了。

"进度够不够"由日志模块注册时决定。HTTP 日志模块注册时没有指定进度，`src/output-tx.c:98` 起的这段逻辑会把它换成协议注册的"完成状态"：

```c
} else if (tc_log_progress < 0) {
    op->tc_log_progress =
        AppLayerParserGetStateProgressCompletionStatus(alproto, STREAM_TOCLIENT);
}
```

也就是说，HTTP 事件要等事务两个方向都完成才写。这就是 00 篇第 ⑧ 站说的：http 事件要等服务器的响应也回来、事务完成之后才写出，所以那行 JSON 里才有 `status` 和 `length`。第 7 篇讲事务释放的条件之一"所有日志模块都已经记录过"，看的也是这里打的 `logged` 标志。

**不走这条路的。** 有两类日志不经过 `OutputLoggerLog()`：

- **`flow` 日志**：第 5 篇讲过，它在流被回收时，由 FlowRecycler 线程调用 `OutputFlowLog()` 写出，记录的是整条连接的汇总。
- **`stats` 日志**：由专门的统计线程定时写出，前面几篇提到的那些计数器(`capture.kernel_drops`、`tcp.reassembly_gap`、`app_layer.flow.http`……)都在这里。

**哪些模块被启用。** 这些日志模块都是在启动时注册的(`OutputRegisterLoggers()`，`src/output.c:1072`)，但只有配置文件 `outputs` 下打开的才会被启用：`RunModeInitializeOutputs()`(`src/runmodes.c:772`)读配置，把 `eve-log` 的 `types` 里列出的 `alert`、`http`、`dns`、`flow` 等模块挂到对应的根日志器上。默认配置里这些常用类型都是打开的，所以像 00 篇开头那样 `curl` 一次，除了 http 事件，通常还会看到 dns、fileinfo、flow 等事件。

## 3. EVE：拼成一行 JSON

告警模块的写函数最终调用 `AlertJson()`(`src/output-json-alert.c:701`)，对包上的每一条告警拼一行 JSON：

```c
for (int i = 0; i < p->alerts.cnt; i++) {
    ...
    SCJsonBuilder *jb =
            CreateEveHeader(p, LOG_DIR_PACKET, "alert", &addr, json_output_ctx->eve_ctx);
    ...
    AlertJsonHeader(p, pa, jb, json_output_ctx->flags, &addr, xff_buffer);
    ...
    AlertAddAppLayer(p, jb, pa->tx_id, json_output_ctx->flags);   /* 命中事务的应用层字段 */
    ...
    EveAddFlow(p->flow, jb);                                       /* flow 信息 */
    ...
    OutputJsonBuilderBuffer(tv, p, p->flow, jb, aft->ctx);         /* 写出去 */
}
```

**JsonBuilder。** 拼 JSON 用的是 `SCJsonBuilder`，它是用 Rust 实现的(`rust/src/jsonbuilder.rs:107`)，C 这边通过 `SCJbSetString()`、`SCJbSetUint()` 这类函数往里加字段。各日志模块用的都是这一套，所以输出的格式完全统一。

**共用的头。** 每一行 EVE 都以 `CreateEveHeader()`(`src/output-json.c:832`)开头：`timestamp`、`flow_id`、`in_iface`、`event_type`、五元组、`pkt_src`……00 篇开头那行 http 事件的前半部分，就是它拼出来的；当时说"字段顺序与 8.0.7 的实际输出一致"，依据就是这个函数里各字段的写入顺序。

**告警自己的字段。** `AlertJsonHeader()`(`src/output-json-alert.c:210`)加上 `alert` 对象：`action`、`gid`、`signature_id`、`rev`、`signature`(就是规则的 `msg`)、`category`、`severity`。第 8 篇里规则的 `sid`、`rev`、`msg`，在这里原样出现在 JSON 里。如果告警来自应用层事务，默认还会把这个事务的字段一起带上，比如命中 HTTP 规则的告警里，会有一个类似 http 事件的 `http` 对象，方便直接看到是哪个请求触发的。

**写出去。** `OutputJsonBuilderBuffer()`(`src/output-json.c:991`)把拼好的 JSON 放进本线程的缓冲区，交给 `LogFileWrite()`(`src/util-logopenfile.c:1095`)。写到哪里由 `eve-log` 的 `filetype` 决定：默认是普通文件 `eve.json`，也可以是 syslog、unix socket 或 redis。

## 小结

- 规则命中时，告警先进本线程的队列；包检测完，`PacketAlertFinalize()` 统一排序、做抑制和阈值检查、执行动作，写进 `p->alerts`，每个包最多 15 条。
- `OutputLoggerLog()` 把包交给几类根日志器：包日志器按条件函数决定写不写(告警模块要求包上有告警)，事务日志器按事务进度决定写不写(HTTP 要等事务完成)，写完打上 `logged` 标志。
- `flow` 日志在流回收时写，`stats` 日志由统计线程写；启用哪些模块，由配置文件的 `outputs` 决定。
- EVE 用 Rust 实现的 JsonBuilder 拼 JSON：`CreateEveHeader()` 拼共用的头，各模块加自己的字段，`OutputJsonBuilderBuffer()` 写到文件、syslog、unix socket 或 redis。

## 写在最后

到这里，00 篇开头那个问题，可以从头到尾回答一遍了：执行一次 `curl http://example.com/`，`eve.json` 里那行 JSON 是怎么来的？

- **第 1、2 篇**：Suricata 启动时搭好了流水线：worker 线程上串好了 `ReceiveAFP → DecodeAFP → FlowWorker → RespondReject`，放行之后开始工作。
- **第 3 篇**：包到达网卡，内核把它放进 AF_PACKET 的环形缓冲区；worker 线程从包池里拿一个 `Packet`，零拷贝地指向这一帧。
- **第 4 篇**：解码层把以太网、IP、TCP 一层层剥开，记下各层头部的位置，算好流的哈希值。
- **第 5 篇**：`FlowWorker` 在流表里找到这条连接的 `Flow`。
- **第 6 篇**：TCP 重组把 GET 请求的数据按序号拼好，等服务器 ACK 之后交给应用层。
- **第 7 篇**：应用层识别出 HTTP，libhtp 解析出方法、Host、URI，组成一个事务。
- **第 8、9 篇**：规则早在启动时就被解析、分组、编进了 MPM；这个包找到自己的规则组，预过滤、细查，没有规则命中。
- **第 10 篇**：服务器的响应回来，事务完成，事务日志器调用 HTTP 日志模块，`CreateEveHeader()` 拼出头部、HTTP 模块加上 `http` 对象，一行 JSON 写进了 `eve.json`。等这条连接结束、流被回收，又一行 `flow` 事件跟着写了出来。

这就是一个数据包穿过 Suricata 的全过程。回头看，有几个设计贯穿了整个系列：

- **用函数指针表解耦**：`TmModule`(第 2 篇)、应用层解析器表(第 7 篇)、关键字表(第 8 篇)、日志模块(第 10 篇)，框架只管查表调用，具体实现各管各的，新增一个协议、一个关键字、一种日志，只要多注册一项，不用改框架的核心逻辑。
- **能复用就不分配**：包池(第 3 篇)、流的备用池(第 5 篇)，热路径上尽量不做 malloc。
- **能不拷贝就不拷贝**：环形缓冲区的零拷贝(第 3 篇)，解码只记指针(第 4 篇)。
- **能少做就少做**：校验和要用时才算(第 4、6 篇)，规则先分组再预过滤(第 9 篇)，日志先看条件再拼 JSON(第 10 篇)。
- **跟着进度走**：IDS 模式下 TCP 数据要等对方 ACK(第 6 篇)，应用层的事务进度决定了检测什么时候能做(第 9 篇)、日志什么时候能写(第 10 篇)、事务什么时候能释放(第 7 篇)。

当然，Suricata 远不止这些：IPS 模式下的裁决、文件提取、Lua 脚本、多租户、规则热加载……本系列沿着一个包的主线走，很多支线都只是路过。如果你读到这里，手里已经有了一张地图，剩下的路口，可以自己顺着源码走进去了。
