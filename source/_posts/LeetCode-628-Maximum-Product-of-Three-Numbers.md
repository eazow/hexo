---
title: '[LeetCode]628. Maximum Product of  Three Numbers'
date: 2017-08-14 19:03:47
tags: LeetCode
---

### 题目
Given an integer array, find three numbers whose product is maximum and output the maximum product.

**Example 1:**
```
Input: [1,2,3]
Output: 6
```
**Example 2:**
```
Input: [1,2,3,4]
Output: 24
```
**Note:**
1. The length of the given array will be in range [3,104] and all elements are in the range [-1000, 1000].
2. Multiplication of any three numbers in the input won't exceed the range of 32-bit signed integer.

### 难度
Easy

### 方法
注意有负数的情况。对`nums`排序，取`max(nums[-3] * nums[-2] * nums[-1], nums[0] * nums[1] * nums[-1])`

### python代码
```python
class Solution(object):
    def maximumProduct(self, nums):
        """
        :type nums: List[int]
        :rtype: int
        """
        nums = sorted(nums)
        return max(nums[-3] * nums[-2] * nums[-1], nums[0] * nums[1] * nums[-1])

assert Solution().maximumProduct([1,2,3,4]) == 24
assert Solution().maximumProduct([-4,-3,-2,-1,60]) == 720
```