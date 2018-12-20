---
title: '[LeetCode]377. Combination Sum IV'
date: 2016-08-12 19:03:49
tags: LeetCode
---

> Given an integer array with all positive numbers and no duplicates, find the number of possible combinations that add up to a positive integer target.

> **Example:**
> 
```
nums = [1, 2, 3]
target = 4
The possible combination ways are:
(1, 1, 1, 1)
(1, 1, 2)
(1, 2, 1)
(1, 3)
(2, 1, 1)
(2, 2)
(3, 1)
Note that different sequences are counted as different combinations.
Therefore the output is 7.
```

##### 思路
假设给定的`nums`为`num1, num2...numn`，用`results[i]`表示组成i的组合个数，如果i>=numj, 那么
```c
results[i] = results[i-num1]+results[i-num2]+...results[i-numj]
```
从0开始计算至target，就能获得target的组合个数

##### C代码
里面递归的方法会超时，因此被注释掉
```c
#include <assert.h>
#include <stdlib.h>

/**
int combinationSum4(int* nums, int numsSize, int target) {
    if(target == 0)
        return 1;
    int i = 0;
    int result = 0;
    for(i = 0; i < numsSize; i++) {
        if(target >= nums[i])
            result += combinationSum4(nums, numsSize, target-nums[i]);
    }
    return result;
}
*/

int combinationSum4(int* nums, int numsSize, int target) {
    int* results = (int *)malloc(sizeof(int) * (target+1));
    int i = 0;
    int j = 0;
    results [0] = 1;
    for(i = 1; i <= target; i++)
        results[i] = 0;
    for(i = 0; i <= target; i++) {
        for(j = 0; j < numsSize; j++) {
            if(i >= nums[j])
                results[i] += results[i-nums[j]];
        }
    }
    return results[target];
}
int main() {
    int nums[3] = {1,2,3};
    assert(combinationSum4(nums, 3, 4) == 7);

    return 0;
}
```