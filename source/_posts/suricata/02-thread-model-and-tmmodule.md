---
title: "Suricata 源码阅读(二)：一条流水线是怎么跑起来的——线程模型与 TmModule"
tags: Suricata
categories: Suricata
date: 2026-06-29
---

> 这是系列第 2 篇。上一篇跟着 `main()` 走完了启动的五个阶段：`RunModeDispatch()` 把线程一个个创建出来，`SuricataPostInit()` 等它们就位后统一放行。但线程里面具体装了什么、放行之后怎么干活，上一篇没有展开。这一篇就拆开一个线程看：`TmModule` 怎么变成线程里真正在跑的代码？一个包在同一个线程里怎么连续闯过好几道工位？single、autofp、workers 这三种排班方式，差别到底落在哪一行代码上？

先看全貌。下面这张图把本篇要讲的东西都画在了一起，读完再回来看会更清楚：

![线程模型：TmModule 怎么变成一条正在跑的流水线](/images/suricata/suricata-thread-model.svg)

<!-- more -->

## 1. 三个角色：说明书、上岗单、档案卡

要把一组函数变成一条会跑的流水线，Suricata 用了三个结构体。

**`TmModule`：岗位说明书。** 定义在 `src/tm-modules.h:47`，挑关键字段看：

```c
typedef struct TmModule_ {
    const char *name;
    TmEcode (*ThreadInit)(ThreadVars *, const void *, void **);
    TmEcode (*Func)(ThreadVars *, Packet *, void *);
    TmEcode (*PktAcqLoop)(ThreadVars *, void *, void *);
    TmEcode (*Management)(ThreadVars *, void *);
    TmEcode (*ThreadDeinit)(ThreadVars *, void *);
    ...
} TmModule;
```

`ThreadInit`/`ThreadDeinit` 负责上岗和下岗，中间三个函数指针是三种不同的干活方式，一个模块通常只实现其中一种：

- **`Func`：来一个包处理一个包。** 包递过来才干活，干完就把控制权交回去。`DecodeAFP`、`FlowWorker`、`RespondReject` 都是这一类。(`RespondReject` 平时什么都不做，只有包命中了动作为 `reject` 的规则时，才会发出 TCP RST 或 ICMP 不可达，主动掐断连接。)
- **`PktAcqLoop`：自己去抓包。** 只有站在流水线最前端的工位才用，比如 `ReceiveAFP`。它本身就是一个不停抓包的循环，不等别人递包，而是主动去网卡或 pcap 文件里"生产"包。
- **`Management`：不碰包的后台活。** `FlowManager`、`FlowRecycler` 这类管理线程用的就是它。

所有模块在启动时由 `RegisterAllModules()` 注册进一个全局数组 `tmm_modules[TMM_SIZE]`，每个模块全局只有一份。

**`TmSlot`：上岗单。** 定义在 `src/tm-threads.h:53`。同一份说明书可以发给好几个工人，比如 8 个 worker 线程都要干 `FlowWorker` 这道工位。`TmSlot` 就是发给某一个工人的那一份：它记下这道工位的函数指针，还带着这个工人自己的运行数据(`slot_data`，由 `ThreadInit` 初始化)。多个 `TmSlot` 用 `slot_next` 串成链表。

**`ThreadVars`：工人档案卡。** 定义在 `src/threadvars.h:59`，一个线程一份，是 `pthread_create()` 真正传进去的那个参数。上面记着线程名字、CPU 亲和性、运行标志位，还有三样决定这个线程怎么干活的东西：

- `tm_slots`：这个工人身上串着的那条上岗单链表。
- `tm_func`：线程的主函数，也就是"驱动方式"。
- `tmqh_in` / `tmqh_out`：从哪里取包、处理完把包交到哪里。

一句话理清三者的关系：**TmModule 是岗位说明书，TmSlot 是发到某个工人手上的上岗单，ThreadVars 是工人档案卡，一个工人身上可以串一串上岗单**。

