---
title: '[LeetCode]455. Assign Cookies'
date: 2017-08-01 15:17:56
tags: LeetCode
---

### 题目
Assume you are an awesome parent and want to give your children some cookies. But, you should give each child at most one cookie. Each child i has a greed factor gi, which is the minimum size of a cookie that the child will be content with; and each cookie j has a size s~j~. If s~j~ >= g~i~, we can assign the cookie j to the child i, and the child i will be content. Your goal is to maximize the number of your content children and output the maximum number.

**Note:**
You may assume the greed factor is always positive. 
You cannot assign more than one cookie to one child.

**Example 1:**
```
Input: [1,2,3], [1,1]

Output: 1

Explanation: You have 3 children and 2 cookies. The greed factors of 3 children are 1, 2, 3. 
And even though you have 2 cookies, since their size is both 1, 
you could only make the child whose greed factor is 1 content.
You need to output 1.
```

**Example 2:**
```
Input: [1,2], [1,2,3]

Output: 2

Explanation: You have 2 children and 3 cookies. The greed factors of 2 children are 1, 2. 
You have 3 cookies and their sizes are big enough to gratify all of the children, 
You need to output 2.
```

### 难度
Easy

### 方法
首先对`s`和`g`排序，如果`s~j~=gi`，则`content_count++,j++,i++`；否则`j++`，直到`s~j~>=g~i~`。注意`i`和`j`边界的处理

### python代码
```python
class Solution(object):
    def findContentChildren(self, g, s):
        """
        :type g: List[int]
        :type s: List[int]
        :rtype: int
        """
        g = sorted(g)
        s = sorted(s)
        i = 0
        content_count = 0
        for greed in g:
            while i < len(s):
                if s[i] >= greed:
                    content_count += 1
                    i += 1
                    break
                i += 1
            else:
                break

        return content_count

assert Solution().findContentChildren([1, 2 ,3], [1, 1]) == 1
assert Solution().findContentChildren([1, 2], [1, 2, 3]) == 2
assert Solution().findContentChildren([1, 2, 3], []) == 0
assert Solution().findContentChildren([10, 9, 8, 7], [5, 6, 7, 8]) == 2
assert Solution().findContentChildren([1, 2, 3], [3]) == 1
```