---
title: Protocol Buffers使用
date: 2021-02-21 22:20:55
tags: Protobuf
categories: Coding
---



### 1. 概述

Protocol Buffers(又名protobuf) 是一种语言中立、平台中立的可扩展机制，用于序列化结构化的数据

它就像JSON，只是它更小、更快

只需定义一次数据如何被结构化，然后就可以使用特殊生成的源代码，轻松地从各种数据流和使用各种语言写入和读取结构化数据



### 2. 好处

protobuf适配多种语言，可以很方便的序列化结构化的数据，最常被用于定义通信协议(与gRPC一起)和数据存储

使用protobuf的一些优点：

- 紧凑的数据存储
- 快速解析
- 可在许多编程语言中使用
- 通过自动生成的类来优化功能



### 3. Python示例

我们创建一个非常简单的“地址簿”应用程序，它可以在文件之间读取和写入人们的联系信息

通讯簿中的每个人都有一个姓名、一个 ID、一个电子邮件地址和一个联系电话号码



#### 3.1 定义协议格式

创建`addressbook.proto`

```proto
syntax = "proto2";

package tutorial;

message Person {
  optional string name = 1;
  optional int32 id = 2;
  optional string email = 3;

  enum PhoneType {
    MOBILE = 0;
    HOME = 1;
    WORK = 2;
  }

  message PhoneNumber {
    optional string number = 1;
    optional PhoneType type = 2 [default = HOME];
  }

  repeated PhoneNumber phones = 4;
}

message AddressBook {
  repeated Person people = 1;
}
```

proto文件以包声明开始，这有助于防止不同项目之间的命名冲突

每个元素上的“ = 1”，“ = 2”标记标识字段在二进制编码中使用的唯一“标记”

每个字段必须使用下列修饰符之一进行注释:

- `optional`: 字段可以设置，也可以不设置。如果未设置可选字段值，则使用默认值。对于简单类型，您可以指定自己的默认值，就像我们在示例中对电话号码类型所做的那样。否则，将使用系统默认值: 数值类型为零，字符串为空字符串，布尔为 false
- `repeated`: 字段可以重复任意次数(包括零次)
- `required`: 必须提供字段的值，否则消息将被视为“未初始化”。序列化未初始化的消息将引发异常。解析未初始化的消息将失败。除此之外，必填字段的行为与可选字段完全相同



#### 3.2 编译Protocol Buffers

a) 安装编译器

b) 运行

``` 
$ protoc --python_out=./ addressbook.proto
```

因为需要 Python 类，所以可以使用 `--python_out`

这将在指定的目标目录中生成 `addressbook_pb2.py`



#### 3.3 写数据

```
#! /usr/bin/python

import addressbook_pb2
import sys

# This function fills in a Person message based on user input.
def PromptForAddress(person):
  person.id = int(raw_input("Enter person ID number: "))
  person.name = raw_input("Enter name: ")

  email = raw_input("Enter email address (blank for none): ")
  if email != "":
    person.email = email

  while True:
    number = raw_input("Enter a phone number (or leave blank to finish): ")
    if number == "":
      break

    phone_number = person.phones.add()
    phone_number.number = number

    type = raw_input("Is this a mobile, home, or work phone? ")
    if type == "mobile":
      phone_number.type = addressbook_pb2.Person.MOBILE
    elif type == "home":
      phone_number.type = addressbook_pb2.Person.HOME
    elif type == "work":
      phone_number.type = addressbook_pb2.Person.WORK
    else:
      print "Unknown phone type; leaving as default value."

# Main procedure:  Reads the entire address book from a file,
#   adds one person based on user input, then writes it back out to the same
#   file.
if len(sys.argv) != 2:
  print "Usage:", sys.argv[0], "ADDRESS_BOOK_FILE"
  sys.exit(-1)

address_book = addressbook_pb2.AddressBook()

# Read the existing address book.
try:
  f = open(sys.argv[1], "rb")
  address_book.ParseFromString(f.read())
  f.close()
except IOError:
  print sys.argv[1] + ": Could not open file.  Creating a new one."

# Add an address.
PromptForAddress(address_book.people.add())

# Write the new address book back to disk.
f = open(sys.argv[1], "wb")
f.write(address_book.SerializeToString())
f.close()
```





#### 3.4 读数据

```
#! /usr/bin/python

import addressbook_pb2
import sys

# Iterates though all people in the AddressBook and prints info about them.
def ListPeople(address_book):
  for person in address_book.people:
    print "Person ID:", person.id
    print "  Name:", person.name
    if person.HasField('email'):
      print "  E-mail address:", person.email

    for phone_number in person.phones:
      if phone_number.type == addressbook_pb2.Person.PhoneType.MOBILE:
        print "  Mobile phone #: ",
      elif phone_number.type == addressbook_pb2.Person.PhoneType.HOME:
        print "  Home phone #: ",
      elif phone_number.type == addressbook_pb2.Person.PhoneType.WORK:
        print "  Work phone #: ",
      print phone_number.number

# Main procedure:  Reads the entire address book from a file and prints all
#   the information inside.
if len(sys.argv) != 2:
  print "Usage:", sys.argv[0], "ADDRESS_BOOK_FILE"
  sys.exit(-1)

address_book = addressbook_pb2.AddressBook()

# Read the existing address book.
f = open(sys.argv[1], "rb")
address_book.ParseFromString(f.read())
f.close()

ListPeople(address_book)
```

