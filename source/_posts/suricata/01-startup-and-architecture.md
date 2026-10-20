---
title: "Suricata 源码阅读(一)：启动一个 Suricata 进程，到底要经过多少步？"
tags: Suricata
categories: Suricata
date: 2026-06-22
---

> 这是系列第 1 篇。先不急着钻进协议解析器，也不急着看规则怎么匹配，而是跟着 Suricata 启动一遍：从命令行参数和配置文件出发，一路走到真正开始收包。后面每一篇，都会回到这张地图上的某个位置继续往下挖。

先给答案：从 `main()` 到第一个包被处理，Suricata 要走五个阶段。

1. **读懂命令**：解析命令行，确认这次以什么模式运行，读入 `suricata.yaml`。
2. **备料**：按配置把各个子系统初始化好——注册模块、加载规则、放弃多余的权限。
3. **搭产线**：按运行模式把处理模块串成流水线，创建工作线程和管理线程。
4. **放行**：等所有线程都准备好，统一发令开工。
5. **值守与收工**：主线程退到一边响应信号，收到停止信号后再把线程逐个关掉。

这五个阶段里藏着一条最值得抓住的线：前两个阶段只有主线程一个人在干活；第 3 阶段开始一个个新线程被创建出来，但都原地待命；直到第 4 阶段放行那一刻，进程才真正变成多线程并发运行。

入口在 `src/main.c:20`。`main()` 的主体就是十来个函数调用，正好能和这五个阶段对上(省略了错误检查和 Windows 相关代码)：

```c
int main(int argc, char **argv)
{
    /* 阶段 1：读懂命令 */
    SuricataPreInit(argv[0]);                  // 早期初始化，注册所有运行模式
    SCParseCommandLine(argc, argv);            // 解析命令行参数到 SCInstance
    SCFinalizeRunMode();                       // 校验运行模式
    SCStartInternalRunMode(argc, argv);        // --list-* 之类"跑完就退出"的模式
    SCLoadYamlConfig();                        // 加载 suricata.yaml
    SCEnableDefaultSignalHandlers();           // 标记：稍后安装默认信号处理函数

    /* 阶段 2 + 3：备料、搭产线，都在 SuricataInit() 里 */
    SuricataInit();

    /* 阶段 4：放行 */
    SuricataPostInit();                        // 等待所有线程 init 完成，再放行

    /* 阶段 5：值守与收工 */
    SuricataMainLoop();                        // 主线程的事件循环
    SuricataShutdown();
    GlobalsDestroy();
}
```

把这五个阶段画出来，就是下面这张图。后面每一节对应图里的一段，读的时候可以随时回来看看自己走到了哪里：

<img src="/images/suricata/suricata-startup-flow.svg" alt="main() 启动流程" width="560">

<!-- more -->

## 1. 读懂命令：这次要怎么跑

第一个阶段要回答的问题很朴素：用户这次想让 Suricata 干什么？

`SuricataPreInit()` 先做一些不依赖任何参数的准备：初始化 Rust 侧的运行环境、早期日志、信号屏蔽和配置树，还有一件后面会用到的事——`RunModeRegisterRunModes()` 把所有运行模式(af-packet、pcap、nfq……乘以 single/autofp/workers)登记到一张表里。这时候还没决定用哪一个，只是先把菜单印好。

接着 `SCParseCommandLine()` 把 argv 解析进一个全局的 `SCInstance suricata`(类型定义在 `src/suricata.h`，实例在 `src/suricata.c`)。命令行参数、运行模式、用户/组 ID 等等，统统塞进这一个结构体——可以把它想成挂在车间墙上的一块总仪表盘，谁想知道"现在该怎么跑"，看这块牌子就行。运行模式也是在这里定下来的：比如 `-r` 读 pcap 文件，`--af-packet` 从网卡抓包。这是典型的"C 语言用全局单例代替面向对象里的 this"写法，以后在代码里看到 `suricata.xxx`，把它当成"整个进程当前的配置快照"来读就对了。

