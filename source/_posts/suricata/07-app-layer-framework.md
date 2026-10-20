---
title: "Suricata 源码阅读(七)：从端口到协议——应用层解析框架"
tags: Suricata
categories: Suricata
date: 2026-08-03
---

> 这是系列第 7 篇。上一篇结尾，Stream 引擎把拼好、已被对方 ACK 的字节流交给了 `AppLayerHandleTCPData()`。但字节流本身不会说自己是 HTTP 还是 TLS，也不会自己分成"一个请求、一个响应"。这一篇看应用层框架怎么认出协议，怎么找到对应的解析器，以及解析出来的东西长什么样。

先给答案，应用层框架做了三件事：

1. **认出协议。** 三种手段依次尝试：在数据开头找特征串，按端口调用探测函数，查别的连接事先登记的"期望"。端口只是线索之一，不是判断的依据。
2. **按协议查表，调用解析器。** 每个协议在启动时注册一组回调：怎么建状态、两个方向的数据各交给哪个函数解析、怎么取出解析结果。C 写的解析器和 Rust 写的解析器，用的是同一套接口。
3. **解析的产物是事务。** 一问一答算一个事务，带着自己的进度。检测和日志都按事务进行，都处理完了才把它释放。

画出来是这样的：

![应用层框架](/images/suricata/suricata-applayer.svg)

<!-- more -->

## 1. 入口

`AppLayerHandleTCPData()`(`src/app-layer.c:713`)每次收到一段数据，先看这个方向的协议是否已知(`f->alproto_ts`、`f->alproto_tc`，两个方向分开记)，再分几种情况：

- **还不知道协议，而且是这个方向的第一段数据**：调用 `TCPProtoDetect()`(`src/app-layer.c:394`)做协议识别。
- **协议已经知道**：直接调用 `AppLayerParserParse()` 交给解析器。
- **协议要切换**：比如 SMTP 里发了 STARTTLS，之后的数据就是 TLS 了。这时会重置识别状态，重新识别一遍。
- **收到的是缺口通知**(上一篇的 `STREAM_GAP`)：协议已知就把缺口转给解析器。这个方向还没认出协议时，看另一个方向：另一个方向已经认出来了，就按那个协议处理；两个方向都没认出来，这条流的协议识别就宣告失败。

认出来的协议记在 `Flow` 上(`f->alproto`)，这条流后面的数据就不用再识别了。

## 2. 协议识别：三种手段

`AppLayerProtoDetectGetProto()`(`src/app-layer-detect-proto.c:1395`)按顺序尝试三种手段，前一种认出来了，后面的就不用试了：

```c
if (!FLOW_IS_PM_DONE(f, flags)) {
    pm_matches = AppLayerProtoDetectPMGetProto(tctx, f, buf, buflen, flags, pm_results, reverse_flow);
    if (pm_matches > 0) {
        alproto = pm_results[0];
        ...
        SCReturnUInt(alproto);                 /* ① 特征串认出来了 */
    }
}
if (!FLOW_IS_PP_DONE(f, flags)) {
    alproto = AppLayerProtoDetectPPGetProto(f, buf, buflen, ipproto, flags, reverse_flow);
    if (AppProtoIsValid(alproto)) {
        SCReturnUInt(alproto);                 /* ② 探测函数认出来了 */
    }
}
if (!FLOW_IS_PE_DONE(f, flags)) {
    alproto = AppLayerProtoDetectPEGetProto(f, flags);   /* ③ 查期望 */
}
```

**① PM：特征串。** 很多协议的开头很有特点。HTTP 注册的特征是这样的(`HTPRegisterPatternsForProtocolDetection()`，`src/app-layer-htp.c:2586`)：

