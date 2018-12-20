---
title: '[LeetCode]447. Number of Boomerangs'
date: 2017-08-16 11:02:21
tags: LeetCode
---

### 题目
Given `n` points in the plane that are all pairwise distinct, a "boomerang" is a tuple of points `(i, j, k)` such that the distance between `i` and `j` equals the distance between `i` and `k` **(the order of the tuple matters).**

Find the number of boomerangs. You may assume that n will be at most 500 and coordinates of points are all in the range **[-10000, 10000]** (inclusive).

**Example:**
```
Input:
[[0,0],[1,0],[2,0]]

Output:
2

Explanation:
The two boomerangs are [[1,0],[0,0],[2,0]] and [[1,0],[2,0],[0,0]]
```

### 难度
Easy

### 方法
对于每个`point`，用一个`map`统计各个距离`d`下对应的其他`point`的个数`n`，即`map`的`key`为距离`d`，`value`为距离该`point`为`d`的其他`point`的个数`n`。然后`An`取`2`，即`n*(n-1)`。最后将各个`point`对应的`n*(n-1)`累加即可

### python代码
```python
class Solution(object):
    def numberOfBoomerangs(self, points):
        """
        :type points: List[List[int]]
        :rtype: int
        """
        result = 0
        for point_i in points:
            distance_map = {}
            for point_j in points:
                distance = (point_i[0] - point_j[0]) * (point_i[0] - point_j[0]) + \
                           (point_i[1] - point_j[1]) * (point_i[1] - point_j[1])
                distance_map[distance] = distance_map.get(distance, 0) + 1

            for distance in distance_map:
                count = distance_map[distance]
                result += count * (count - 1)

        return result

assert Solution().numberOfBoomerangs([[0,0], [1,0], [2,0]]) == 2
```