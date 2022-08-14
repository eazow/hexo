---
title: Introduction
tags: Kafka
categories: Kafka
date: 2020-02-01 15:01:20
---



#### What is event streaming?

Event streaming is the digital equivalent of the human body's central nervous system. It is the technological foundation for the 'always-on' world where businesses are increasingly software-defined and automated, and where the user of software is more software.

事件流是人体中枢神经系统的数字等效物。它是"永远在线"世界的技术基础，在这个世界中，企业越来越多地由软件定义和自动化，并且软件的用户更多地是软件。

Technically speaking, event streaming is the practice of capturing data in real-time from event sources like databases, sensors, mobile devices, cloud services, and software applications in the form of streams of events; storing these event streams durably for later retrieval; manipulating, processing, and reacting to the event streams in real-time as well as retrospectively; and routing the event streams to different destination technologies as needed. Event streaming thus ensures a continuous flow and interpretation of data so that the right information is at the right place, at the right time.

从技术上讲，事件流是从事件源（如数据库、传感器、移动设备、云服务和软件应用程序）以事件流的形式实时捕获数据的实践；持久存储这些事件流以供以后检索；实时和回顾性地操作、处理和响应事件流；并根据需要将事件流路由到不同的目标技术。因此，事件流确保了数据的连续流动和解释，以便正确的信息在正确的时间出现在正确的位置。



#### What can I use event streaming for?

Event streaming is applied to a wide variety of use cases across a plethora of industries and organizations. Its many examples include:

- To process payments and financial transactions in real-time, such as in stock exchanges, banks, and insurances.
- To track and monitor cars, trucks, fleets, and shipments in real-time, such as in logistics and the automotive industry.
- To continuously capture and analyze sensor data from IoT devices or other equipment, such as in factories and wind parks.
- To collect and immediately react to customer interactions and orders, such as in retail, the hotel and travel industry, and mobile applications.
- To monitor patients in hospital care and predict changes in condition to ensure timely treatment in emergencies.
- To connect, store, and make available data produced by different divisions of a company.
- To serve as the foundation for data platforms, event-driven architectures, and microservices.

事件流应用于众多行业和组织的各种用例。它的许多例子包括：

- 实时处理支付和金融交易，例如在证券交易所、银行和保险中。
- 实时跟踪和监控汽车、卡车、车队和货运，例如物流和汽车行业。
- 持续捕获和分析来自物联网设备或其他设备的传感器数据，例如工厂和风电场。
- 收集并立即响应客户互动和订单，例如零售、酒店和旅游行业以及移动应用程序。
- 监测住院病人，预测病情变化，确保在紧急情况下及时治疗。
- 连接、存储和提供公司不同部门产生的数据。
- 作为数据平台、事件驱动架构和微服务的基础。



#### Apache Kafka® is an event streaming platform. What does that mean?

Kafka combines three key capabilities so you can implement your use cases for event streaming end-to-end with a single battle-tested solution:

1. To **publish** (write) and **subscribe to** (read) streams of events, including continuous import/export of your data from other systems.
2. To **store** streams of events durably and reliably for as long as you want.
3. To **process** streams of events as they occur or retrospectively.

Kafka 结合了三个关键功能，因此您可以通过一个经过实战考验的解决方案实现端到端的事件流用例：

1. **发布**（写入）和**订阅**（读取）事件流，包括从其他系统持续导入/导出数据 。
2. 根据需要持久可靠地**存储事件流。**
3. 在事件发生时或回顾性地**处理事件流。**

And all this functionality is provided in a distributed, highly scalable, elastic, fault-tolerant, and secure manner. Kafka can be deployed on bare-metal hardware, virtual machines, and containers, and on-premises as well as in the cloud. You can choose between self-managing your Kafka environments and using fully managed services offered by a variety of vendors.

所有这些功能都以分布式、高度可扩展、弹性、容错和安全的方式提供。Kafka可以部署在裸机硬件、虚拟机和容器上，也可以部署在本地和云端。您可以在自行管理 Kafka 环境和使用各种供应商提供的完全托管服务之间进行选择。



