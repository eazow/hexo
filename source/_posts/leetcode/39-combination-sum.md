---
title: "[LeetCode]39. Combination Sum"
date: 2016-08-19 16:42:04
tags: LeetCode
category: Coding
---

#### Problem
Given a set of candidate numbers (***C***) and a target number (***T***), find all unique combinations in ***C*** where the candidate numbers sums to ***T***.
The **same** repeated number may be chosen from ***C*** unlimited number of times.

**Note:**
* All numbers (including target) will be positive integers.

* The solution set must not contain duplicate combinations.
  For example, given candidate set [2, 3, 6, 7] and target 7,
  A solution set is:

  ```
  [
    [7],
    [2, 2, 3]
  ]
  ```



#### 难度

Medium



#### 思路

利用栈，如果要入栈的数加上已入栈的数的和小于target, 则入栈；如果等于target，则复制该栈，加入返回结果，然后从栈取出一个数，取其下一个数准备入栈；如果大于target, 则从栈取出一个数，取其下一个数准备入栈。注意一些边界条件的判断



#### Python代码
```python
class Solution(object):
    def combinationSum(self, candidates, target):
        """
        :type candidates: List[int]
        :type tatget: int
        :rtype List[List[int]]
        """
        nums = []
        indexes = []
        returnLists = []
        sum = 0
        i = 0
        candidates.sort()
        while True:
            while i >= len(candidates):
                if len(nums) == 0:
                    return returnLists
                sum -= nums.pop()
                i = indexes.pop()+1
            if sum + candidates[i] < target:
                nums.append(candidates[i])
                indexes.append(i)
                sum += candidates[i]
            elif sum + candidates[i] > target:
                if len(nums) > 0:
                    sum -= nums.pop()
                    i = indexes.pop()+1
                else:
                    return returnLists
            elif sum + candidates[i] == target:
                newNums = nums[:]
                newNums.append(candidates[i])
                returnLists.append(newNums)
                if len(nums) > 0:
                    sum -= nums.pop()
                    i = indexes.pop()+1
                else:
                    i += 1


assert Solution().combinationSum([2,3,4], 7)==[[2,2,3], [3,4]]
assert Solution().combinationSum([2,3,6,7], 7)==[[2,2,3], [7]]
assert Solution().combinationSum([2], 1) == []
```