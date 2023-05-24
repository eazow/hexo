---
title: tcpdump使用
date: 2020-05-12 11:50:20
tags: Linux
categories: Linux
---

### 简介

tcpdump是一个命令行数据包分析、抓取工具

可以使用 -D 标志来列出可用于捕获的接口
```
$ tcpdump -D
 
1.virbr0
2.docker0
3.vethdb0f731
4.nflog (Linux netfilter log (NFLOG) interface)
5.nfqueue (Linux netfilter queue (NFQUEUE) interface)
6.usbmon1 (USB bus number 1)
7.enp2s0
8.usbmon2 (USB bus number 2)
9.enp3s0
```


可以使用 -i 标志指定要捕获的接口，指定 any 作为接口将从所有活动接口捕获
```
$ tcpdump -i any
$ tcpdump -i eth1
```


可以使用 -v 标志来调整tcpdump输出中的详细程度
```
$ tcpdump -i any -v (Verbose output)
$ tcpdump -i any -vv (Even more verbose output)
$ tcpdump -i any -vvv (The most verbose output)
```



### 协议过滤器

可以根据协议过滤捕获流量。例如，侦听所有TCP连接

```
$ tcpdump tcp
```



### 端口过滤器

如果只对特定端口的流量感兴趣，则可以使用端口过滤器来确定分析

```
tcpdump port 80
```

将端口80作为其源端口或目标端口的流量，则可以使用
```
$ tcpdump src port 80
$ tcpdump dest port 80
```



### 主机过滤器

如果只对特定主机的流量感兴趣，则可以使用主机过滤器。主机过滤器还可以与源或目的过滤器组合。
```
$ tcpdump host 1.2.3.4
$ tcpdump src host 1.2.3.4
$ tcpdump dst host 1.2.3.4
```



### 组合滤波器

可以在tcpdump中组合多个过滤器

```
$ tcpdump "src port 80" and "dst host 1.2.3.4"
$ tcpdump "src port 80" or "src port 443"
```
保存输出
可以使用 -w 将捕获的数据包保存到文件中
```
$ tcpdump tcp -w FILE_PATH
```
如果需要既保存又打印，可以将 --print 与 -w 结合使用
```
$ tcpdump tcp -w FILE_PATH --print
```



### 扩展

更多内容可参考tcpdump手册

https://www.tcpdump.org/manpages/tcpdump.1.html