```c
const char *methods[] = { "GET", "PUT", "POST", "HEAD", "TRACE", "OPTIONS", ... };
const char *spacings[] = { "|20|", "|09|", NULL };            /* 空格或 Tab */
const char *versions[] = { "HTTP/0.9", "HTTP/1.0", "HTTP/1.1", NULL };
...
/* 发往服务器方向：数据开头是"方法名 + 空格"，比如 "GET " */
SCAppLayerProtoDetectPMRegisterPatternCI(IPPROTO_TCP, ALPROTO_HTTP1,
        method_buffer, (uint16_t)strlen(method_buffer) - 3, 0, STREAM_TOSERVER);
...
/* 发往客户端方向：数据开头是版本号，比如 "HTTP/1.1" */
SCAppLayerProtoDetectPMRegisterPatternCI(IPPROTO_TCP, ALPROTO_HTTP1,
        versions[versions_pos], (uint16_t)strlen(versions[versions_pos]), 0, STREAM_TOCLIENT);
```

28 个方法名、两种空白字符组合起来，不区分大小写，而且必须出现在数据最开头(偏移 0)。几十个协议的特征串加起来有很多，一个一个比太慢，所以启动时 `AppLayerProtoDetectPrepareState()`(`src/app-layer-detect-proto.c:1483`)把它们全部编译进一个多模式匹配(MPM)结构，识别时一次搜索就能把所有特征都检查一遍。第 9 篇检测引擎用的，也是这套 MPM。

**② PP：按端口探测。** 有些协议没有固定的开头，比如 DNS，开头是一个随机的事务 ID。这类协议注册一个默认端口和一个探测函数：数据来自这个端口，就调用探测函数看看数据的结构像不像。DNS 的默认端口是 53(`rust/src/dns/dns.rs:1277`)，端口列表也可以在配置里改。

**③ PE：期望。** 有些连接是别的连接"约好"的。比如 FTP 在控制连接里用 `PORT`、`PASV` 命令商量好数据连接的地址和端口，FTP 解析器就先登记一个"期望"：等会儿会来一条这样的连接，它是 FTP 数据。新连接一出现，查到期望就直接认出来了。

所以 Suricata 认协议不靠端口。跑在 8080 端口上的 HTTP，在第 ① 步就会被特征串认出来；80 端口上的非 HTTP 流量，也不会因为端口是 80 就被当成 HTTP。端口只在第 ② 步作为"先试哪个探测函数"的线索。

如果收到了一定量的数据还是认不出来，识别就放弃了：`DisableAppLayer()`(`src/app-layer.c:249`)把这条流的协议记为 `failed`，以后不再做应用层解析，TCP 重组本身不受影响。

## 3. 注册：一个协议要提供什么

这些特征串、探测函数、解析函数是什么时候登记的？第 1 篇讲启动流程时提到过 `AppLayerSetup()`(`src/app-layer.c:1080`)，它在启动的"备料"阶段被调用，里面的 `AppLayerParserRegisterProtocolParsers()`(`src/app-layer-parser.c:1780`)逐个调用各协议的注册函数：`RegisterHTPParsers()`、`RegisterSSLParsers()`、`SCRegisterDnsTcpParser()`……一共 30 多个协议。

以 HTTP 为例，`RegisterHTPParsers()`(`src/app-layer-htp.c:2638`)注册了这样一组回调：

```c
AppLayerParserRegisterStateFuncs(IPPROTO_TCP, ALPROTO_HTTP1, HTPStateAlloc, HTPStateFree);
AppLayerParserRegisterGetTxCnt(IPPROTO_TCP, ALPROTO_HTTP1, HTPStateGetTxCnt);
AppLayerParserRegisterGetTx(IPPROTO_TCP, ALPROTO_HTTP1, HTPStateGetTx);
AppLayerParserRegisterGetStateProgressFunc(IPPROTO_TCP, ALPROTO_HTTP1, HTPStateGetAlstateProgress);
AppLayerParserRegisterStateProgressCompletionStatus(
        ALPROTO_HTTP1, HTP_REQUEST_PROGRESS_COMPLETE, HTP_RESPONSE_PROGRESS_COMPLETE);
...
AppLayerParserRegisterParser(IPPROTO_TCP, ALPROTO_HTTP1, STREAM_TOSERVER, HTPHandleRequestData);
AppLayerParserRegisterParser(IPPROTO_TCP, ALPROTO_HTTP1, STREAM_TOCLIENT, HTPHandleResponseData);
/* This parser accepts gaps. */
AppLayerParserRegisterOptionFlags(IPPROTO_TCP, ALPROTO_HTTP1, APP_LAYER_PARSER_OPT_ACCEPT_GAPS);
```

