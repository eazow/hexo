---
title: "[LeetCode]90. Subsets II"
date: 2016-09-23 10:09:37
tags: LeetCode
category: Coding
---



#### Problem

Given a collection of integers that might contain duplicates, ***nums***, return all possible subsets.
**Note:** The solution set must not contain duplicate subsets.
For example,
If ***nums*** = [1,2,2], a solution is:

```
[
  [2],
  [1],
  [1,2,2],
  [2,2],
  [1,2],
  []
]
```



#### 方法

设定返回的列表的列表为`result`。先对数组排序，如果`nums[i]!=nums[i-1]`，那么就遍历`result`，复制每个列表为`tempList`，加入`nums[i]`，然后将该列表加入`result`中；如果`nums[i]==nums[i-1]`，那么记录下加入`nums[i-1]`前返回列表的大小`resultIndex`，`resultSize`为加入`nums[i-1]`后的大小，对`result`中从`resultIndex`至`resultSize`的列表加入`nums[i]`，然后将新生成的列表加入`result`



#### 代码

```python
class Solution(object):
    def subsetsWithDup(self, nums):
        """
        :type nums: List[int]
        :rtype: List[List[int]]
        """
        result = [[]]
        nums.sort()
        i = 0
        resultSize = 0
        while i < len(nums):
            num = nums[i]
            resultIndex = 0
            if i>0 and nums[i]==nums[i-1]:
                resultIndex = resultSize;
            resultSize = len(result)
            while resultIndex < resultSize:
                tempList = result[resultIndex][:]
                tempList.append(num)
                result.append(tempList)
                resultIndex += 1
            i += 1
        return result

assert Solution().subsetsWithDup([1,2,2]) == [[],[1],[2],[1,2],[2,2],[1,2,2]]
```