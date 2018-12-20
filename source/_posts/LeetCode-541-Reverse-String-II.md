---
title: '[LeetCode]541. Reverse String II'
date: 2017-08-23 15:05:03
tags: LeetCode
---

### 题目
Given a string and an integer k, you need to reverse the first k characters for every 2k characters counting from the start of the string. If there are less than k characters left, reverse all of them. If there are less than 2k but greater than or equal to k characters, then reverse the first k characters and left the other as original.
**Example:**
```
Input: s = "abcdefg", k = 2
Output: "bacdfeg"
```
**Restrictions:**
1. The string consists of lower English letters only.
2. Length of the given string and k will in the range [1, 10000]

### 难度
Easy

### 方法
每次处理s[0:2k]，将s[0:k]逆序后拼接s[k:2k]，然后将s[2k:]赋值给s，循环处理直至s为空即可

### python代码
```python
class Solution(object):
    def reverseStr(self, s, k):
        """
        :type s: str
        :type k: int
        :rtype: str
        """
        result = ""
        while s:
            temp = s[0:k]
            result += temp[::-1] + s[k:2*k]
            s = s[2*k:]
        return result

assert Solution().reverseStr("abcdefg", 2) == "bacdfeg"
```