可以分成四类：

- **状态**：每条流分配、释放一份解析状态(`StateAlloc`/`StateFree`)，挂在 `f->alstate` 上。
- **解析**：两个方向各一个解析函数，请求交给 `HTPHandleRequestData()`，响应交给 `HTPHandleResponseData()`。
- **事务**：有几个事务、取第几个事务、事务进行到哪一步、哪一步算完成。第 5 节细讲。
- **选项**：比如 `APP_LAYER_PARSER_OPT_ACCEPT_GAPS`，声明这个解析器能处理数据缺口。

这些回调存进一张按 (协议号, 应用层协议) 索引的表里，表项是 `AppLayerParserProtoCtx`(`src/app-layer-parser.c:68`)：

```c
typedef struct AppLayerParserProtoCtx_ {
    AppLayerParserFPtr Parser[2];                  /* 两个方向的解析函数 */
    ...
    void *(*StateAlloc)(void *, AppProto);
    void (*StateFree)(void *);
    ...
    int (*StateGetProgress)(void *alstate, uint8_t direction);
    uint64_t (*StateGetTxCnt)(void *alstate);
    void *(*StateGetTx)(void *alstate, uint64_t tx_id);
    ...
    int complete_ts;                               /* 请求方向哪一步算完成 */
    int complete_tc;                               /* 响应方向哪一步算完成 */
    ...
} AppLayerParserProtoCtx;
```

框架不认识任何具体协议，只认这张表：要解析就调 `Parser[方向]`，要取事务就调 `StateGetTx`。这和第 2 篇的 `TmModule` 是同一个思路：用一组函数指针定义接口，具体实现各管各的。

**Rust 写的解析器。** DNS、QUIC、LDAP 等协议的解析器是用 Rust 写的。它们填好一个 `RustParser` 结构(`rust/src/applayer.rs:385`)：名字、默认端口、两个方向的探测函数、解析函数、事务接口……再交给 C 这边的注册函数，最后进的是同一张表。对框架来说，C 和 Rust 的解析器没有区别。

## 4. 调用解析器：三种结果

协议认出来之后，数据交给 `AppLayerParserParse()`(`src/app-layer-parser.c:1284`)。它做的事情是：

1. 第一次处理这条流时，先调用 `StateAlloc()` 建一份解析状态，挂到 `f->alstate` 上。
2. 查表找到这个方向的解析函数，调用它：

   ```c
   AppLayerResult res = p->Parser[direction](f, alstate, pstate, stream_slice,
           alp_tctx->alproto_local_storage[alproto][f->protomap]);
   ```

对 HTTP 来说，`Parser[0]` 是 `HTPHandleRequestData()`(`src/app-layer-htp.c:791`)。它把数据交给 libhtp：00 篇说过，8.0 里的 libhtp 已经用 Rust 重写了，C 这边调用的 `htp_connp_request_data()` 实际上是 Rust 导出的函数(`rust/htp/src/c_api/connection_parser.rs:165`)。

解析函数返回一个 `AppLayerResult`，有三种结果：

- **成功**：这段数据处理完了。
- **数据不够**：比如一个长度字段说后面还有 1000 字节，可这次只来了 300 字节。解析器返回"我用掉了 `consumed` 个字节，还需要 `needed` 个"。框架把 `needed` 写进 TCP 流的 `data_required`，Stream 引擎攒够这么多数据之前，不会再调用这个解析器。上一篇 `TcpStream` 结构里的 `data_required` 字段，就是给这个用的。
- **出错**：数据不符合协议，解析器没法继续。框架调用 `StreamTcpDisableAppLayer()`，这条流以后不再做应用层解析，计数器 `app_layer.error.http.parser` 这类加一。

