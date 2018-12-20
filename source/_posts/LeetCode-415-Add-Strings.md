---
title: '[LeetCode]415. Add Strings'
date: 2017-09-01 15:48:15
tags: LeetCode
---

### 题目
Given two non-negative integers `num1` and `num2` represented as string, return the sum of `num1` and `num2`.

**Note:**
1. The length of both num1 and num2 is < 5100.
2. Both num1 and num2 contains only digits 0-9.
3. Both num1 and num2 does not contain any leading zero.
4. You **must not use any built-in BigInteger library or convert the inputs to integer** directly.

### 难度
Easy

### 方法
从低位到高位相加，每一位的结果为除10取余，如果有进位1，则在下一位求和的时候需要+1，循环处理即可。注意最高位相加后如果有进位，需要在结果的最前面补1

### python代码
```python
class Solution(object):
    def addStrings(self, num1, num2):
        """
        :type num1: str
        :type num2: str
        :rtype: str
        """
        i = len(num1) - 1
        j = len(num2) - 1
        num = ""
        carry = 0
        while i >= 0 or j >= 0:
            result = carry
            if i >= 0:
                result += int(num1[i])
            if j >= 0:
                result += int(num2[j])
            if result >= 10:
                carry = 1
            else:
                carry = 0
            num = str(result % 10) + num
            i -= 1
            j -= 1
        if carry == 1:
            num = "1" + num
        return num

assert Solution().addStrings("111", "234965") == "235076"
assert Solution().addStrings("999", "1") == "1000"
```