## 2. 组装：把上岗单串到工人身上

把说明书发给工人、再串成一条线，靠的是 `TmSlotSetFuncAppend()`(`src/tm-threads.c:658`)：

```c
void TmSlotSetFuncAppend(ThreadVars *tv, TmModule *tm, const void *data)
{
    TmSlot *slot = SCCalloc(1, sizeof(TmSlot));
    ...
    slot->SlotThreadInit = tm->ThreadInit;
    slot->slot_initdata = data;
    if (tm->Func) {
        slot->SlotFunc = tm->Func;
    } else if (tm->PktAcqLoop) {
        slot->PktAcqLoop = tm->PktAcqLoop;
    } else if (tm->Management) {
        slot->Management = tm->Management;
    }
    ...
    if (tv->tm_slots == NULL) {
        tv->tm_slots = slot;
    } else {
        // 找到链表末尾，把新 slot 接上去
        ...
        b->slot_next = slot;
    }
}
```

每调用一次，就新建一个 `TmSlot`，把 `TmModule` 里的函数指针抄过来，挂到这个 `ThreadVars` 的 `tm_slots` 链表尾部。谁调用它、调用几次、传哪些模块，就决定了这个线程身上串了哪几道工位、按什么顺序串。

## 3. 一个线程的一生

工位串好了，线程还要有人驱动。一个处理包的线程，是由 `TmThreadCreatePacketHandler()`(`src/tm-threads.c:1062`)创建的，它的参数值得细看：

```c
ThreadVars *TmThreadCreatePacketHandler(const char *name,
        const char *inq_name, const char *inqh_name,    // 从哪条队列取包，用什么方式取
        const char *outq_name, const char *outqh_name,  // 包交到哪条队列，用什么方式交
        const char *slots);                             // 驱动方式
```

后面会看到，**三种排班方式的差别，几乎全部体现在线程名之后的这五个字符串参数上**。

最后一个参数 `slots` 决定线程的主函数。`TmThreadSetSlots()`(`src/tm-threads.c:612`)按名字挑选：

| `slots` | 线程主函数 `tm_func` | 用在哪 |
|---|---|---|
| `"pktacqloop"` | `TmThreadsSlotPktAcqLoop()` | 链头是抓包模块的线程 |
| `"varslot"` | `TmThreadsSlotVar()` | 从队列里取包的线程 |
| `"management"` | `TmThreadsManagement()` | 管理线程 |

`TmThreadSpawn()`(`src/tm-threads.c:1718`)最终调用 `pthread_create(&tv->t, &attr, tv->tm_func, (void *)tv)`(第 1739 行)，线程就从 `tm_func` 开始跑。处理包的两种主函数(`pktacqloop` 和 `varslot`)，一上来做的事都差不多：

1. 挨个调用链上每个 `TmSlot` 的 `SlotThreadInit`，初始化各工位的线程私有数据。
2. 打上 `THV_INIT_DONE` 标志，告诉主线程"我准备好了"。
3. 调用 `TmThreadsWaitForUnpause()` 原地等待，直到主线程清掉 `THV_PAUSE`。这就是上一篇"放行"阶段在线程这一侧的样子。
4. 进入主循环，开始干活。

## 4. 一个包怎么连续闯过好几道工位

两种处理包的主函数，主循环不一样，但最后会汇到同一个函数里。先看整条调用栈：

![一个包在线程里的调用栈](/images/suricata/suricata-callstack.svg)

**`"pktacqloop"`：线程自己去抓包。** `TmThreadsSlotPktAcqLoop()`(`src/tm-threads.c:310`)的主循环很简单，就是调用链头那个 `TmSlot` 的 `PktAcqLoop`，比如 `ReceiveAFPLoop()`。抓包循环在自己手里，所以抓包模块会把"链上剩下的部分"记下来：`ReceiveAFPLoop()` 一开头就保存了 `ptv->slot = s->slot_next`(`src/source-af-packet.c:1313`)。每抓到一个包，就调用 `TmThreadsSlotProcessPkt()`(`src/tm-threads.h:195`)把包交给后面的工位：