剩下几步都很短：

- `SCFinalizeRunMode()` 只做校验：没指定运行模式就打印用法退出，再检查守护进程模式和运行模式是否兼容。
- `SCStartInternalRunMode()` 处理那些"跑完就退出"的模式：`--list-keywords`、`--list-runmodes`、`--build-info`、单元测试等。`suricata --list-runmodes` 能秒回，就是因为它在这里提前下车了，根本走不到后面。
- `SCLoadYamlConfig()` 把 `suricata.yaml` 读成一棵配置树。从这之后，任何模块都可以用 `SCConfGet*()` 系列函数查配置。
- `SCEnableDefaultSignalHandlers()` 只是打个标记，表示要用默认的信号处理函数；真正安装是在第 2 阶段的 `PostConfLoadedSetup()` 里。

## 2. 备料：把各个子系统初始化好

配置读进来之后，`SuricataInit()`(`src/suricata.c:3046`)登场。它是整个启动过程的重头戏，第 2、3 两个阶段都在它里面。前半段是备料，内部顺序大致是：

1. `GlobalsInitPreConfig()` —— 不依赖配置文件的全局初始化(时间子系统、阈值配置、协议名表等)。
2. 读取一批 yaml 配置项(vlan/livedev tracking 开关等)，配置日志系统 `SCLogLoadConfig`。
3. `RunModeInitializeThreadSettings()` —— 确定每个 runmode 用几个线程、CPU 亲和性怎么设。
4. `ParseInterfacesList()` —— 解析要监听的网卡/pcap 列表。
5. `PostConfLoadedSetup()` —— 把各个子系统初始化起来。
6. `SCDropMainThreadCaps()` —— 权限收敛，drop 掉不需要的 capabilities/root 权限。
7. `PostConfLoadedDetectSetup()` —— 创建检测引擎上下文，加载规则。

这七步里细节多且杂，不用一次记住，但有三处值得标出来，因为后面几篇会从这里接着讲：

- **注册所有 TmModule**：第 5 步里的 `RegisterAllModules()`(`src/suricata.c:2902`)把 `ReceiveAFP`、`DecodeAFP`、`FlowWorker` 这些处理模块一个个填进全局的模块表。下一阶段搭产线时，就是按名字从这张表里取模块。TmModule 是什么，第 2 篇细讲。
- **加载规则**：第 7 步里的 `LoadSignatures()`(`src/suricata.c:2683`)把规则文件读进来，编译成检测引擎能用的结构。规则从文本变成结构的过程，是第 8 篇的主题。
- **降权**：第 6 步尽早放弃不必要的特权。它不是一刀切地全部放弃，而是按运行模式只留下抓包必需的能力：比如 af-packet/pcap 模式保留 `CAP_NET_RAW`、`CAP_NET_ADMIN` 等，nfq 模式保留 `CAP_NET_ADMIN`；如果配置了运行用户，还会切换到那个用户。这是网络安全软件的常规操作。

顺便一提，这里能看出一个贯穿全码库的惯例：**Suricata 大量使用"名字即文档"的函数命名**。`XxxPreConfig`/`PostConfLoadedXxx`/`ThreadInit`/`ThreadDeinit` 这类命名一以贯之，读源码时基本可以靠名字做时间线定位，不用每个都跳进去看实现。

## 3. 搭产线：RunModeDispatch()

备料完成后，`SuricataInit()` 的最后一步是调用 `RunModeDispatch()`(`src/runmodes.c:409`)，进入第 3 阶段。

先补两个概念。Suricata 把包的处理拆成一道道工位，每道工位是一个 **TmModule**(定义在 `src/tm-modules.h:47`)，本质是一组函数指针(`ThreadInit`/`Func`/`ThreadDeinit`/`PktAcqLoop` 等)，规定了这道工位怎么上岗、怎么干活、怎么下岗。而 **RunMode** 决定这些工位怎么排布、分给几个工人(线程)：可以让一个工人从头干到尾(workers 模式)，也可以拆成两组工人接力、中间用队列交接(autofp 模式)。

