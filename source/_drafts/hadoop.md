---
title: hadoop
tags:
---



### 1. 环境

#### 1.1 服务器

| IP           | CPU  | 内存 | 磁盘 | hostname        |
| ------------ | ---- | ---- | ---- | --------------- |
| 10.xxx.37.32 | 32核 | 128G | 1T   | VM-37-32-centos |
| 10.xxx.37.49 | 32核 | 128G | 1T   | VM-37-49-centos |
| 10.xxx.37.24 | 32核 | 128G | 1T   | VM-37-24-centos |
| 10.xxx.37.48 | 32核 | 128G | 1T   | VM-37-48-centos |
| 10.xxx.37.46 | 32核 | 128G | 1T   | VM-37-46-centos |



#### 1.2 免密登录

##### 1.2.1 生成公钥

在每个节点上生成公钥

```
$ ssh-keygen -t rsa
```

##### 1.2.2 创建别名

修改每个节点的`~/.bashrc`

```
alias ssh32="ssh 10.xxx.37.32"
alias ssh49="ssh 10.xxx.37.49"
alias ssh24="ssh 10.xxx.37.24"
alias ssh48="ssh 10.xxx.37.48"
alias ssh46="ssh 10.xxx.37.46"
```

##### 1.2.3 加入公钥

修改每个节点的~/.ssh/authorized_keys，加入所有节点的公钥

配置好后各节点均可免密登录



#### 1.3 配置主机名

修改每个节点的`/etc/hosts`

```
10.xxx.37.32    VM-37-32-centos 
10.xxx.37.49    VM-37-49-centos 
10.xxx.37.24    VM-37-24-centos 
10.xxx.37.48    VM-37-48-centos 
10.xxx.37.46    VM-37-46-centos
```



#### 1.4 安装包准备

放在`/app/pkgs`目录

| 包名                                            | md5                              |
| ----------------------------------------------- | -------------------------------- |
| apache-hive-3.1.2-bin.tar.gz                    | 84a722c0f4c82d8c62914b321ea17661 |
| clickhouse-client-20.8.3.18-2.noarch.rpm        | 61e196e638a38a79715f0911356af935 |
| clickhouse-common-static-20.8.3.18-2.x86_64.rpm | 2e13f09752477e7b05895377e787c5c3 |
| clickhouse-server-20.8.3.18-2.noarch.rpm        | d05992eadab430c236fbf180456d8f16 |
| hadoop-3.2.2.tar.gz                             | e7cebb6420657030539dc644ed7ee1f0 |
| hbase-2.2.6-bin.tar.gz                          | 715ed60ccf47700062419bdbfaf2f3b4 |
| jdk-8u291-linux-x64.tar.gz                      | 66902b60fb9b45c0af9e90002ac3a711 |
| kafka_2.12-2.2.2.tg                             | 21fff6a15fa2b2bd6bfc70feeddda117 |
| nifi-1.15.0-bin.zip                             | a90cfee28c3e54ef80c927ae6b809cb6 |
| scala-2.12.15.zip                               | f175f3249d326314142c003a46558ba1 |
| spark-3.0.3-bin-hadoop3.2.tgz                   | 901d203df01fecbaf97f04609bed97a4 |
| apache-zookeeper-3.6.3-bin.tar.gz               | 10ba678ce6d0019d5ce61b6e2b383b8d |
| Python-3.7.7.tgz                                | d348d978a5387512fbc7d7d52dd3a5ef |



### 2. 安装

#### 2.1 Java

```shell
#!/bin/bash

# 软件包路径
pkg_dir="/app/pkgs/"
jdk_pkg="jdk-8u291-linux-x64.tar.gz"
jdk_name="jdk1.8.0_291"
# 安装路径
install_dir="/app/env/"

# 检查文件路径
if [ ! -f $pkg_dir$jdk_pkg ]; then
    echo 'file not exist'
    exit 1
fi

# 创建安装路径
if [ ! -d $install_dir ]; then
    mkdir -p $install_dir
fi

# 解压jdk
echo 'unzip jdk package'
cd $pkg_dir
tar -xzvf $jdk_pkg -C $install_dir
echo "jdk unzipped in " $install_dir$jdk_name

# 配置环境变量
JAVA_HOME=$install_dir$jdk_name
echo "JAVA_HOME=$JAVA_HOME"
if ! grep "JAVA_HOME=$JAVA_HOME" ~/.bash_profile; then
    echo "export JAVA_HOME=$JAVA_HOME" >> ~/.bash_profile
    echo "export PATH=\$PATH:\$JAVA_HOME/bin" >> ~/.bash_profile
fi
source ~/.bash_profile

# 验证
java -version
```





