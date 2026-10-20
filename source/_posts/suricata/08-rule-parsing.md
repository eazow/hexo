---
title: "Suricata 源码阅读(八)：规则还没开始匹配——检测引擎如何把文本变成结构"
tags: Suricata
categories: Suricata
date: 2026-08-10
---

> 这是系列第 8 篇。前面几篇把一个包从网卡一路送到了应用层，HTTP 请求已经被解析成事务，URI、Host 这些字段都摆好了。接下来要轮到规则了。但在检查任何一个包之前，规则文件里那一行行文本，得先变成检测引擎能直接执行的结构。这一篇只看这一步：规则是怎么被读进来、拆开、存起来的。

先给答案，规则加载做了三件事：

1. **规则头填进 `Signature` 的字段。** 动作、协议、地址、端口、方向，每条规则对应一个 `Signature` 结构。
2. **每个选项交给对应关键字的 `Setup()`。** 检测引擎本身不认识 `content`、`flow`、`http.uri` 这些关键字，它只按名字去关键字表里查，找到对应的 `Setup()` 函数，让它自己解析参数、决定往哪里存。
3. **先用链表攒，再转成检测用的结构。** 解析时，条件先挂在一组临时链表上；所有规则读完后，再统一转成紧凑的数组和"检查引擎"，临时数据随即释放。

拿一条规则从头到尾走一遍：

```text
alert http any any -> any any (msg:"Example"; flow:established,to_server; http.uri; content:"/admin"; nocase; sid:1000001; rev:1;)
```

![一条规则从文本到结构](/images/suricata/suricata-rule-parse.svg)

<!-- more -->

## 1. 从规则文件到一条条规则

第 1 篇讲启动流程时提到，规则是在 `PostConfLoadedDetectSetup()` 里通过 `LoadSignatures()` 加载的。往下跟，调用链是这样的：

```text
SigLoadSignatures()           按配置里的 rule-files 逐个读规则文件
 └ DetectLoadSigFile()        读一个文件：逐行读，跳过注释和空行，拼接跨行的规则
    └ DetectEngineAppendSig() 处理一条规则
       └ SigInit()
          └ SigParse()        解析规则头和选项
```

`SigLoadSignatures()`(`src/detect-engine-loader.c:383`)从配置里取出 `rule-files` 列表，对每个文件调用 `DetectLoadSigFile()`(`src/detect-engine-loader.c:121`)。后者用 `fgets()` 一行一行读：以 `#` 开头的是注释，跳过；行尾是反斜杠的，和下一行拼起来，所以一条规则可以写成好几行。每读出一条完整的规则，就交给 `DetectEngineAppendSig()`(`src/detect-parse.c:3598`)。

默认情况下，解析出错的规则不会让 Suricata 启动失败，只是被跳过、在日志里报一个错误，启动日志最后会汇总有多少条规则加载成功、多少条失败。如果希望规则一出错就启动失败，可以打开配置项 `engine.init-failure-fatal`。

## 2. 规则头：填进 Signature

`SigParse()`(`src/detect-parse.c:1976`)分两步：先用 `SigParseBasics()`(`src/detect-parse.c:1853`)解析规则头，再在一个循环里逐个解析括号里的选项。

规则头 `alert http any any -> any any` 依次是：

- **动作** `alert`：记进 `s->action`。还可以是 `drop`、`pass`、`reject` 等。
- **协议** `http`：`SigParseProto()`(`src/detect-parse.c:1426`)先看它是不是 `tcp`、`udp` 这类传输层协议；不是的话，再当成应用层协议名去查。`http` 查到的是一个泛指 HTTP/1 和 HTTP/2 的协议值，记进 `s->alproto`，同时打上"这是一条应用层规则"的标志。
- **源地址、源端口、方向、目的地址、目的端口**：`any` 表示不限，也可以写 IP、网段、变量(`$HOME_NET`)、端口范围。

这些都存在 `Signature` 结构(`src/detect.h:678`)里，挑几个字段看：

