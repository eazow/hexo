---
title: '[LeetCode]637. Average of Levels in Binary Tree'
date: 2017-07-31 15:34:04
tags: LeetCode
---

##### 题目
Given a non-empty binary tree, return the average value of the nodes on each level in the form of an array.

**Example 1:**
```
Input:
    3
   / \
  9  20
    /  \
   15   7
Output: [3, 14.5, 11]
Explanation:
The average value of nodes on level 0 is 3,  on level 1 is 14.5, and on level 2 is 11. 
Hence return [3, 14.5, 11].
```

**Note:**
1. The range of node's value is in the range of 32-bit signed integer.


##### 难度
Easy

##### 方法
对二叉树进行深度遍历，将深度level作为参数传递，记录每一级的sum和个数n，最后将sum/n保存到结果列表中即可

##### python代码
```python
class TreeNode(object):
    def __init__(self, x):
        self.val = x
        self.left = None
        self.right = None

class Solution(object):
    def averageOfLevels(self, root):
        """
        :type root: TreeNode
        :rtype: List[float]
        """
        sums = []
        nums = []
        def dfs(node, level):
            if node:
                if len(sums) <= level:
                    sums.append(0)
                    nums.append(0)

                sums[level] += node.val
                nums[level] += 1

                dfs(node.left, level+1)
                dfs(node.right, level+1)

        dfs(root, 0)

        result = []
        for i in range(len(sums)):
            result.append(sums[i]/float(nums[i]))

        return result


root = TreeNode(3)
root.left = TreeNode(9)
root.right = TreeNode(20)
root.right.left = TreeNode(15)
root.right.right = TreeNode(7)

assert Solution().averageOfLevels(root) == [3, 14.5, 11]
```