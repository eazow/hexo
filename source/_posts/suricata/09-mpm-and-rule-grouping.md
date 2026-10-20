---
title: "Suricata 源码阅读(九)：几万条规则一起跑——多模式匹配与规则分组"
tags: Suricata
categories: Suricata
date: 2026-08-17
---

> 这是系列第 9 篇。上一篇讲了一条规则怎么从文本变成结构。可真实的规则集动辄几万条，如果每个包都把几万条规则挨个试一遍，再快的机器也跟不上线速。这一篇看检测引擎怎么把"几万条"压到"少数几条"：规则是怎么分组的，多模式匹配(MPM)又是怎么做预过滤的。

先给答案，靠的是两层筛选：

1. **分组。** 启动时按"方向 × 协议 × 服务端端口"把规则分成若干组。一个发往 80 端口的 TCP 包，只需要看"发往服务器、TCP、80 端口"这一组规则，其他组的规则跟它无关。
2. **预过滤。** 每条规则挑出一段最有代表性的内容，叫"快速模式"(fast pattern)。每个组把组里所有规则的快速模式编进一个多模式匹配器，一个包来了，只搜一遍，就知道哪些规则的快速模式出现了。只有这些规则才需要逐条细查。

两层加起来，就是 00 篇第 ⑦ 站说的"先挑出一个规则组(SGH)，再用 MPM 一次性搜出所有规则的关键字"：

![几万条规则一起跑](/images/suricata/suricata-detect-flow.svg)

<!-- more -->

## 1. 分组之前：先给规则排序

`SigGroupBuild()`(`src/detect-engine-build.c:2191`)是上一篇提到的建结构的总入口。在它之前，规则先被排了一次序：`SCSigRegisterSignatureOrderingFuncs()`(`src/detect-engine-sigorder.c:919`)注册的排序规则依次是：

- **动作**：默认 `pass` > `drop` > `reject` > `alert`。这个顺序可以用配置项 `action-order` 改。
- **流变量依赖**：用 `flowbits:set` 设置变量的规则，排在用 `flowbits:isset` 检查变量的规则前面，`flowint`、`hostbits` 等同理。否则在同一个包上，检查变量的规则可能先于设置变量的规则执行，就可能错过本该命中的情况。
- **优先级**：`priority` 的数值越小越靠前，1 是最高优先级。
- 以上都相同时，按 sid 从小到大排(`SCSigLessThan()`)。

排好序之后，`SigGroupBuild()` 一开头就按这个顺序给每条规则分配一个内部编号 `s->iid`。后面你会看到，检测时候选规则是按这个编号排序的，所以规则的检查顺序就是这里排出来的优先顺序。

## 2. 分组：方向 × 协议 × 服务端端口

`SigGroupBuild()` 接着分几个阶段建规则组。分组发生在 `SigPrepareStage2()`(`src/detect-engine-build.c:1873`)：

```c
de_ctx->flow_gh[1].tcp = RulesGroupByPorts(de_ctx, IPPROTO_TCP, SIG_FLAG_TOSERVER);
de_ctx->flow_gh[0].tcp = RulesGroupByPorts(de_ctx, IPPROTO_TCP, SIG_FLAG_TOCLIENT);
de_ctx->flow_gh[1].udp = RulesGroupByPorts(de_ctx, IPPROTO_UDP, SIG_FLAG_TOSERVER);
de_ctx->flow_gh[0].udp = RulesGroupByPorts(de_ctx, IPPROTO_UDP, SIG_FLAG_TOCLIENT);
RulesGroupByIPProto(de_ctx);       /* 其他 IP 协议按协议号分组 */
```

TCP 和 UDP 各按两个方向、再按端口分组；ICMP、GRE 这类没有端口的协议，按协议号分组。另外两类规则单独处理：只看 IP 地址的规则(上一篇的 `IPONLY` 类型)交给专门的 IP-only 引擎；只看解码事件的规则(第 4 篇的 `decode-event`)另建一组。

**按哪个端口分。** `RulesGroupByPorts()`(`src/detect-engine-build.c:1468`)对发往服务器方向的组看规则的目的端口，对发往客户端方向的组看规则的源端口：两种情况看的都是服务端那一侧的端口，因为服务端端口才代表"这是什么服务"，客户端端口一般是随机的。

一条规则的端口如果是 `any`，它就会出现在这个方向的每一个组里。上一篇那条 `alert http any any -> any any` 规则就是这样：它不限端口，所以哪个端口组里都有它，协议是不是 HTTP，交给后面的检查去判断。

