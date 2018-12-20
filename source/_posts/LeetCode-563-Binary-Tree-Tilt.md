---
title: '[LeetCode]563. Binary Tree Tilt'
date: 2017-08-09 17:31:12
tags: LeetCode
---

### 题目
Given a binary tree, return the tilt of the whole tree.

The tilt of a tree node is defined as the absolute difference between the sum of all left subtree node values and the sum of all right subtree node values. Null node has tilt 0.

The tilt of the whole tree is defined as the sum of all nodes' tilt.

**Example:**
```
Input: 
         1
       /   \
      2     3
Output: 1
Explanation: 
Tilt of node 2 : 0
Tilt of node 3 : 0
Tilt of node 1 : |2-3| = 1
Tilt of binary tree : 0 + 0 + 1 = 1
```
**Note:**
1. The sum of node values in any subtree won't exceed the range of 32-bit integer.
2. All the tilt values won't exceed the range of 32-bit integer.

### 难度
Easy

### 方法
对该二叉树进行后续遍历，算出每个节点的左右子树之和的差的绝对值，累加到最后的result中。然后将节点值替换为左右子树节点值之和。

### python代码
```python
class TreeNode(object):
    def __init__(self, x):
        self.val = x
        self.left = None
        self.right = None

class Solution(object):
    def findTilt(self, root):
        """
        :type root: TreeNode
        :rtype: int
        """
        self.result = 0
        self.traverse(root)
        return self.result

    def traverse(self, node):
        if node:
            self.traverse(node.left)
            self.traverse(node.right)

            if node.left and node.right:
                self.result += abs(node.right.val - node.left.val)
                node.val += node.right.val + node.left.val
            elif node.left:
                self.result += abs(node.left.val)
                node.val += node.left.val
            elif node.right:
                self.result += abs(node.right.val)
                node.val += node.right.val

root = TreeNode(1)
root.left = TreeNode(2)
root.right = TreeNode(3)
root.left.left = TreeNode(4)
assert Solution().findTilt(root) == 7

root = TreeNode(-8)
root.left = TreeNode(3)
root.right = TreeNode(0)
root.left.left = TreeNode(-8)
root.left.left.right = TreeNode(-1)
root.left.left.right.right = TreeNode(8)
assert Solution().findTilt(root) == 18
```