#### How does Kafka work in a nutshell?

Kafka is a distributed system consisting of **servers** and **clients** that communicate via a high-performance [TCP network protocol](https://kafka.apache.org/protocol.html). It can be deployed on bare-metal hardware, virtual machines, and containers in on-premise as well as cloud environments.

Kafka 是一个分布式系统，由通过高性能[TCP 网络协议进行通信的](https://kafka.apache.org/protocol.html)**服务器**和**客户端**组成。它可以部署在本地和云环境中的裸机硬件、虚拟机和容器上。

**Servers**: Kafka is run as a cluster of one or more servers that can span multiple datacenters or cloud regions. Some of these servers form the storage layer, called the brokers. Other servers run [Kafka Connect](https://kafka.apache.org/documentation/#connect) to continuously import and export data as event streams to integrate Kafka with your existing systems such as relational databases as well as other Kafka clusters. To let you implement mission-critical use cases, a Kafka cluster is highly scalable and fault-tolerant: if any of its servers fails, the other servers will take over their work to ensure continuous operations without any data loss.

**服务器**：Kafka 作为一个或多个服务器的集群运行，可以跨越多个数据中心或云区域。其中一些服务器形成存储层，称为代理。其他服务器运行 [Kafka Connect](https://kafka.apache.org/documentation/#connect)以将数据作为事件流持续导入和导出，以将 Kafka 与您现有的系统（如关系数据库以及其他 Kafka 集群）集成。为了让您实现关键任务用例，Kafka 集群具有高度可扩展性和容错性：如果其中任何一个服务器出现故障，其他服务器将接管它们的工作，以确保持续运行而不会丢失任何数据。

**Clients**: They allow you to write distributed applications and microservices that read, write, and process streams of events in parallel, at scale, and in a fault-tolerant manner even in the case of network problems or machine failures. Kafka ships with some such clients included, which are augmented by [dozens of clients](https://cwiki.apache.org/confluence/display/KAFKA/Clients) provided by the Kafka community: clients are available for Java and Scala including the higher-level [Kafka Streams](https://kafka.apache.org/documentation/streams/) library, for Go, Python, C/C++, and many other programming languages as well as REST APIs.

**客户端**：它们允许您编写分布式应用程序和微服务，以并行、大规模和容错方式读取、写入和处理事件流，即使在网络问题或机器故障的情况下也是如此。Kafka 附带了一些这样的客户端，这些客户端由 Kafka 社区提供的[数十个客户端](https://cwiki.apache.org/confluence/display/KAFKA/Clients)增强：客户端可用于 Java 和 Scala，包括更高级别的[Kafka Streams](https://kafka.apache.org/documentation/streams/)库，用于 Go、Python、C/C++ 和许多其他编程语言以及 REST API。



#### Main Concepts and Terminology

An **event** records the fact that "something happened" in the world or in your business. It is also called record or message in the documentation. When you read or write data to Kafka, you do this in the form of events. Conceptually, an event has a key, value, timestamp, and optional metadata headers. Here's an example event:

- Event key: "Alice"
- Event value: "Made a payment of $200 to Bob"
- Event timestamp: "Jun. 25, 2020 at 2:06 p.m."

**事件**记录了世界或您的业务中“发生了某事” 的事实。在文档中也称为记录或消息。当您向 Kafka 读取或写入数据时，您以事件的形式执行此操作。从概念上讲，事件具有键、值、时间戳和可选的元数据标头。这是一个示例事件：

- 事件键：“爱丽丝”
- 事件价值：“向 Bob 支付了 200 美元”
- 事件时间戳：“2020 年 6 月 25 日下午 2:06”

**Producers** are those client applications that publish (write) events to Kafka, and **consumers** are those that subscribe to (read and process) these events. In Kafka, producers and consumers are fully decoupled and agnostic of each other, which is a key design element to achieve the high scalability that Kafka is known for. For example, producers never need to wait for consumers. Kafka provides various [guarantees](https://kafka.apache.org/documentation/#semantics) such as the ability to process events exactly-once.

**生产者**是那些向 Kafka 发布（写入）事件的客户端应用程序，而**消费者**是订阅（读取和处理）这些事件的那些客户端应用程序。在 Kafka 中，生产者和消费者完全解耦并且彼此不可知，这是实现 Kafka 众所周知的高可扩展性的关键设计元素。例如，生产者永远不需要等待消费者。Kafka 提供了各种[保证](https://kafka.apache.org/documentation/#semantics)，例如一次性处理事件的能力。

Events are organized and durably stored in **topics**. Very simplified, a topic is similar to a folder in a filesystem, and the events are the files in that folder. An example topic name could be "payments". Topics in Kafka are always multi-producer and multi-subscriber: a topic can have zero, one, or many producers that write events to it, as well as zero, one, or many consumers that subscribe to these events. Events in a topic can be read as often as needed—unlike traditional messaging systems, events are not deleted after consumption. Instead, you define for how long Kafka should retain your events through a per-topic configuration setting, after which old events will be discarded. Kafka's performance is effectively constant with respect to data size, so storing data for a long time is perfectly fine.

事件被组织并持久地存储在**主题**中。非常简化，主题类似于文件系统中的文件夹，事件是该文件夹中的文件。示例主题名称可以是“付款”。Kafka 中的主题始终是多生产者和多订阅者：一个主题可以有零个、一个或多个向其写入事件的生产者，以及零个、一个或多个订阅这些事件的消费者。主题中的事件可以根据需要随时读取 — 与传统的消息传递系统不同，事件在消费后不会被删除。相反，您可以通过每个主题的配置设置来定义 Kafka 应该将您的事件保留多长时间，之后旧事件将被丢弃。Kafka 的性能在数据大小方面实际上是恒定的，因此长时间存储数据是非常好的。

Topics are **partitioned**, meaning a topic is spread over a number of "buckets" located on different Kafka brokers. This distributed placement of your data is very important for scalability because it allows client applications to both read and write the data from/to many brokers at the same time. When a new event is published to a topic, it is actually appended to one of the topic's partitions. Events with the same event key (e.g., a customer or vehicle ID) are written to the same partition, and Kafka [guarantees](https://kafka.apache.org/documentation/#semantics) that any consumer of a given topic-partition will always read that partition's events in exactly the same order as they were written.

主题是**分区**的，这意味着一个主题分布在位于不同 Kafka 代理上的多个“桶”中。数据的这种分布式放置对于可伸缩性非常重要，因为它允许客户端应用程序同时从多个代理读取和写入数据。当一个新事件发布到一个主题时，它实际上是附加到主题的分区之一。具有相同事件键（例如，客户或车辆 ID）的事件被写入同一个分区，并且 Kafka[保证](https://kafka.apache.org/documentation/#semantics)给定主题分区的任何消费者将始终以与写入事件完全相同的顺序读取该分区的事件。

![img](https://kafka.apache.org/images/streams-and-tables-p1_p4.png)

*Figure: This example topic has four partitions P1–P4. Two different producer clients are publishing, independently from each other, new events to the topic by writing events over the network to the topic's partitions. Events with the same key (denoted by their color in the figure) are written to the same partition. Note that both producers can write to the same partition if appropriate.*

*图：此示例主题有四个分区 P1–P4。两个不同的生产者客户端通过网络将事件写入主题的分区，彼此独立地向主题发布新事件。具有相同键的事件（在图中由它们的颜色表示）被写入同一个分区。请注意，如果合适的话，两个生产者都可以写入同一个分区。*



To make your data fault-tolerant and highly-available, every topic can be **replicated**, even across geo-regions or datacenters, so that there are always multiple brokers that have a copy of the data just in case things go wrong, you want to do maintenance on the brokers, and so on. A common production setting is a replication factor of 3, i.e., there will always be three copies of your data. This replication is performed at the level of topic-partitions.

为了使您的数据具有容错性和高可用性，可以**复制**每个主题，甚至跨地理区域或数据中心，以便始终有多个代理拥有数据副本，以防万一出现问题，您想要对brokers进行维护，等等。一个常见的生产设置是复制因子为 3，即始终存在三个数据副本。此复制在主题分区级别执行。

