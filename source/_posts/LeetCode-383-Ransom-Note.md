---
title: '[LeetCode]383. Ransom Note'
date: 2017-08-02 17:18:47
tags: LeetCode
---

### 题目
Given an arbitrary ransom note string and another string containing letters from all the magazines, write a function that will return true if the ransom note can be constructed from the magazines ; otherwise, it will return false.

Each letter in the magazine string can only be used once in your ransom note.

**Note:**
You may assume that both strings contain only lowercase letters.
```
canConstruct("a", "b") -> false
canConstruct("aa", "ab") -> false
canConstruct("aa", "aab") -> true
```

### 难度
Easy

### 方法
遍历2个字符串，索引分别为`i`, `j`，如果`ransomNote[i] == magazine[j]`，则`i++`, `j++`，否则`j++`。如果`i == len(ransomNote)`，则表示能够用`magazine`的字符组成`ransomNote`，否则则不能

### python代码
```python
class Solution(object):
    def canConstruct(self, ransomNote, magazine):
        ransomNote = sorted(ransomNote)
        magazine = sorted(magazine)

        i = 0
        j = 0
        while i < len(ransomNote) and j < len(magazine):
            if ransomNote[i] == magazine[j]:
                j += 1
                i += 1
            else:
                j += 1
   
        if i == len(ransomNote):
            return True
        return False

assert Solution().canConstruct("a", "b") == False
assert Solution().canConstruct("aa", "ab") == False
assert Solution().canConstruct("aa", "aab") == True
assert Solution().canConstruct("djfjfhjf", "aaigcbiafifghhdihcfdjjej") == True
```