**组数有上限。** 端口的组合可能非常多，每个组都要建自己的 MPM，组太多内存会吃不消。所以组数有上限，由配置项 `detect.profile` 决定。默认的 `medium` 下，发往服务器方向最多 40 组，发往客户端方向最多 20 组(`src/detect-engine.c:3039` 附近)；超出的端口会被合并进相近的组。分完之后还会去重：规则完全相同的组只保留一份，其他组共用它。日志里的"Unique rule groups"就是最后剩下的组数，这条日志是 perf 级别的，默认的日志级别下不一定看得到。

## 3. 规则组里有什么

分好的组，在运行时就是一个 `SigGroupHead`(SGH，`src/detect.h:1678`)。它比想象中简单：

```c
typedef struct SigGroupHead_ {
    uint16_t flags;
    uint16_t filestore_cnt;
    uint32_t id;
    PrefilterEngine *pkt_engines;       /* 作用于包头的预过滤引擎 */
    PrefilterEngine *payload_engines;   /* 作用于包载荷的预过滤引擎 */
    PrefilterEngine *tx_engines;        /* 作用于应用层事务的预过滤引擎 */
    PrefilterEngine *frame_engines;     /* 作用于应用层帧的预过滤引擎 */
    PrefilterEngine *post_rule_match_engines;
    SigGroupHeadInitData *init;
} SigGroupHead;
```

除了几个计数和标志，SGH 里主要就是几组**预过滤引擎**。组里有哪些规则，只在建组阶段的 `init` 里用到。运行时检测引擎并不遍历组里的规则，而是运行这些预过滤引擎，由它们报告"哪些规则值得细查"。

这些引擎是在 `SigPrepareStage4()`(`src/detect-engine-build.c:2046`)里，由 `PrefilterSetupRuleGroup()` 给每个组建的。其中最重要的就是 MPM。

## 4. 快速模式：每条规则挑一段内容

要用 MPM 做预过滤，每条规则得先挑出一段内容交给 MPM，这段内容就是**快速模式**。`RetrieveFPForSig()`(`src/detect-engine-mpm.c:1140`)按这样的顺序挑：

1. **规则里显式写了 `fast_pattern` 的**，直接用那个 `content`。
2. 否则，先看规则用到了哪些缓冲区，只在**优先级最高的缓冲区**里挑。各缓冲区注册 MPM 时都带着一个优先级，比如上一篇的 `http_uri`，注册时的优先级是 2。
3. 在这些缓冲区里，挑**最长的** `content`。越长越不容易碰巧出现，误报的候选就越少。
4. 一样长时，比较**模式强度**。`PatternStrength()`(`src/detect-engine-mpm.c:984`)给每个字节打分：每种字节第一次出现时，字母加 3 分，其他可打印字符加 4 分，其余二进制字节加 6 分；重复出现的字节只加 1 分。字节种类越多、越少见，得分越高，像 `aaaa` 这样全是重复字母的模式得分最低。

挑好之后，每个组按缓冲区把组里各条规则的快速模式加进对应的 MPM：包载荷一个，`http_uri` 一个，`http_host` 一个……没有任何 `content` 的规则挑不出快速模式，由一个专门的"non-PF"预过滤引擎负责：它不做内容搜索，只做几项代价很低的检查(包的特征掩码，再加上应用层协议、目的端口或 `dsize` 中的一项)，通过了就把规则列为候选(`src/detect-engine-prefilter.c:536` 起)。

**用哪种 MPM 算法。** 由配置项 `mpm-algo` 决定，默认是 `auto`：编译时带了 Hyperscan 就用 Hyperscan，否则用 Aho-Corasick(`src/util-mpm.c:215`)。两者都能做到"一次扫描，找出所有模式"：扫描一遍数据的代价，基本不随快速模式的数量线性增长。一万个模式，并不需要扫一万遍。第 7 篇的协议识别用的也是这套 MPM。

## 5. 运行时：一个包怎么走

检测的入口是 `DetectRun()`(`src/detect.c:105`)。去掉细节，一个包要经过这几步：

```c
DetectRunInspectIPOnly(th_v, de_ctx, det_ctx, pflow, p);       /* IP-only 规则 */
DetectRunGetRuleGroup(de_ctx, p, pflow, &scratch);             /* ① 找规则组 */
DetectRunPrefilterPkt(th_v, de_ctx, det_ctx, p, &scratch);     /* ② ③ 预过滤，整理候选 */
DetectRulePacketRules(th_v, de_ctx, det_ctx, p, pflow, &scratch); /* ④ 逐条细查 */
...
DetectRunTx(...);                                              /* ⑤ 应用层事务 */
```

