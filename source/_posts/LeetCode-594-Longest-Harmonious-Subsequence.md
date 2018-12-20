---
title: '[LeetCode]594. Longest Harmonious Subsequence'
date: 2017-09-04 16:26:33
tags: LeetCode
---

### 题目
We define a harmonious array is an array where the difference between its maximum value and its minimum value is **exactly** 1.
Now, given an integer array, you need to find the length of its longest harmonious subsequence among all its possible [subsequences](https://en.wikipedia.org/wiki/Subsequence).
**Example 1:**
```
**Input:** [1,3,2,2,5,2,3,7]
**Output:** 5**
Explanation:** The longest harmonious subsequence is [3,2,2,2,3].
```
**Note:** The length of the input array will not exceed 20,000.

### 难度
Easy

### 方法
用一个`map`存放所有值出现的次数，对于`map`中的每个`num`，求出`num`和`num+1`出现的次数之和，找出最大值即可

### python代码
```python
class Solution(object):
    def findLHS(self, nums):
        """
        :type nums: List[int]
        :rtype: int
        """
        nums_count = {}
        for num in nums:
            nums_count[num] = nums_count.get(num, 0) + 1

        result = 0
        for num in nums_count:
            count = nums_count[num]
            if nums_count.get(num+1):
                result = max(result, count + nums_count[num+1])
        return result

assert Solution().findLHS([1,3,2,2,5,2,3,7]) == 5
```