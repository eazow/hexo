---
title: '[LeetCode]657. Judge Route Circle'
date: 2017-09-06 17:31:51
tags: LeetCode
---

### 题目
Initially, there is a Robot at position (0, 0). Given a sequence of its moves, judge if this robot makes a circle, which means it moves back to **the original place**.

The move sequence is represented by a string. And each move is represent by a character. The valid robot moves are `R`(Right), `L`(Left), `U`(Up) and `D`(down). The output should be true or false representing whether the robot makes a circle.

**Example 1:**
```
Input: "UD"
Output: true
```
**Example 2:**
```
Input: "LL"
Output: false
```

### 难度
Easy

### 方法
对每个方向计数，如果`L`出现的次数==`R`出现的次数，并且`U`出现的次数==`D`出现的次数，则robot会回到初始位置，返回`True`；否则返回`False`

### python代码
```python
class Solution(object):
    def judgeCircle(self, moves):
        """
        :type moves: str
        :rtype: bool
        """
        counter = {}
        for c in moves:
            counter[c] = counter.get(c, 0) + 1

        return counter.get("L") == counter.get("R") and counter.get("U") == counter.get("D")

assert Solution().judgeCircle("UD") == True
assert Solution().judgeCircle("LL") == False
```