```c
static inline TmEcode TmThreadsSlotProcessPkt(ThreadVars *tv, TmSlot *s, Packet *p)
{
    ...
    TmEcode r = TmThreadsSlotVarRun(tv, p, s);   // 依次走完剩下的工位
    ...
    tv->tmqh_out(tv, p);                          // 处理完，把包交出去
    ...
}
```

**`"varslot"`：线程从队列里取包。** `TmThreadsSlotVar()`(`src/tm-threads.c:410`)的主循环是：`tv->tmqh_in(tv)` 从输入队列取一个包，调用 `TmThreadsSlotVarRun()` 走完整条链，再 `tv->tmqh_out(tv, p)` 交出去。

两条路最后都汇到 `TmThreadsSlotVarRun()`(`src/tm-threads.c:133`)：

```c
TmEcode TmThreadsSlotVarRun(ThreadVars *tv, Packet *p, TmSlot *slot)
{
    for (TmSlot *s = slot; s != NULL; s = s->slot_next) {
        TmEcode r = s->SlotFunc(tv, p, SC_ATOMIC_GET(s->slot_data));
        if (unlikely(r == TM_ECODE_FAILED)) {
            ...
            return TM_ECODE_FAILED;
        }
        ...
    }
    return TM_ECODE_OK;
}
```

就是一个 `for` 循环，顺着 `slot_next` 挨个调用 `SlotFunc`。没有排队，也没有线程切换：同一个包，在同一个线程的调用栈上，被一条函数链依次处理完。(省略的部分里还有一个细节：解码时如果拆出了隧道里的内层包，会在这里把它们也送进后面的工位。这是第 4 篇的话题。)

至于包"交出去"交到了哪里，取决于 `tmqh_out`，也就是创建线程时指定的队列处理器(`Tmqh`，定义见 `src/tm-queuehandlers.h:36`)：

- `"packetpool"`：包处理完了，还回它所属的包池，等着下次复用。workers 里包始终在同一个线程，还回的就是本线程的包池，不用加锁；autofp 里包是抓包线程分配的，处理线程用完后会把它还给抓包线程的包池。
- `"flow"`：按流的哈希值挑一条队列，把包塞进去，交给另一个线程接着处理。

## 5. 三种排班方式，差别在哪一行

有了上面这些，三种排班方式就可以直接对着 `TmThreadCreatePacketHandler()` 的参数看了。代码都在 `src/util-runmodes.c`。

**workers。** `RunModeSetLiveCaptureWorkersForDevice()`(`util-runmodes.c:245`)按配置的线程数循环，每一轮创建一个线程：

```c
ThreadVars *tv = TmThreadCreatePacketHandler(tname,
        "packetpool", "packetpool",
        "packetpool", "packetpool",
        "pktacqloop");
```

然后连续调用四次 `TmSlotSetFuncAppend()`，串上 `ReceiveAFP → DecodeAFP → FlowWorker → RespondReject`。输入输出都是 `"packetpool"`，也就是说根本没有队列：包从抓进来到处理完，全程待在同一个线程里，处理完直接还回包池。

**autofp。** `RunModeSetLiveCaptureAutoFp()`(`util-runmodes.c:85`)创建两组线程：

| | 抓包线程 | 处理线程 |
|---|---|---|
| 输入 | `"packetpool"` | 自己那条 `"pickupN"` 队列，处理器 `"flow"` |
| 输出 | 所有 `"pickup1,pickup2,..."` 队列，处理器 `"flow"` | `"packetpool"` |
| 驱动方式 | `"pktacqloop"` | `"varslot"` |
| 工位 | `ReceiveAFP → DecodeAFP` | `FlowWorker → RespondReject` |

