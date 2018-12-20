---
title: '[LeetCode]543. Diameter of Binary Tree'
date: 2017-08-28 17:11:27
tags: LeetCode
---

### 题目
Given a binary tree, you need to compute the length of the diameter of the tree. The diameter of a binary tree is the length of the **longest** path between any two nodes in a tree. This path may or may not pass through the root.

**Example:**
Given a binary tree 
```
          1
         / \
        2   3
       / \     
      4   5
```
Return 3, which is the length of the path [4,2,1,3] or [5,2,1,3].

**Note:** The length of path between two nodes is represented by the number of edges between them.

### 难度
Easy

### 方法
求出每个节点左右子树的深度，相加即为该节点对应的diameter，最后取最大的diameter即可

### python代码
```python
class TreeNode(object):
    def __init__(self, x):
        self.val = x
        self.left = None
        self.right = None

class Solution(object):
    def diameterOfBinaryTree(self, root):
        self.diameter = 0
        def depth(node):
            if node:
                l_depth = depth(node.left)
                r_depth = depth(node.right)
                self.diameter = max(self.diameter, l_depth + r_depth)
                return max(l_depth, r_depth) + 1
            return 0

        depth(root)
        return self.diameter


root = TreeNode(1)
root.left = TreeNode(2)
root.right = TreeNode(3)
root.left.left = TreeNode(4)
root.left.right = TreeNode(5)
assert Solution().diameterOfBinaryTree(root) == 3
```