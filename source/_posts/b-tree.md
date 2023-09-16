---
title: B-Tree
date: 2023-09-10 23:57:20
tags:
categories: Coding
---



B-Tree是 SQLite 用来表示表和索引的数据结构，因此它是一个非常核心的思想。本文只是介绍数据结构，所以不会有任何代码。

为什么树是数据库的良好数据结构？

- 搜索特定值很快（对数时间）
- 插入/删除您已经找到的值速度很快（重新平衡的时间很长）
- 遍历一系列值的速度很快（与哈希映射不同）

B 树与二叉树不同（“B”可能代表发明者的名字，但也可以代表“平衡”）。这是一个 B 树示例：

![example B-Tree (https://en.wikipedia.org/wiki/File:B-tree.svg)](https://cstack.github.io/db_tutorial/assets/images/B-tree.png)



