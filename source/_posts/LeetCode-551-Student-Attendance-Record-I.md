---
title: '[LeetCode]551. Student Attendance Record I'
date: 2017-08-22 18:39:11
tags: LeetCode
---

### 题目
You are given a string representing an attendance record for a student. The record only contains the following three characters:
1. **'A'** : Absent.
2. **'L'** : Late.
3. **'P'** : Present.

A student could be rewarded if his attendance record doesn't contain **more than one 'A' (absent) or more than two continuous 'L' (late)**.

You need to return whether the student could be rewarded according to his attendance record.

**Example 1:**
```
Input: "PPALLP"
Output: True
```
**Example 2:**
```
Input: "PPALLL"
Output: False
```

### 难度
Easy

### 方法
对`'A'`和`'L'`计数，如果`'A'`出现的次数`>1`，返回`False`；如果`'L'`连续出现的次数`>2`，则返回`False`；其他情况返回`True`

### python代码
```python
class Solution(object):
    def checkRecord(self, s):
        """
        :type s: str
        :rtype: bool
        """
        a_count = 0
        l_count = 0
        for c in s:
            if c == "A":
                a_count += 1
                l_count = 0
                if a_count > 1:
                    return False
            elif c == "L":
                l_count += 1
                if l_count > 2:
                    return False
            else:
                l_count = 0

        return True

assert Solution().checkRecord("PPALLP") == True
assert Solution().checkRecord("PPALLL") == False
assert Solution().checkRecord("ALPP") == True
```