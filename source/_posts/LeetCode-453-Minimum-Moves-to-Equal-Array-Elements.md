---
title: '[LeetCode]453. Minimum Moves to Equal Array Elements'
date: 2017-07-31 18:25:32
tags: LeetCode
---

### 题目
Given a non-empty integer array of size n, find the minimum number of moves required to make all array elements equal, where a move is incrementing n - 1 elements by 1.

**Example:**
```
Input:
[1,2,3]

Output:
3

Explanation:
Only three moves are needed (remember each move increments two elements):

[1,2,3]  =>  [2,3,3]  =>  [3,4,3]  =>  [4,4,4]
```

### 难度
Easy

### 方法
这是一个数学题，假设数组中最小的数为`min`，需要移动`x`次，最后数组中的数都为`m`，则其实是一个求`x`的方法
```
(n - 1) * x + sum = n * m
min + x = m
nx - x + sum = n * (min + x)
nx - x + sum = n * min + nx
sum - x = n * min
x = sum - n * min
```

### python代码
```
class Solution(object):
    def minMoves(self, nums):
        """
        :type nums: List[int]
        :rtype: int
        """
        nums = sorted(nums)
        return sum(nums) - len(nums) * nums[0]

assert Solution().minMoves([1,2,3]) == 3
assert Solution().minMoves([1,1,3]) == 2
```