`RunModeDispatch()` 做的事情，简化后是这样：

```c
RunMode *mode = RunModeGetCustomMode(runmode, custom_mode);
...
mode->RunModeFunc();          // 组装流水线，创建工作线程
...
TmValidateQueueState();       // 校验模块间队列都至少有一个读者一个写者
FlowManagerThreadSpawn();     // 再拉起几个"管理类"线程
FlowRecyclerThreadSpawn();
StatsSpawnThreads();
LogFlushThreads();
TmThreadsSealThreads();       // 封口:之后不再允许创建新线程
```

`RunModeGetCustomMode()` 从第 1 阶段登记的那张运行模式表里，挑出这次要用的一项。它的 `RunModeFunc` 是一个函数指针，指向类似 `RunModeIdsAFPAutoFp()`(`src/runmode-af-packet.c:795`)这样的函数。这个函数内部再调用 `RunModeSetLiveCaptureAutoFp()` / `RunModeSetLiveCaptureWorkers()` 这类公共辅助函数，用 `TmModuleGetByName()` 从第 2 阶段注册好的模块表里按名字取出 `"ReceiveAFP"`、`"DecodeAFP"`、`"FlowWorker"`、`"RespondReject"`，按 workers/autofp 的拓扑接成一条真正的产线，再把工人(线程)派上去。流跟踪、TCP 重组、应用层解析、检测和输出，全都装在 `FlowWorker` 这一个模块里。

有一个细节决定了下一阶段为什么存在：线程在创建时就被打上了 `THV_PAUSE` 标志(`src/tm-threads.c:954`)。所以 `TmThreadSpawn()` 把线程拉起来之后，每个线程只做完自己的初始化，就原地待命，并不会马上开始收包。

这条流水线具体怎么焊、工位之间传递包用的队列(`Tmq`)怎么工作，留到第 2 篇拆开细看；`ReceiveAFP` 这类抓包模块怎么把包交给引擎，是第 3 篇的内容。

## 4. 放行：SuricataPostInit()

`RunModeDispatch()` 返回后，`SuricataInit()` 也就结束了。这时车间里已经站满了工人，但谁都还没动手。

`SuricataPostInit()`(`src/suricata.c:3145`)负责发令：

1. `TmThreadWaitOnThreadInit()` —— 挨个检查每个线程，等它们都把 `THV_INIT_DONE` 标志位设好，也就是都初始化完了。任何一个线程初始化失败，整个进程直接退出。
2. `TmThreadContinueThreads()`(`src/tm-threads.c:1986`)—— 遍历所有线程，清掉 `THV_PAUSE`，统一放行。
3. `TmThreadWaitOnThreadRunning()` —— 再确认所有线程都真正跑起来了。

放行这一刻，就是进程从单线程变成多线程的分界线。把这一刻的并发关系画成时序图会更直观：

<img src="/images/suricata/suricata-startup-sequence.svg" alt="启动过程中：谁在什么时候被谁拉起来" width="720">

先等齐、再统一放行，一个直观的好处是：工位之间是连着的，所有线程同时开工，就不会出现收包线程已经在往队列里塞包、后面的处理线程还没准备好的情况。

## 5. 值守与收工：主循环

流水线一开工，主线程反而成了最闲的那个人——包的处理全交给车间里的专职工人，自己退到门口，只做一件事：盯着外面有没有动静。`SuricataMainLoop()`(`src/suricata.c:2956`)就是这样一个很轻的轮询循环：