```c
typedef struct Signature_ {
    uint32_t flags;
    enum SignatureType type;      /* 规则的类型，见第 5 节 */
    AppProto alproto;             /* 应用层协议 */
    ...
    uint8_t action;
    DetectProto proto;
    ...
    uint32_t id;                  /* sid */
    uint32_t gid;
    uint32_t rev;
    int prio;
    DetectPort *sp, *dp;          /* 源端口、目的端口 */
    ...
    DetectEngineAppInspectionEngine *app_inspect;   /* 检测用：应用层检查引擎 */
    DetectEnginePktInspectionEngine *pkt_inspect;   /* 检测用：包检查引擎 */
    ...
    SigMatchData *sm_arrays[DETECT_SM_LIST_MAX];   /* 检测用：几组条件数组 */
    ...
    char *msg;
    ...
    SignatureInitData *init_data; /* 解析阶段的临时数据，用完就释放 */
    struct Signature_ *next;
} Signature;
```

后半部分的 `app_inspect`、`pkt_inspect`、`sm_arrays` 是检测时用的，解析阶段还是空的；解析过程中的东西都放在 `init_data` 里。这两部分的关系，第 5 节再讲。

## 3. 选项：交给关键字自己解析

括号里的选项，由 `SigParseOptions()`(`src/detect-parse.c:905`)一个一个处理。它把 `content:"/admin"` 这样的选项拆成名字 `content` 和参数 `"/admin"`，然后：

```c
st = SigTableGet(optname);        /* 按名字查关键字表 */
if (st == NULL || st->Setup == NULL) {
    ...                           /* 不认识的关键字：这条规则解析失败 */
}
...
setup_ret = st->Setup(de_ctx, s, ptr);  /* 交给关键字自己的 Setup() */
```

**关键字表。** `sigmatch_table`(`src/detect-parse.c:79`)是一个全局数组，每个关键字占一项 `SigTableElmt`(`src/detect.h:1468`)：

```c
typedef struct SigTableElmt_ {
    int (*Match)(DetectEngineThreadCtx *, Packet *, const Signature *, const SigMatchCtx *);
    int (*AppLayerTxMatch)(DetectEngineThreadCtx *, Flow *, uint8_t flags, void *alstate,
            void *txv, const Signature *, const SigMatchCtx *);
    int (*FileMatch)(DetectEngineThreadCtx *, Flow *, uint8_t flags, File *,
            const Signature *, const SigMatchCtx *);
    void (*Transform)(DetectEngineThreadCtx *, InspectionBuffer *, void *context);
    ...
    int (*Setup)(DetectEngineCtx *, Signature *, const char *);   /* 解析规则时调用 */
    bool (*SupportsPrefilter)(const Signature *s);
    int (*SetupPrefilter)(DetectEngineCtx *de_ctx, struct SigGroupHead_ *sgh);
    void (*Free)(DetectEngineCtx *, void *);
    uint16_t flags;
    ...
    const char *name;
    const char *alias;
    const char *desc;
    const char *url;
} SigTableElmt;
```

`Setup` 在加载规则时用，`Match`、`AppLayerTxMatch`、`FileMatch` 在检测时用，分别针对包、事务和文件。又是第 2 篇 `TmModule`、第 7 篇 `AppLayerParserProtoCtx` 那个思路：一张函数指针表，检测引擎只管查表调用，每个关键字的具体逻辑由它自己实现。

这张表是第 1 篇讲的启动"备料"阶段，由 `SigTableSetup()`(`src/detect-engine-register.c:523`)逐个调用各关键字的注册函数填起来的。光是 C 代码里注册的关键字就有两百多个，Rust 那边还有一些。拿最简单的 `nocase` 看一个注册函数长什么样(`src/detect-nocase.c:39`)：

