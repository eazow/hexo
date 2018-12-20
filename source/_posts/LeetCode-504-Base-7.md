---
title: '[LeetCode]504. Base 7'
date: 2017-08-22 18:23:23
tags: LeetCode
---

### 题目
Given an integer, return its base 7 string representation.

**Example 1:**
```
Input: 100
Output: "202"
```
**Example 2:**
```
Input: -7
Output: "-10"
```
**Note:** The input will be in range of [-1e7, 1e7].

### 难度
Easy

### 方法
对`num`取除以`7`的余数，即为最低位的数，然后将`num/7`赋值给`num`，继续取`num`除以`7`的余数即为倒数第二位的数，依次类推。注意`num`为`0`时需要返回`"0"`

### python代码
```
class Solution(object):
    def convertToBase7(self, num):
        """
        :type num: int
        :rtype: str
        """
        if num == 0:
            return "0"
        symbol = ""
        if num < 0:
            num = 0 - num
            symbol = "-"

        result = ""
        while num > 0:
            result += str(num % 7)
            num = num / 7

        return symbol + result[::-1]

assert Solution().convertToBase7(100) == "202"
assert Solution().convertToBase7(-7) == "-10"
```