#### 2.2 Scala

scala.sh

```shell
#!/bin/bash

# 软件包路径
pkg_dir="/app/pkgs/"
scala_pkg="scala-2.12.15.zip"
scala_name="scala-2.12.15"
# 安装路径
install_dir="/app/env/"

# 检查文件路径
if [ ! -f $pkg_dir$scala_pkg ]; then
    echo 'file not exist'
    exit 1
fi

# 创建安装路径
if [ ! -d $install_dir ]; then
    mkdir -p $install_dir
fi

# 解压scala
echo 'unzip scala package'
cd $pkg_dir
unzip $scala_pkg -d $install_dir
echo "scala unzipped in " $install_dir$scala_name

# 配置环境变量
SCALA_HOME=$install_dir$scala_name
echo "SCALA_HOME=$SCALA_HOME"
if ! grep "SCALA_HOME=$SCALA_HOME" ~/.bash_profile; then
    echo "export SCALA_HOME=$SCALA_HOME" >> ~/.bash_profile
    echo "export PATH=\$PATH:\$SCALA_HOME/bin" >> ~/.bash_profile
fi
source ~/.bash_profile

# 验证
scala -version
```



在每个节点上执行

```
$ source scala.sh
```



#### 2.3 ZooKeeper

`zookeeper.sh`

```
#!/bin/bash

# 软件包路径
pkg_dir="/app/pkgs/"
zookeeper_pkg="apache-zookeeper-3.6.3-bin.tar.gz"
zookeeper_name="apache-zookeeper-3.6.3-bin"
# 安装路径
install_dir="/app/env/"
# 数据路径
data_dir="/app/data/zookeeper/data"
# 日志路径
logs_dir="/app/data/zookeeper/logs"

# 检查文件路径
if [ ! -f $pkg_dir$zookeeper_pkg ]; then
    echo 'file not exist'
    exit 1
fi

# 创建安装路径
if [ ! -d $install_dir ]; then
    mkdir -p $install_dir
fi

# 创建数据路径
if [ ! -d $data_dir ]; then
    mkdir -p $data_dir
fi

# 创建日志路径
if [ ! -d $logs_dir ]; then
    mkdir -p $logs_dir
fi

# 解压zookeeper
echo 'unzip zookeeper package'
cd $pkg_dir
tar -xzf $zookeeper_pkg -C $install_dir
echo "zookeeper unzipped in " $install_dir$zookeeper_name

# 配置环境变量
ZOOKEEPER_HOME=$install_dir$zookeeper_name
echo "ZOOKEEPER_HOME=$ZOOKEEPER_HOME"
if ! grep "ZOOKEEPER_HOME=$ZOOKEEPER_HOME" ~/.bash_profile; then
    echo "export ZOOKEEPER_HOME=$ZOOKEEPER_HOME" >> ~/.bash_profile
    echo "export PATH=\$PATH:\$ZOOKEEPER_HOME/bin" >> ~/.bash_profile
fi

# 修改配置文件
cd $ZOOKEEPER_HOME/conf
echo "tickTime=2000" >> zoo.cfg
echo "initLimit=10" >> zoo.cfg
echo "syncLimit=5" >> zoo.cfg
echo "dataDir=$data_dir" >> zoo.cfg
echo "dataLogDir=$logs_dir" >> zoo.cfg
echo "clientPort=2181" >> zoo.cfg
echo "server.1=10.xxx.37.32:2888:3888" >>zoo.cfg
echo "server.2=10.xxx.37.49:2888:3888" >>zoo.cfg
echo "server.3=10.xxx.37.24:2888:3888" >>zoo.cfg
echo "server.4=10.xxx.37.48:2888:3888" >>zoo.cfg
echo "server.5=10.xxx.37.46:2888:3888" >>zoo.cfg

# 配置节点标识
case $HOSTNAME in 
    "VM-37-32-centos")
        echo "1" > $data_dir/myid
        ;;
    "VM-37-49-centos")
        echo "2" > $data_dir/myid
        ;;
    "VM-37-24-centos")
        echo "3" > $data_dir/myid
        ;;
    "VM-37-48-centos")
        echo "4" > $data_dir/myid
        ;;
    "VM-37-46-centos")
        echo "5" > $data_dir/myid
        ;;
    *)
        echo "Not a valid hostname"
        exit 1
        ;;
esac

# 启动zookeeper
cd $ZOOKEEPER_HOME/bin
sh zkServer.sh start
```



