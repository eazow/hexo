---
title: '[LeetCode]387. First Unique Character in a String'
date: 2017-08-14 14:39:15
tags: LeetCode
---

### 题目
Given a string, find the first non-repeating character in it and return it's index. If it doesn't exist, return -1.

**Examples:**
```
s = "leetcode"
return 0.

s = "loveleetcode",
return 2.
```
**Note:** You may assume the string contain only lowercase letters.

### 难度
Easy

### 方法
先用一个dict统计每个单词出现的次数，然后从头开始检查`s`的字符，如果字符出现次数为`1`，则返回该字符的位置; 如果所有字符出现字数都不为`1`，则返回`-1`

### python代码
```python
class Solution(object):
    def firstUniqChar(self, s):
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

        for i in range(len(s)):
            if counter[s[i]] == 1:
                return i
        return -1

assert Solution().firstUniqChar("leetcode") == 0
assert Solution().firstUniqChar("leveleetcode") == 2
```