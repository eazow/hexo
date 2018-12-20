---
title: '[LeetCode]599. Minimum Index Sum of Two lists'
date: 2017-07-26 12:05:16
tags: LeetCode
---

##### 题目
> Suppose Andy and Doris want to choose a restaurant for dinner, and they both have a list of favorite restaurants represented by strings.

> You need to help them find out their **common interest** with the **least list index sum**. If there is a choice tie between answers, output all of them with no order requirement. You could assume there always exists an answer.

> **Example 1:**
```
Input:
["Shogun", "Tapioca Express", "Burger King", "KFC"]
["Piatti", "The Grill at Torrey Pines", "Hungry Hunter Steakhouse", "Shogun"]
Output: ["Shogun"]
Explanation: The only restaurant they both like is "Shogun".
```
> **Example 2:**
```
Input:
["Shogun", "Tapioca Express", "Burger King", "KFC"]
["KFC", "Shogun", "Burger King"]
Output: ["Shogun"]
Explanation: The restaurant they both like and have the least index sum is "Shogun" with index sum 1 (0+1).
```
> **Note:**
1. The length of both lists will be in the range of [1, 1000].
2. The length of strings in both lists will be in the range of [1, 30].
3. The index is starting from 0 to the list length minus 1.
4. No duplicates in both lists.

##### 难度
Easy

##### 方法
用`minSum`保存最小的索引和，用一个`dict`记录`list1`中每个单词对应的索引序号。遍历`list2`，将值存入`word`中，计算`word`在`list1`和`list2`中的索引和，如果小于`minSum`，则替换`minSum`，并清空结果`list`，加入该`word`，如果`==minSum`，则直接加入`word`

##### python代码
```python
import sys

class Solution(object):
    def findRestaurant(self, list1, list2):
        """
        :type list1: List[str]
        :type list2: List[str]
        :rtype: List[str]
        """
        list1Map = {}
        i = 0
        for word in list1:
            list1Map[word] = i
            i += 1

        minSum = sys.maxint
        i = 0
        restaurants = [] 
        for word in list2:
            if word in list1Map:
                if minSum > list1Map[word]+i:
                    print minSum
                    minSum = list1Map[word]+i
                    restaurants = []
                    restaurants.append(word)
                elif minSum == list1Map[word]+i:
                    restaurants.append(word)
            i += 1

        return restaurants

assert Solution().findRestaurant(["Shogun", "Tapioca Express", "Burger King", "KFC"], 
    ["Piatti", "The Grill at Torrey Pines", "Hungry Hunter Steakhouse", "Shogun"]) == ["Shogun"]
assert Solution().findRestaurant(["Shogun", "Tapioca Express", "Burger King", "KFC"], 
    ["KFC", "Shogun", "Burger King"]) == ["Shogun"]
assert Solution().findRestaurant(["Shogun","Tapioca Express","Burger King","KFC"], 
    ["KFC","Burger King","Tapioca Express","Shogun"]) == ["KFC","Burger King","Tapioca Express","Shogun"]
```