抓包线程只做抓包和解码，然后按流把包分发到各条 `pickup` 队列；处理线程各守一条队列，取到包再做流跟踪、重组、检测和输出。处理线程的数量由 `TmThreadsGetWorkerThreadMax()` 决定，线程组名是 `"Detect"`。两组线程之间靠队列传包，队列就像连接两组工人的传送带。

**single。** 翻开 `RunModeSetLiveCaptureSingle()`(`util-runmodes.c:359`)会发现，它调用的还是 `RunModeSetLiveCaptureWorkersForDevice()`，只是最后一个参数 `single_mode` 传了 1：线程数被钉死成 1，并且配了多个网卡就直接报错退出。**single 不是第三种拓扑，它就是只有一个工人、一个入口的 workers。**

所以回到开头的问题：三种排班方式的差别，落在 `TmThreadCreatePacketHandler()` 的那几个队列参数、驱动方式参数，以及每个线程串了哪几个 `TmSlot` 上。

## 6. autofp 的传送带凭什么不把同一条流拆乱

两组线程之间用队列传包没错，但如果随便分发，同一条 TCP 流的包散落到不同的处理线程里，`Flow`、`Stream` 这些依赖连续状态的模块就全乱了。

解决办法藏在抓包线程的输出处理器 `"flow"` 里。默认的分发函数是 `TmqhOutputFlowHash()`(`src/tmqh-flow.c:220`)：

```c
void TmqhOutputFlowHash(ThreadVars *tv, Packet *p)
{
    uint32_t qid;
    TmqhFlowCtx *ctx = (TmqhFlowCtx *)tv->outctx;

    if (p->flags & PKT_WANTS_FLOW) {
        uint32_t hash = p->flow_hash;
        qid = hash % ctx->size;
    } else {
        qid = ctx->last++;             // 没有流信息的包，轮流分发
        if (ctx->last == ctx->size)
            ctx->last = 0;
    }

    PacketQueue *q = ctx->queues[qid].q;
    SCMutexLock(&q->mutex_q);
    PacketEnqueue(q, p);
    SCCondSignal(&q->cond_q);          // 唤醒等在这条队列上的处理线程
    SCMutexUnlock(&q->mutex_q);
}
```

核心就一句：用 `p->flow_hash` 对队列数取模，决定进哪条 `pickup` 队列。`flow_hash` 是解码时由 `FlowSetupPacket()` 按五元组算好的，同一条流的哈希值不会变，所以它的所有包永远落进同一条队列，也就永远由同一个处理线程处理。`Flow`、`Stream` 这些跨包的状态，就不会被两个线程同时读写。

分发策略可以通过配置项 `autofp-scheduler` 换成 `ippair`(按 IP 对)或 `ftp-hash`，不配置时默认就是上面这个 `hash`。

顺便也能看出 workers 为什么通常更快：autofp 的每个包都要经过一次加锁入队、一次唤醒、一次出队，而 workers 里这些开销都不存在。

## 小结

把这一篇的内容压成几句话：

- `TmModule` 是全局唯一的岗位说明书，有 `Func`、`PktAcqLoop`、`Management` 三种干活方式。
- `TmSlotSetFuncAppend()` 把模块抄成 `TmSlot`，串到 `ThreadVars` 身上，一个线程就有了自己的工位链。
- 线程的驱动方式(`pktacqloop` 或 `varslot`)决定包从哪来；`TmThreadsSlotVarRun()` 的一个 `for` 循环让包依次走完工位链；`tmqh_out` 决定包处理完去哪。
- workers、autofp、single 的差别，就是这几样东西的不同组合；autofp 靠按流哈希分发，保证同一条流始终落在同一个线程上。

下一篇往前挪一站，看流水线上的第一道工位：包是怎么从网卡或 pcap 文件里被抓出来的，`AF_PACKET`、`PCAP`、`NFQ` 抓到的原始字节，又是怎么变成 Suricata 内部那个远比想象中复杂的 `Packet` 结构体的。