```c
void DetectNocaseRegister(void)
{
    sigmatch_table[DETECT_NOCASE].name = "nocase";
    sigmatch_table[DETECT_NOCASE].desc = "modify content match to be case insensitive";
    sigmatch_table[DETECT_NOCASE].url = "/rules/payload-keywords.html#nocase";
    sigmatch_table[DETECT_NOCASE].Setup = DetectNocaseSetup;
    sigmatch_table[DETECT_NOCASE].flags |= SIGMATCH_NOOPT;   /* 不带参数 */
}
```

**`SigMatch`：一个条件。** 大多数关键字的 `Setup()`，会把参数解析成一个结构，包进一个 `SigMatch`(`src/detect.h:360`)，挂到某条链表上：

```c
typedef struct SigMatch_ {
    uint16_t type;            /* 哪个关键字，sigmatch_table 的下标 */
    uint16_t idx;             /* 在这条规则里的位置 */
    SigMatchCtx *ctx;         /* 关键字自己解析出来的数据 */
    struct SigMatch_ *next;
    struct SigMatch_ *prev;
} SigMatch;
```

`ctx` 是关键字私有的：`content` 存要找的字节串和各种修饰(偏移、深度、是否区分大小写)，`flow` 存要求的方向和连接状态。检测引擎不关心里面是什么，到检测时原样交还给这个关键字的 `Match()`。

## 4. 往哪条链表上挂

一条规则的条件，在解析阶段挂在 `init_data` 里的两类链表上：

- **几条固定链表**(`smlists[]`，`src/detect.h:115`)，按用途分开：
  - `MATCH`：不看载荷内容的条件，比如 `flow`、`ttl`、`dsize`。
  - `PMATCH`：检查包载荷的条件，比如没有指定缓冲区的 `content`。
  - `POSTMATCH`：命中之后要执行的动作，比如 `flowbits:set`。
  - 另外还有标记(`TMATCH`)、抑制(`SUPPRESS`)、阈值(`THRESHOLD`)。
- **按缓冲区分开的链表**(`buffers[]`)：`http.uri`、`http.host`、`dns.query`……每用到一个缓冲区，就有一条自己的链表。

`init_data->list` 记着"当前正往哪条链表上挂"。拿开头那条规则来看：

- **`flow:established,to_server;`**：`flow` 的 `Setup()` 新建一个 `SigMatch`，固定挂到 `MATCH` 链表上(`src/detect-flow.c:437`)。
- **`http.uri;`**：它不产生 `SigMatch`，只做一件事：把"当前链表"切换成 `http_uri` 缓冲区(`src/detect-http-uri.c:202`)。这类关键字叫"粘性缓冲区"(sticky buffer)：一旦设定，后面的 `content` 都去查这个缓冲区，直到切换到别的缓冲区。
- **`content:"/admin";`**：`DetectContentSetup()`(`src/detect-content.c:330`)解析出要找的字节串，挂到"当前链表"上。当前链表此刻是 `http_uri`，所以它检查的是 URI。如果前面没有任何粘性缓冲区，就默认挂到 `PMATCH`，检查包的原始载荷。
- **`nocase;`**：它也不产生 `SigMatch`。`DetectNocaseSetup()`(`src/detect-nocase.c:57`)找到前面最近的那个 `content`，把它改成不区分大小写。所以 `nocase` 必须写在 `content` 后面，写在前面就会报"nocase needs preceding content option"。
- **`msg`、`sid`、`rev`**：只是填 `Signature` 的字段，不产生任何条件。

所以关键字大致有三种：产生条件的(`flow`、`content`)，切换缓冲区的(`http.uri`)，修饰前一个条件的(`nocase`、`depth`、`offset`)。规则里关键字的顺序很重要，原因就在这里。

## 5. 解析完：分类，再转成检测用的结构

