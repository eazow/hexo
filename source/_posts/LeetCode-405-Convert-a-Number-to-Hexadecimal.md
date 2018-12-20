---
title: '[LeetCode]405. Convert a Number to Hexadecimal'
date: 2017-09-02 16:44:55
tags: LeetCode
---

### 题目
Given an integer, write an algorithm to convert it to hexadecimal. For negative integer, [two’s complement](https://en.wikipedia.org/wiki/Two%27s_complement) method is used.
**Note:**
1. All letters in hexadecimal (a-f) must be in lowercase.
2. The hexadecimal string must not contain extra leading 0s. If the number is zero, it is represented by a single zero character '0'; otherwise, the first character in the hexadecimal string will not be the zero character.
3. The given number is guaranteed to fit within the range of a 32-bit signed integer.
4. You **must not use *any* method provided by the library** which converts/formats the number to hex directly.

**Example 1:**
```
Input:
26
Output:
"1a"
```

**Example 2:**
```
Input:
-1
Output:
"ffffffff"
```

### 难度
Easy

### 方法
对于`num`，每次`num&15`便可取到最右的4个bit位，然后`num>>4`循环处理即可将`num`转换为16进制。因为`num`范围为32bit位，因此最多右移8次，每次右移`4`个bit位。当`num`不为`0`时，转换为16进制后，前面有`0`需去除。

### python代码
```python
class Solution(object):
    def toHex(self, num):
        """
        :type num: int
        :rtype: str
        """
        if num == 0:
            return "0"
        map = ["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f"]
        hex = ""
        for i in range(8):
            hex = map[num & 0xf] + hex
            num = num >> 4

        return hex.lstrip("0")

assert Solution().toHex(-1) == "ffffffff"
assert Solution().toHex(26) == "1a"
```