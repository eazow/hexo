---
title: '[LeetCode]338. Counting Bits'
date: 2016-06-03 14:55:49
tags: LeetCode
---

> Given a non negative integer number **num**. For every numbers **i** in the range **0 ≤ i ≤ num** calculate the number of 1's in their binary representation and return them as an array.

> **Example:**For `num = 5`, you should return `[0,1,1,2,1,2]`.

#### 题目
给定一个非负整数num，计算出从0到num的每个数的二进制中包含1的个数

#### 方法
对于数字n，它二进制表示形式中1的个数`bits[n] = bits[n>>1]+n&1`

#### c代码
```c
#include <assert.h>
#include <stdlib.h>

/**
 * Return an array of size *returnSize.
 * Note: The returned array must be malloced, assume caller calls free().
 */
int* countBits(int num, int* returnSize) {
    int i = 0;
    int* bits = (int *)malloc(sizeof(int) * (num+1));
    bits[0] = 0;
    for(i = 0; i <= num; i++) {
        bits[i] = bits[i>>1] + (i&1);
    }
    *returnSize = num+1;
    return bits;
}

int main() {
    int returnSize = 0;
    int* bits = countBits(5, &returnSize);
    assert(bits[0] == 0);
    assert(bits[1] == 1);
    assert(bits[2] == 1);
    assert(bits[3] == 2);
    assert(bits[4] == 1);
    assert(bits[5] == 2);
    assert(returnSize == 6);

    return 0;
}
```