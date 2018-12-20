---
title: '[LeetCode]617. Merge Two Binary Trees'
date: 2017-07-29 11:37:40
tags: LeetCode
---

##### 题目
Given two binary trees and imagine that when you put one of them to cover the other, some nodes of the two trees are overlapped while the others are not.

You need to merge them into a new binary tree. The merge rule is that if two nodes overlap, then sum node values up as the new value of the merged node. Otherwise, the NOT null node will be used as the node of new tree.

**Example 1:**
```
Input: 
	Tree 1                     Tree 2                  
          1                         2                             
         / \                       / \                            
        3   2                     1   3                        
       /                           \   \                      
      5                             4   7                  
Output: 
Merged tree:
	     3
	    / \
	   4   5
	  / \   \ 
	 5   4   7
```

##### 方法
采用递归的方法。假设有2个根节点`t1`,`t2`，用`t1`保存最后的合并结果。如果`t1`和`t2`都不为空，则`t1.val = t1.val+t2.val`，递归调用赋值`t1.left = mergeTrees(t1.left, t2.left)`和`t1.right = mergeTrees(t1.right, t2.right)`; 如果`t1`为空，`t2`不为空，则`t1 = t2`，最后返回`t1`节点

##### 难度
Easy

##### python代码
```python
# Definition for a binary tree node.
class TreeNode(object):
    def __init__(self, x):
        self.val = x
        self.left = None
        self.right = None

class Solution(object):
    def mergeTrees(self, t1, t2):
        """
        :type t1: TreeNode
        :type t2: TreeNode
        :rtype: TreeNode
        """
        if t1 and t2:
            t1.val += t2.val
            t1.left = self.mergeTrees(t1.left, t2.left)
            t1.right = self.mergeTrees(t1.right, t2.right)
        elif t2:
            t1 = t2

        return t1

root1 = TreeNode(1)
left1 = TreeNode(3)
right1 = TreeNode(2)
root1.left = left1
root1.right = right1

root2 = TreeNode(2)
left2 = TreeNode(1)
right2 = TreeNode(3)
root2.left = left2
root2.right = right2

root = Solution().mergeTrees(root1, root2)
assert root.val == 3
assert root.left.val == 4
assert root.right.val == 5
```
