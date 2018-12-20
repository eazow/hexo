---
title: '[LeetCode]404. Sum of Left Leaves'
date: 2017-08-08 15:12:54
tags: LeetCode
---

### 题目
Find the sum of all left leaves in a given binary tree.

**Example:**
```
    3
   / \
  9  20
    /  \
   15   7

There are two left leaves in the binary tree, with values 9 and 15 respectively. Return 24.
```

### 方法
递归遍历，如果为左节点，则打上标记`isLeft`，如果该节点没有左右子节点，则将该节点值累加到最后的结果中

### python代码
```python
class TreeNode(object):
    def __init__(self, x):
        self.val = x
        self.left = None
        self.right = None

class Solution(object):
    def sumOfLeftLeaves(self, root):
        self.result = 0
        self.traverse(root)
        return self.result

    def traverse(self, node, isLeft=False):
        if node and node.left == None and node.right == None and isLeft:
            self.result += node.val
        if node:
            self.traverse(node.left, True)
            self.traverse(node.right)


root = TreeNode(3)
root.left = TreeNode(9)
root.right = TreeNode(20)
root.right.left = TreeNode(15)
root.right.right = TreeNode(7)

assert Solution().sumOfLeftLeaves(root) == 24
```