```c
while (1) {
    if (sigterm_count || sigint_count) suricata_ctl_flags |= SURICATA_STOP;
    if (suricata_ctl_flags & SURICATA_STOP) break;      // 收到停止信号就退出循环

    TmThreadCheckThreadState();                          // 检查各线程是否还活着

    if (sighup_count > 0) OutputNotifyFileRotation();    // SIGHUP: 日志轮转
    if (sigusr2_count > 0) DetectEngineReload(suri);      // SIGUSR2: 热加载规则
    ...
    usleep(10 * 1000);                                   // 每 10 毫秒看一次
}
```

信号处理函数本身几乎什么都不做，只是改一下 `sigterm_count`、`sighup_count` 这类标志，真正的响应都在这里做。信号处理函数里能安全调用的函数非常有限，把重活挪到主循环里，就不用担心这些限制。

跳出循环后，`SuricataShutdown()` 通过 `TmThreadKillThreads()` 给各个线程打上 `THV_KILL` 标志，等它们各自退出；最后 `GlobalsDestroy()` 收拾全局资源，进程结束。

## 小结

回到开头的问题：启动一个 Suricata 进程，要经过五个阶段。每个阶段都给后面的文章留了线头：

| 阶段 | 关键函数 | 后面在哪展开 |
|---|---|---|
| 1. 读懂命令 | `SCParseCommandLine()`、`SCLoadYamlConfig()` | — |
| 2. 备料 | `RegisterAllModules()`、`LoadSignatures()` | 第 2 篇(TmModule)、第 8 篇(规则加载) |
| 3. 搭产线 | `RunModeDispatch()` → `RunModeFunc()` | 第 2 篇(线程模型)、第 3 篇(抓包模块) |
| 4. 放行 | `SuricataPostInit()` → `TmThreadContinueThreads()` | 第 2 篇 |
| 5. 值守与收工 | `SuricataMainLoop()` | — |

下一篇从最关键、也最容易让人困惑的地方开始：`TmModule` 和 `RunMode` 到底怎样把一组函数变成一条正在工作的流水线？`ThreadVars`、`TmSlot` 和模块间的队列(`Tmq`)，会把这个问题继续往下展开。

## 附录：`src/` 目录速查

Suricata 的仓库看起来吓人，但和"引擎本体"直接相关的顶层目录其实只有这几个：

- `src/` —— C 语言写的核心引擎，本系列关注的主体。
- `rust/` —— 部分应用层协议解析器(如 DNS、NFS、SMB 等)用 Rust 实现，通过 FFI 和 `src/` 里的 C 代码互调。
- `rules/`、`etc/`、`suricata.yaml.in` —— 默认规则和配置模板，不是本系列重点。
- `doc/` —— 官方用户文档(用法向)，和本系列(源码阅读向)是两回事。

`src/` 下有上千个文件，好在基本都按前缀归类，摸清楚这些前缀，就相当于拿到了车间地图的图例：

| 前缀/文件 | 内容 |
|---|---|
| `suricata.c`, `main.c` | 程序入口与生命周期管理 |
| `tm-threads*.c`, `tm-modules.c`, `tm-queues.c` | 线程模型：TmModule、线程创建、模块间队列 |
| `runmode*.c` | 各种运行模式(af-packet/pcap/nfq/workers/autofp…)的流水线组装 |
| `source-*.c` | 各类抓包后端(`source-af-packet.c`、`source-pcap.c`、`source-nfq.c`…) |
| `decode*.c` | 各层协议的解码(以太网、IP、TCP、UDP、ICMP…) |
| `flow*.c` | Flow(流)引擎：哈希表、超时、状态管理 |
| `stream-tcp*.c` | TCP 重组与状态机 |
| `app-layer*.c` | 应用层协议解析框架及各协议解析器(HTTP、TLS、SMTP…) |
| `detect*.c` | 检测引擎：规则解析、匹配、签名分组 |
| `output*.c`, `log-*.c`, `alert-*.c`, `output-json*.c`(EVE) | 日志/告警输出 |
| `util-*.c` | 通用工具(哈希表、内存池、原子操作、字符串处理…) |
