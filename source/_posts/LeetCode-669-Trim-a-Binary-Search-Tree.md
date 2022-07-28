---
title: '[LeetCode]669. Trim a Binary Search Tree'
date: 2017-09-24 16:55:39
tags: LeetCode
---

### 题目
> Given a binary search tree and the lowest and highest boundaries as L and R, trim the tree so that all its elements lies in [L, R] (R >= L). You might need to change the root of the tree, so the result should return the new root of the trimmed binary search tree.

**Example 1:**
```
Input: 
    1
   / \
  0   2

  L = 1
  R = 2

Output: 
    1
      \
       2
```
**Example 2:**
```
Input: 
    3
   / \
  0   4
   \
    2
   /
  1

  L = 1
  R = 3

Output: 
      3
     / 
   2   
  /
 1
```

### 难度
Easy

### 方法
采用递归的方法。如果`root`为空，则直接返回`root`; 如果`root`的值`<L`，表示`root`及其左子树所有节点都`<L`，那么需要改变`root`节点，从`root.right`中重新寻找`root`节点。同理，当`root`的值`>R`时，需要从`root.left`中重新寻找`root`节点。当`L<=root.val<=R`时，则递归处理`root`的左右子树。

### python代码
```python
class TreeNode(object):
    def __init__(self, x):
        self.val = x
        self.left = None
        self.right = None

class Solution(object):
    def trimBST(self, root, L, R):
        if root == None:
            return None

        if root.val < L:
            return self.trimBST(root.right, L, R)
        if root.val > R:
            return self.trimBST(root.left, L, R)

        root.left = self.trimBST(root.left, L, R)
        root.right = self.trimBST(root.right, L, R)

        return root

root = TreeNode(1)
root.left = TreeNode(0)
root.right = TreeNode(2)
assert Solution().trimBST(root, 3, 4) == None

root = TreeNode(3)
root.left = TreeNode(0)
root.right = TreeNode(4)
root.left.right = TreeNode(2)
root.left.right.left = TreeNode(1)
root = Solution().trimBST(root, 1, 3)
assert root.val == 3
assert root.left.val == 2
assert root.right == None
assert root.left.left.val == 1
```