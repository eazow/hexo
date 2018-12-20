---
title: '[LeetCode]506. Relative Ranks'
date: 2017-08-11 23:10:01
tags: LeetCode
---

### 题目
Given scores of **N** athletes, find their relative ranks and the people with the top three highest scores, who will be awarded medals: "Gold Medal", "Silver Medal" and "Bronze Medal".

**Example 1:**
```
Input: [5, 4, 3, 2, 1]
Output: ["Gold Medal", "Silver Medal", "Bronze Medal", "4", "5"]
Explanation: The first three athletes got the top three highest scores, so they got "Gold Medal", 
"Silver Medal" and "Bronze Medal". 
For the left two athletes, you just need to output their relative ranks according to their scores.
```
**Note:**
1. N is a positive integer and won't exceed 10,000.
2. All the scores of athletes are guaranteed to be unique.

### 难度
Easy

### 方法
对数组排序，同时对其索引也排序，即排序后元素之前的索引被记录。排序后的元素对应的rank位置分别为`Gold Medal, Silver Medal, Bronze Medal, 4, 5...`，然后将该rank赋值给排序前索引对应的位置即可

### python代码
```
class Solution(object):
    def findRelativeRanks(self, nums):
        """
        :type nums: List[int]
        :rtype: List[str]
        """
        numsStrs = []
        for i in range(len(nums)):
            numsStrs.append(str(nums[i])+'-'+str(i))

        numsStrs = sorted(numsStrs, lambda x,y: cmp(int(x.split("-")[0]), int(y.split("-")[0])))[::-1]
        ranks = [''] * len(nums)
        for i in range(len(numsStrs)):
            index = int(numsStrs[i].split("-")[1])
            if i == 0:
                ranks[index] = "Gold Medal"
            elif i == 1:
                ranks[index] = "Silver Medal"
            elif i == 2:
                ranks[index] = "Bronze Medal"
            else:
                ranks[index] = str(i+1)
        return ranks

assert Solution().findRelativeRanks([1, 2, 3, 4, 5]) == ["5", "4", "Bronze Medal", "Silver Medal", "Gold Medal"]
assert Solution().findRelativeRanks([10, 3, 8, 9, 4]) == ["Gold Medal", "5", "Bronze Medal", "Silver Medal", "4"]
```