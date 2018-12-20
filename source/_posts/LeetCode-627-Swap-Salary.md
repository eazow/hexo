---
title: '[LeetCode]627. Swap Salary'
date: 2017-07-29 14:49:57
tags: LeetCode
---

##### 题目
Given a table `salary`, such as the one below, that has m=male and f=female values. Swap all f and m values (i.e., change all f values to m and vice versa) with a single update query and no intermediate temp table.
 
For example:
```
| id | name | sex | salary |
|----|------|-----|--------|
| 1  | A    | m   | 2500   |
| 2  | B    | f   | 1500   |
| 3  | C    | m   | 5500   |
| 4  | D    | f   | 500    |
```
After running your query, the above salary table should have the following rows:
```
| id | name | sex | salary |
|----|------|-----|--------|
| 1  | A    | f   | 2500   |
| 2  | B    | m   | 1500   |
| 3  | C    | f   | 5500   |
| 4  | D    | m   | 500    |
```

##### 难度
Easy

##### 方法
需要用到sql里的if

##### sql
```sql
# Write your MySQL query statement below
update salary set sex = if(sex='m', 'f', 'm')
```