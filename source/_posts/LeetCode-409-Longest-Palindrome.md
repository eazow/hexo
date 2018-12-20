---
title: '[LeetCode]409. Longest Palindrome'
date: 2017-08-14 17:02:28
tags: LeetCode
---

### 题目
Given a string which consists of lowercase or uppercase letters, find the length of the longest palindromes that can be built with those letters.

This is case sensitive, for example "Aa" is not considered a palindrome here.

**Note:**
Assume the length of given string will not exceed 1,010.

**Example:**
```
Input:
"abccccdd"

Output:
7

Explanation:
One longest palindrome that can be built is "dccaccd", whose length is 7.
```

### 难度
Easy

### 方法
先统计每个字符出现的次数，对于出现偶数次的字符，能全部用于组成回文。对于出现基数次n的字符，能用n-1个字符。如果有出现基数次的字符，最后能单独用一个该字符

### python代码
```python
class Solution(object):
    def longestPalindrome(self, s):
        """
        :type s: str
        :rtype: int
        """
        counter = {}
        for c in s:
            if counter.has_key(c):
                counter[c] += 1
            else:
                counter[c] = 1

        palindrome_length = 0
        single = False
        for key in counter:
            if counter[key] % 2 == 0:
                palindrome_length += counter[key]
            else:
                palindrome_length += counter[key] - 1
                single = True

        if single:
            palindrome_length += 1

        return palindrome_length

assert Solution().longestPalindrome("abccccdd") == 7
```