**IP-only 规则。** 只看 IP 地址的规则不需要每个包都查：同一条流的地址不会变，所以只在每个方向的第一个包上查一次。

**① 找规则组。** `DetectRunGetRuleGroup()`(`src/detect.c:441`)先看 `Flow` 上有没有缓存。第 5 篇说过，`Flow` 上有 `sgh_toserver`、`sgh_toclient` 两个字段，就是这里用的：没有缓存时，调用 `SigMatchSignaturesGetSgh()`(`src/detect.c:292`)按方向、协议、服务端端口查表，查到后存进 `Flow`。同一条流后面的包，直接用缓存的规则组，不用再查。

**② 预过滤。** `DetectRunPrefilterPkt()`(`src/detect.c:602`)调用 `Prefilter()`(`src/detect-engine-prefilter.c:219`)，依次运行规则组里的预过滤引擎。载荷的 MPM 引擎在 `PrefilterPktPayload()`(`src/detect-engine-payload.c:116`)里，核心就一行：

```c
(void)mpm_table[mpm_ctx->mpm_type].Search(mpm_ctx,
        &det_ctx->mtc, &det_ctx->pmq, p->payload, p->payload_len);
```

在包载荷上扫一遍，所有命中的快速模式对应的规则编号，都被记进 `det_ctx->pmq`。

**③ 整理候选。** 同一条规则可能被几个引擎重复报告，所以先把编号排序(`QuickSortSigIntId()`，`src/detect-engine-prefilter.c:68`)，再去重，得到候选列表 `match_array`。因为编号就是第 1 节排出来的优先顺序，排序之后，候选的检查顺序也就是规则的优先顺序。

**④ 逐条细查。** `DetectRulePacketRules()`(`src/detect.c:731`)按顺序检查每条候选规则：先查规则头(协议、端口、地址、`flow` 方向等)，再把 `sm_arrays` 里的其余条件逐个交给对应关键字的 `Match()`(上一篇的结构在这里派上用场)。全部满足，就产生一条告警。

快速模式命中，只说明规则"有可能"命中。规则里的其他 `content`、偏移、深度、`pcre` 等条件，都要在这一步逐一确认。MPM 的作用，是大幅减少需要做这一步的规则，比如从组里的几千条压到几十条甚至更少(具体数量取决于规则集和流量)。

**⑤ 应用层事务。** 有应用层状态的流，还要用 `DetectRunTx()`(`src/detect.c:2266`)按事务再检查一遍。套路相同：在 `http_uri` 这类缓冲区上跑 MPM 得到候选，再逐条细查。不同的是事务有进度。上一篇说过，`http_uri` 的检查引擎注册时绑定了事务进度 `LINE`。`DetectRunTxInspectRule()`(`src/detect.c:1267`)检查一条规则时，如果事务的进度还没到检查引擎要求的阶段，就先停下，把检查到一半的状态存进事务的 `de_state`；等事务进度推进了，下一次再从那里接着查。这样，一条既检查请求、又检查响应的规则，可以跨好几个包、等事务慢慢推进，最后完整地判断出是否命中。

## 小结

- 规则先按动作、流变量依赖、优先级(数值越小越靠前)排序，再分配内部编号 `iid`；检测时候选按这个编号检查，所以规则的检查顺序就是优先顺序。
- 规则按"方向 × 协议 × 服务端端口"分组，端口为 `any` 的规则进每个组；组数有上限，默认发往服务器方向 40 组、发往客户端方向 20 组，相同的组会去重。
- 规则组(SGH)在运行时就是几组预过滤引擎。每条规则挑一个快速模式：显式指定的优先，否则在优先级最高的缓冲区里挑最长、最"强"的那个。
- MPM(默认有 Hyperscan 用 Hyperscan，否则 Aho-Corasick)一次扫描找出所有命中的快速模式，得到候选规则；规则组查到后缓存在 `Flow` 上。
- 候选规则排序去重后逐条细查；应用层事务同样先预过滤再细查，并受事务进度约束，检查到一半可以停下、等进度推进再继续。

规则命中之后，告警是怎么产生、又怎么一路变成 `eve.json` 里那一行 JSON 的？这是本系列最后一篇的内容。
