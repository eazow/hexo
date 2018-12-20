---
title: '[LeetCode]401. Binary Watch'
date: 2017-08-17 11:36:40
tags: LeetCode
---

### 题目
A binary watch has 4 LEDs on the top which represent the **hours** (**0-11**), and the 6 LEDs on the bottom represent the **minutes** (**0-59**).
Each LED represents a zero or one, with the least significant bit on the right.
![](http://upload-images.jianshu.io/upload_images/1425939-95b4dcdac5372438.jpg?imageMogr2/auto-orient/strip%7CimageView2/2/w/320)
For example, the above binary watch reads "3:25".
Given a non-negative integer *n* which represents the number of LEDs that are currently on, return all possible times the watch could represent.
**Example:**
```
Input: n = 1
Return: ["1:00", "2:00", "4:00", "8:00", "0:01", "0:02", "0:04", "0:08", "0:16", "0:32"]
```
**Note:**
* The order of output does not matter.
* The hour must not contain a leading zero, for example "01:00" is not valid, it should be "1:00".
* The minute must be consist of two digits and may contain a leading zero, for example "10:2" is not valid, it should be "10:02".

### 难度
Easy

### 方法
遍历所有可能的时间，如果其中1的个数等于n，则将该时间加入返回的结果列表中

### python代码
```python
class Solution(object):
    def readBinaryWatch(self, num):
        """
        :type num: int
        :rtype: List[str]
        """
        result = []
        for i in range(12):
            for j in range(60):
                if bin(i).count("1") + bin(j).count("1") == num:
                    result.append("%d:%02d" % (i, j))
        return result

assert Solution().readBinaryWatch(1) == ["0:01", "0:02", "0:04", "0:08", "0:16", "0:32", "1:00", "2:00", "4:00", "8:00"]
```