**分类。** 每条规则解析完，`SignatureSetType()`(`src/detect-engine-build.c:1641`)根据它用到的条件给它定一个类型：只看 IP 地址的(`IPONLY`)、只看解码事件的(`DEONLY`)、检查单个包的(`PKT`)、检查 TCP 流数据的(`STREAM`)、检查应用层事务的(`APP_TX`)……开头那条规则用到了 `http.uri`，属于 `APP_TX`。不同类型的规则，检测时走不同的路径，比如 `IPONLY` 规则有专门的快速通道。这是下一篇的话题。

**转换。** 所有规则都读完后，`SigGroupBuild()`(`src/detect-engine-build.c:2191`，在 `src/detect-engine-loader.c:511` 被调用)开始建检测用的数据结构。它先做规则分组(下一篇)，最后调用 `SigMatchPrepare()`(`src/detect-engine-build.c:2115`)，对每条规则做三件事：

1. **挂检查引擎**：`DetectEngineAppInspectionEngine2Signature()`(`src/detect-engine.c:870`)看这条规则用到了哪些缓冲区，给每个缓冲区挂上注册好的检查引擎，存进 `s->app_inspect`。
2. **链表转数组**：几条固定链表用 `SigMatchList2DataArray()` 转成紧凑的数组，存进 `s->sm_arrays[]`。检测时按数组顺序遍历，比顺着链表一个个跳更快。
3. **释放临时数据**：解析阶段的链表、`init_data` 全部释放(`s->init_data = NULL`)。

**检查引擎。** 第 2 步挂上去的"检查引擎"，是各缓冲区在启动时注册的。`http.uri` 的注册是这样的(`src/detect-http-uri.c:108`)：

```c
DetectAppLayerInspectEngineRegister("http_uri", ALPROTO_HTTP1, SIG_FLAG_TOSERVER,
        HTP_REQUEST_PROGRESS_LINE, DetectEngineInspectBufferGeneric, GetData);
```

这一行把几件事绑在了一起：

- **缓冲区** `http_uri`，适用于 **HTTP/1**、**发往服务器方向**。
- **事务进度** `HTP_REQUEST_PROGRESS_LINE`：第 7 篇讲过，HTTP 事务有自己的进度。这里的意思是：事务进度至少到了 `LINE`(开始解析请求行)这一步，这个检查引擎才会运行。检查引擎和事务进度具体怎么配合，后面讲检测执行时再展开。
- **`GetData`**：从事务里取出 URI 的函数。

紧接着还有一行，给 HTTP/2 注册了同一个缓冲区。开头那条规则的协议写的是 `http`，是一个泛指 HTTP/1 和 HTTP/2 的协议值，挂引擎时两边都匹配得上，所以同一条规则对 HTTP/1 和 HTTP/2 都生效，规则作者不用关心底下是哪个版本。

到这里，开头那条规则变成了：`sm_arrays[MATCH]` 里有一个 `flow` 条件；`app_inspect` 里挂着两个 `http_uri` 检查引擎(HTTP/1 和 HTTP/2)，每个引擎下面是那个不区分大小写的 `content:"/admin"`。

## 小结

- 规则文件被逐行读入，每条规则经过 `DetectEngineAppendSig()` → `SigInit()` → `SigParse()` 解析；默认情况下，解析失败的规则只会被跳过。
- 规则头填进 `Signature` 的字段：动作、协议(包括应用层协议)、地址、端口、方向。
- 每个选项按名字查 `sigmatch_table`，交给对应关键字的 `Setup()`。关键字有三种：产生条件的、切换缓冲区的、修饰前一个条件的，所以顺序很重要。
- 解析阶段，条件以 `SigMatch` 的形式挂在 `init_data` 的链表上：几条固定链表，加上每个缓冲区一条。
- 所有规则读完后，`SigMatchPrepare()` 给规则挂上检查引擎、把链表转成数组，再释放临时数据。检查引擎把缓冲区、协议、方向和事务进度绑在一起。

规则变成了结构，可几万条规则不可能对每个包都挨个检查一遍。下一篇看 `SigGroupBuild()` 的前半部分：规则是怎么分组的，多模式匹配(MPM)又是怎么把要细查的规则压到少数几条的？