在每个节点上执行

```
$ source zookeeper.sh
```



#### 2.4 Kafka

`kafka.sh`

```
#!/bin/bash

# 软件包路径
pkg_dir="/app/pkgs/"
kafka_pkg="kafka_2.12-2.2.2.tgz"
kafka_name="kafka_2.12-2.2.2"
# 安装路径
install_dir="/app/env/"
# 日志路径
logs_dir="/app/data/kafka/logs"

# 检查文件路径
if [ ! -f $pkg_dir$kafka_pkg ]; then
    echo 'file not exist'
    exit 1
fi

# 创建安装路径
if [ ! -d $install_dir ]; then
    mkdir -p $install_dir
fi

# 创建日志路径
if [ ! -d $logs_dir ]; then
    mkdir -p $logs_dir
fi

# 解压kafka
echo 'unzip kafka package'
cd $pkg_dir
tar -xzvf $kafka_pkg -C $install_dir
echo "kafka unzipped in " $install_dir$kafka_name

# 配置环境变量
KAFKA_HOME=$install_dir$kafka_name
echo "KAFKA_HOME=$KAFKA_HOME"
if ! grep "KAFKA_HOME=$KAFKA_HOME" ~/.bash_profile; then
    echo "export KAFKA_HOME=$KAFKA_HOME" >>~/.bash_profile
    echo "export PATH=\$PATH:\$KAFKA_HOME/bin" >>~/.bash_profile
fi
source ~/.bash_profile

# 修改配置
cd $KAFKA_HOME/config
sed -i "s|log.dirs=\/tmp\/kafka-logs|log.dirs=$logs_dir|g" server.properties
sed -i 's|zookeeper.connect=localhost:2181|zookeeper.connect=10.xxx.37.32:2181,10.xxx.37.49:2181,10.xxx.37.24:2181,10.xxx.37.48:2181,10.xxx.37.46:2181|g' server.properties
case $HOSTNAME in 
    "VM-37-32-centos")
        echo -e '\nlisteners=PLAINTEXT://10.xxx.37.32:9092' >> server.properties
        ;;
    "VM-37-49-centos")
        sed -i 's|broker.id=0|broker.id=1|g' server.properties
        echo -e '\nlisteners=PLAINTEXT://10.xxx.37.49:9092' >> server.properties
        ;;
    "VM-37-24-centos")
        sed -i 's|broker.id=0|broker.id=2|g' server.properties
        echo -e '\nlisteners=PLAINTEXT://10.xxx.37.24:9092' >> server.properties
        ;;
    "VM-37-48-centos")
        sed -i 's|broker.id=0|broker.id=3|g' server.properties
        echo -e '\nlisteners=PLAINTEXT://10.xxx.37.48:9092' >> server.properties
        ;;
    "VM-37-46-centos")
        sed -i 's|broker.id=0|broker.id=4|g' server.properties
        echo -e '\nlisteners=PLAINTEXT://10.xxx.37.46:9092' >> server.properties
        ;;
    *)
        echo "Not a valid hostname"
        exit 1
        ;;
esac

# 启动kafka
cd $KAFKA_HOME
kafka-server-start.sh -daemon config/server.properties
```



在每个节点上执行

```
$ source kafka.sh
```



可以在任意节点创建topic并发送和接收消息

```shell
$ kafka-topics.sh --create --zookeeper 10.xxx.37.32:2181 --replication-factor 3 --partitions 1 --topic test

$ kafka-topics.sh --list --zookeeper 10.xxx.37.32:2181
$ kafka-topics.sh --list --bootstrap-server 10.xxx.37.32:9092

$ kafka-console-producer.sh --topic test --broker-list 10.xxx.37.32:9092
$ kafka-console-consumer.sh --topic test  --bootstrap-server 10.xxx.37.32:9092 --from-beginning 
```



