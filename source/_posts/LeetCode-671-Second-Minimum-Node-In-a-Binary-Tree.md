---
title: '[LeetCode]671. Second Minimum Node In a Binary Tree'
date: 2017-09-06 16:24:10
tags: LeetCode
---

### 题目
Given a non-empty special binary tree consisting of nodes with the non-negative value, where each node in this tree has exactly two or zero sub-node. If the node has two sub-nodes, then this node's value is the smaller value among its two sub-nodes.

Given such a binary tree, you need to output the **second minimum** value in the set made of all the nodes' value in the whole tree.

If no such second minimum value exists, output -1 instead.

**Example 1:**
```
Input: 
    2
   / \
  2   5
     / \
    5   7

Output: 5
Explanation: The smallest value is 2, the second smallest value is 5.
```
**Example 2:**
```
Input: 
    2
   / \
  2   2

Output: -1
Explanation: The smallest value is 2, but there isn't any second smallest value.
```

### 难度
Easy

### 方法
首先将最小值`minimum`和第二小值`second_minimum`置为`maxint`，递归遍历二叉树，如果节点值比最小值小，则将最小值赋给第二小值，然后将最小值更新为节点值；如果节点值比最小值大，并且节点值小于第二小值，则将第二小值更新为节点值。节点遍历后如果第二小值`==maxint`，即没有第二小值，则返回`-1`

### python代码
```python
import sys

class TreeNode(object):
    def __init__(self, x):
        self.val = x
        self.left = None
        self.right = None

class Solution(object):
    def findSecondMinimumValue(self, root):
        self.min = sys.maxint
        self.second_min = sys.maxint
        def traverse(node):
            if node:
                if node.val < self.min:
                    self.second_min = self.min
                    self.min = node.val
                elif node.val < self.second_min and node.val != self.min:
                    self.second_min = node.val

                traverse(node.left)
                traverse(node.right)

        traverse(root)
        if self.second_min != sys.maxint:
            return self.second_min
        return -1

root = TreeNode(2)
root.left = TreeNode(2)
root.right = TreeNode(5)
root.right.left = TreeNode(5)
root.right.right = TreeNode(7)

assert Solution().findSecondMinimumValue(root) == 5
```