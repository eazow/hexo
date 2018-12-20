---
title: '[LeetCode]201. Bitwise AND of Numbers Range'
date: 2016-09-09 14:12:37
tags: LeetCode
---

> Given a range [m, n] where 0 <= m <= n <= 2147483647, return the bitwise AND of all numbers in this range, inclusive.

> For example, given the range [5, 7], you should return 4.

##### 方法
直接对所有数按位与，会超时，因此只能采用别的方法。
对于`[1,3]`, 对应二进制位`01,010,011`，按位与为0；对于`[5,7]`，对应二进制为`0101,0110,0111`，按位与为`0100`。
对于`[m,n]`，如果`m!=n`，那么m和n最右一位按位与必然为0；同时将m,n都右移一位，用bits记录移位数，如果`m!=n`，继续将m,n右移一位。最后`m==n`时，将`m<<bits`位即可，此时m可以为0或为其他值。如果m为0，n也为0,那么m和n的位数并不相同，因此结果为0；如果m不为0，那么m和n前几位必然相同，用`m<<bits`就可以得到最后结果。

##### C代码
```c
#include <assert.h>

int rangeBitwiseAnd(int m, int n) {
    int bits = 0;
    while(m != n) {
        m >>= 1;
        n >>= 1;
        bits++;
    }
    return m<<bits;
}

/**
int rangeBitwiseAnd(int m, int n) {
    int bitwiseAnd = m;
    while(m <= n) {
        bitwiseAnd &= m;
        m++;
    }
    return bitwiseAnd;
}
*/

int main() {
    assert(rangeBitwiseAnd(5,7) == 4);
    assert(rangeBitwiseAnd(1,3) == 0);

    return 0;
}
```