查看zookeeper

```
$ zkCli.sh
[zk: localhost:2181(CONNECTED) 3] ls /brokers/ids
[0, 1, 2, 3, 4]
```





### 3. Hadoop安装

#### 3.1 节点

| ip           | hostname        | hdfs                                                 | yarn                         |
| ------------ | --------------- | ---------------------------------------------------- | ---------------------------- |
| 10.xxx.37.32 | VM-37-32-centos | NameNode(active)、DataNode、DFSZKFailoverController  | NodeManager                  |
| 10.xxx.37.49 | VM-37-49-centos | NameNode(standby)、DataNode、DFSZKFailoverController | ResourceManager、NodeManager |
| 10.xxx.37.24 | VM-37-24-centos | DataNode、JournalNode                                | NodeManager                  |
| 10.xxx.37.48 | VM-37-48-centos | DataNode、JournalNode                                | NodeManager                  |
| 10.xxx.37.46 | VM-37-46-centos | DataNode、JournalNode                                | NodeManager                  |



#### 3.2 安装

`hadoop.sh`

```
#!/bin/bash

# 软件包路径
pkg_dir="/app/pkgs/"
hadoop_pkg="hadoop-3.2.2.tar.gz"
hadoop_name="hadoop-3.2.2"
# 安装路径
install_dir="/app/env/"
# pid路径
pid_dir="/app/data/hadoop/pids"
# hadoop数据路径
hadoop_dir="/app/data/hadoop"

# 检查文件路径
if [ ! -f $pkg_dir$hadoop_pkg ]; then
    echo 'file not exist'
    exit 1
fi

# 创建安装路径
if [ ! -d $install_dir ]; then
    mkdir -p $install_dir
fi

# 创建pid路径
if [ ! -d $pid_dir ]; then
    mkdir -p $pid_dir
fi

# 解压hadoop
echo 'unzip hadoop package'
cd $pkg_dir
tar -xzvf $hadoop_pkg -C $install_dir
echo "hadoop unzipped in " $install_dir$hadoop_name

# 配置环境变量
HADOOP_HOME=$install_dir$hadoop_name
echo "HADOOP_HOME=$HADOOP_HOME"
if ! grep "HADOOP_HOME=$HADOOP_HOME" ~/.bash_profile; then
    echo "export HADOOP_HOME=$HADOOP_HOME" >> ~/.bash_profile
    echo "export PATH=\$PATH:\$HADOOP_HOME/bin:\$HADOOP_HOME/sbin" >> ~/.bash_profile
fi
source ~/.bash_profile

cd $HADOOP_HOME/etc/hadoop
# 修改hadoop-env.sh
echo "export JAVA_HOME=$JAVA_HOME" >> hadoop-env.sh
echo "export HADOOP_PID_DIR=$pid_dir" >> hadoop-env.sh

# 编辑core-site.xml
sed -i "s|<configuration>||" core-site.xml
sed -i "s|</configuration>||" core-site.xml
echo "
<configuration>
    <!-- 指定hdfs的nameservice为masters -->
    <property>
    	<name>fs.defaultFS</name>
    	<value>hdfs://mycluster</value>
    </property>
    <!-- 用于序列文件的缓冲区大小。此缓冲区的大小可能是硬件页大小（在Intel x86上为4096）的倍数，它决定在读写操作期间缓冲了多少数据. 默认为4096-->
    <property>
    	<name>io.file.buffer.size</name>
    	<value>40960</value>
    </property>
    <!-- 指定hadoop临时目录 -->
    <property>
    	<name>hadoop.tmp.dir</name>
    	<value>$hadoop_dir/temp</value>
    </property>
    <!-- 指定zookeeper地址 -->
    <property>
    	<name>ha.zookeeper.quorum</name>
    	<value>10.xxx.37.32:2181,10.xxx.37.49:2181,10.xxx.37.24:2181,10.xxx.37.48:2181,10.xxx.37.46:2181</value>
    </property>
    <!-- 解决：Active NameNode日志出现异常IPC‘s epoch [X] is less than the last promised epoch [X+1]，出现短期的双Active -->
    <property>
    	<name>ha.health-monitor.rpc-timeout.ms</name> 
    	<value>180000</value> 
    </property>  
</configuration>
" >> core-site.xml

# 编辑hdfs-site.xml
sed -i "s|<configuration>||" hdfs-site.xml
sed -i "s|</configuration>||" hdfs-site.xml
echo "
<configuration>
    <property>
        <name>dfs.nameservices</name>
        <value>mycluster</value>
    </property>
    <!-- mycluster下面有两个NameNode，逻辑名分别设置为VM-37-32-centos，VM-37-49-centos -->
    <property>
        <name>dfs.ha.namenodes.mycluster</name>
        <value>VM-37-32-centos,VM-37-49-centos</value>
    </property>
    <!-- VM-37-32-centos的RPC通信地址 -->
    <property>
        <name>dfs.namenode.rpc-address.mycluster.VM-37-32-centos</name>
        <value>VM-37-32-centos:9000</value>
    </property>
    <!-- VM-37-32-centos的http通信地址 -->
    <property>
        <name>dfs.namenode.http-address.mycluster.VM-37-32-centos</name>
        <value>VM-37-32-centos:9870</value>
    </property>
    <!-- VM-37-32-centos的servicerpc通信地址 -->
    <property>
        <name>dfs.namenode.servicerpc-address.mycluster.VM-37-32-centos</name>
        <value>VM-37-32-centos:9810</value>
    </property>
    <!-- VM-37-49-centos的RPC通信地址 -->
    <property>
        <name>dfs.namenode.rpc-address.mycluster.VM-37-49-centos</name>
        <value>VM-37-49-centos:9000</value>
    </property>
    <!-- VM-37-49-centos的http通信地址 -->
    <property>
        <name>dfs.namenode.http-address.mycluster.VM-37-49-centos</name>
        <value>VM-37-49-centos:9870</value>
    </property>
    <!--VM-37-49-centos的servicerpc通信地址 -->
    <property>
        <name>dfs.namenode.servicerpc-address.mycluster.VM-37-49-centos</name>
        <value>VM-37-49-centos:9810</value>
    </property>
    <!-- 指定NameNode的元数据在JournalNode上的存放位置 -->
    <property>
        <name>dfs.namenode.name.dir</name>
        <value>$hadoop_dir/data/mycluster</value>
        <final>true</final>
    </property>
    <!-- 指定NameNode的元数据在JournalNode上的存放位置,必须是hadoop-daemons.sh start journalnode启动的节点 -->
    <property>
        <name>dfs.namenode.shared.edits.dir</name>
        <value>qjournal://VM-37-24-centos:8485;VM-37-48-centos:8485;VM-37-46-centos:8485/mycluster</value>
    </property>
    <!-- 指定JournalNode在本地磁盘存放数据的位置 -->
    <property>
        <name>dfs.journalnode.edits.dir</name>
        <value>$hadoop_dir/data/tmp/journal</value>
    </property>
    <!-- 开启NameNode失败自动切换 -->
    <property>
        <name>dfs.ha.automatic-failover.enabled</name>
        <value>true</value>
    </property>
    <!-- 配置失败自动切换实现方式 -->
    <property>
        <name>dfs.client.failover.proxy.provider.mycluster</name>
        <value>org.apache.hadoop.hdfs.server.namenode.ha.ConfiguredFailoverProxyProvider</value>
    </property>
    <!-- 配置隔离机制方法，多个机制用换行分割，即每个机制暂用一行-->
    <property>
        <name>dfs.ha.fencing.methods</name>
        <value>
            sshfence
            shell(/bin/true)
        </value>
    </property>
    <!-- 使用sshfence隔离机制时需要ssh免登陆 -->
    <property>
        <name>dfs.ha.fencing.ssh.private-key-files</name>
        <value>/home/appdeploy/.ssh/id_dsa</value>
    </property>
    <!-- 配置sshfence隔离机制超时时间 -->
    <property>
        <name>dfs.ha.fencing.ssh.connect-timeout</name>
        <value>30000</value>
    </property>
    <!-- 指定DataNode数据的存放位置，建议一台机器挂多个盘，一方面增大容量，另一方面减少磁盘单点故障及磁盘读写能力 -->
    <property>
        <name>dfs.datanode.data.dir</name>
        <value>$hadoop_dir/data/dn</value>
        <final>true</final>
    </property>
    <property>
        <name>dfs.namenode.checkpoint.dir.mycluster </name>
        <value>$hadoop_dir/data/dfs/namesecondary</value>
        <final>true</final>
    </property>
    <!--每个DataNode上需预留的空间，给非hdfs使用，默认为0 -->
    <property>
        <name> dfs.datanode.du.reserved </name>
        <value>102400</value>
        <final>true</final>
    </property>
    <!--限制hdfs负载均衡时占用的最大带宽（以每秒字节数为单位）. -->
    <property>
        <name>dfs.datanode.balance.bandwidthPerSec</name>
        <value>10485760000</value>
    </property>
</configuration>
" >> hdfs-site.xml

# 编辑mapred-site.xml
sed -i "s|<configuration>||" mapred-site.xml
sed -i "s|</configuration>||" mapred-site.xml
echo "
<configuration>
    <!-- 指定mr框架为yarn方式 -->
    <property>
        <name>mapreduce.framework.name</name>
        <value>yarn</value>
    </property>
    <!-- Expert: 将此设置为true，任务跟踪程序将在任务完成时发送带外检测信号，以获得更好的延迟 -->
    <property>
        <name>mapreduce.tasktracker.outofband.heartbeat</name>
        <value>true</value>
    </property>
    <property>
        <name>yarn.app.mapreduce.am.env</name>
        <value>HADOOP_MAPRED_HOME=${HADOOP_HOME}</value>
    </property>
    <property>
        <name>mapreduce.map.env</name>
        <value>HADOOP_MAPRED_HOME=${HADOOP_HOME}</value>
    </property>
    <property>
        <name>mapreduce.reduce.env</name>
        <value>HADOOP_MAPRED_HOME=${HADOOP_HOME}</value>
    </property>
</configuration>
" >> mapred-site.xml

# 编辑yarn-site.xml
sed -i "s|<configuration>||" yarn-site.xml
sed -i "s|</configuration>||" yarn-site.xml
echo "
<configuration>
    <property>
        <name>yarn.resourcemanager.hostname</name>
        <value>VM-37-49-centos</value>
    </property>
    <property>
        <name>yarn.nodemanager.aux-services</name>
        <value>mapreduce_shuffle</value>
    </property>
</configuration>
" >> yarn-site.xml

# 编辑workers
sed -i "s|localhost||" workers
echo "VM-37-32-centos" >> workers
echo "VM-37-49-centos" >> workers
echo "VM-37-24-centos" >> workers
echo "VM-37-48-centos" >> workers
echo "VM-37-46-centos" >> workers
```