**缺口。** 上一篇留了一个问题：带 `STREAM_GAP` 标志的缺口通知交给应用层之后会怎样？答案就在注册时的选项里。HTTP 注册了 `APP_LAYER_PARSER_OPT_ACCEPT_GAPS`，表示框架可以把缺口交给它。至于能不能接着解析，libhtp 还要看缺口落在哪里：正在读请求体时缺了一段，还能接着往下解析；缺口如果落在请求行或请求头里，就报 `INVALID_GAP` 错误，这条连接不再解析(`rust/htp/src/request.rs:1569`)。没有声明这个选项的解析器，收到缺口就按出错处理，这条流的应用层解析到此为止，计数器 `app_layer.error.<协议>.gap` 加一。

## 5. 事务：解析的产物

解析器解析出来的东西，组织成一个个**事务**(transaction)。对 HTTP 来说，一个请求加上它的响应，就是一个事务；一条连接上可以有很多个事务(HTTP keep-alive)。DNS 是一次查询加一次应答，SMTP 是一封邮件。

每个事务都有自己的**进度**。HTTP 请求方向的进度是这样走的(`rust/htp/src/transaction.rs:242`)：

```text
NOT_STARTED → LINE → HEADERS → BODY → TRAILER → COMPLETE
(请求行)    (请求头) (请求体)  (尾部字段)
```

响应方向也有一套类似的进度。注册时的 `HTP_REQUEST_PROGRESS_COMPLETE` 和 `HTP_RESPONSE_PROGRESS_COMPLETE` 告诉框架：两个方向都走到 `COMPLETE`，这个事务才算完成。

事务有两个主要的使用者：

- **检测**：HTTP 规则检查的 `http.uri`、`http.host` 这些字段，都取自事务。事务的进度很重要：比如检查请求头的规则，要等事务进度到了请求头解析完，才有东西可查。这是第 8、9 篇的内容。
- **日志**：00 篇开头那条 http 事件，就是按事务写的。它要等事务完成、服务器的响应也回来了才写出，所以里面才有 `status` 和 `length`(第 10 篇)。

事务什么时候释放？`FlowWorker` 处理完一个包后，如果这条流的应用层有了更新，就会调用 `AppLayerParserTransactionsCleanup()`(`src/app-layer-parser.c:896`)检查这条流上的事务：两个方向都完成了、检测已经检查过、所有日志模块都已经记录过，三个条件都满足，才调用 `StateTransactionFree` 释放。任何一个使用者还没处理完，事务就留着。

`stats.log` 里，`app_layer.flow.http` 是识别为 HTTP 的流数，`app_layer.tx.http` 是解析出的 HTTP 事务数。

## 小结

- `AppLayerHandleTCPData()` 是应用层的入口：协议未知先识别，已知就解析，协议切换就重新识别。
- 协议识别依次尝试三种手段：特征串(PM，用 MPM 一次搜所有协议)、按端口探测(PP)、期望(PE)。端口只是线索，不是依据。
- 每个协议在启动时注册一组回调，存进按协议索引的 `AppLayerParserProtoCtx` 表；框架只认这张表。C 和 Rust 的解析器用同一套接口。
- 解析函数有三种结果：成功、数据不够(告诉 Stream 引擎还要攒多少)、出错(这条流不再做应用层解析)。能不能处理缺口，由注册时的选项决定。
- 解析的产物是事务，带着自己的进度；检测和日志都按事务进行，都处理完了才释放。

下一篇进入检测引擎：规则文件里的一行行文本，加载之后会变成什么样的结构？`Signature`、`SigMatch` 又是怎么把规则描述变成可以执行的检测条件的？
