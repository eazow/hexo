title: '[LeetCode]1. Two Sum'
tags:
  - LeetCode
categories: []
date: 2016-06-02 18:03:00
---

> Given an array of integers, return **indices** of the two numbers such that they add up to a specific target.

> You may assume that each input would have ***exactly*** one solution.

> **Example:**
```
Given nums = [2, 7, 11, 15], target = 9,
Because nums[0] + nums[1] = 2 + 7 = 9,
return [0, 1].
```

#### 方法
对数组排序后，第一个数字从数组开始遍历，二分查找满足条件的第二个数字，返回2个数字的位置。
由于排序导致数字位置发生了变换，因此需要一个数组记录变化后第i个数字之前的位置numsLocation[i]。

#### C代码
``` c
#include <assert.h>
#include <stdlib.h>

int* sort(int* nums, int numsSize) {
    int *numsLocations = (int *)malloc(sizeof(int) * numsSize);
    int i = 0, j = 0;
    for(i = 0; i < numsSize; i++)
        numsLocations[i] = i;

    for(i = 0; i < numsSize; i++) {
        int sorted = 1;
        for(j = 0; j < numsSize-1; j++) {
            if(nums[j] > nums[j+1]) {
                int temp = nums[j];
                nums[j] = nums[j+1];
                nums[j+1] = temp;
                sorted = 0;
                temp = numsLocations[j];
                numsLocations[j] = numsLocations[j+1];
                numsLocations[j+1] = temp;
            }
        }
        if(sorted)
            break;
    }
    return numsLocations;
}

int find(int* nums, int num, int start, int end) {
    if(start > end)
        return -1;
    int i = (start+end)/2;
    if(num > nums[i])
        return find(nums, num, i+1, end);
    else if(num < nums[i])
        return find(nums, num, start, i-1);
    return i;
}

/**
 * Note: The returned array must be malloced, assume caller calls free().
 */
int* twoSum(int* nums, int numsSize, int target) {
    int *numsLocations = sort(nums, numsSize);
    int i = 0;
    int num;
    int *locations = (int *)malloc(sizeof(int) * 2);
    int j;
    for(i = 0; i < numsSize; i++) {
        num = nums[i];
        if((j=find(nums, target-num, i+1, numsSize-1)) >= 0) {
            locations[1] = numsLocations[j];
            locations[0] = numsLocations[i];
            return locations;
        }
    }
    return NULL;
}

int main() {
    int nums[4] = {2, 7, 11, 15};
    int *locations = twoSum(nums, 4, 9);
    assert(locations[0] == 0);
    assert(locations[1] == 1);

    int nums2[3] = {5, 75, 25};
    locations = twoSum(nums2, 3, 100);
    assert(locations[0] == 2);
    assert(locations[1] == 1);

    return 0;
}
```