#### 3.3 启动服务

- VM-37-32-centos 为 NameNode(active) 节点，在此节点执行hdfs的初始化和启动

- VM-37-49-centos 为 ResourceManager，在此节点启动yarn

##### 3.3.1 启动journalnode

在VM-37-32-centos节点执行

```shell
$ hdfs --workers --daemon start journalnode
```

##### 3.3.2 格式化hdfs

在VM-37-32-centos节点执行

```shell
$ hdfs namenode -format
```

##### 3.3.3 拷贝元数据到namenode(standby)节点

在VM-37-32-centos节点执行

```shell
$ scp -r /app/data/hadoop/data VM-37-49-centos:/app/data/hadoop/
```

##### 3.3.4 格式化zk

在VM-37-32-centos节点执行

```shell
$ hdfs zkfc -formatZK
```

##### 3.3.5 启动hdfs

在VM-37-32-centos节点执行

```shell
$ start-dfs.sh
```

##### 3.3.6 启动yarn

在VM-37-49-centos节点执行命令：

```shell
$ start-yarn.sh
```



#### 3.4 验证服务

NameNode(active)：http://10.xxx.37.32:9870/

NameNode(standby)：http://10.xxx.37.49:9870/

ResourceManager：http://10.xxx.37.49:8088/







### 4. Docker

#### 4.1 添加harbor

/etc/docker/daemon.json

```
{
    "registry-mirrors":[
        "https://mirror.ccs.tencentyun.com"
    ],
    "insecure-registries":["10.82.244.40:80"]
}
```

```
$ systemctl daemon-reload
$ service docker restart(systemctl restart docker)
$ docker info
```

















### sqoop

```
sqoop list-databases --connect jdbc:mysql://10.82.244.40 --username root --password skybar
```

