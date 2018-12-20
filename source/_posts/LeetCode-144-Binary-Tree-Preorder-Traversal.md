title: '[LeetCode]144. Binary Tree Preorder Traversal'
date: 2016-06-03 17:41:06
tags: LeetCode
---

> Given a binary tree, return the *preorder* traversal of its nodes' values.

> For example:
> Given binary tree `{1,#,2,3}`,
```
  1 
   \
    2
   / 
  3
```
> return `[1,2,3]`.

> **Note:** Recursive solution is trivial, could you do it iteratively?

##### 方法
前序遍历二叉树，不用递归的方法，就需要借助栈了。
首先将root入栈，然后取出，先将**右子节点**压入栈，再讲**左子节点**压入栈。然后取出栈的节点，压入该节点的右、左子节点，循环直到栈为空即可。

##### c代码
```c
#include <assert.h>
#include <stdlib.h>

struct TreeNode {
    int val;
    struct TreeNode* left;
    struct TreeNode* right;
};

/**
 * Return an array of size *returnSize.
 * Note: The returned array must be malloced, assume caller calls free().
 */
int* preorderTraversal(struct TreeNode* root, int* returnSize) {
    if(root == NULL)
        return NULL;

    int *vals = (int *)malloc(sizeof(int) * 1000);
    int valsTop = 0;
    struct TreeNode* node = root;
    struct TreeNode** nodes = (struct TreeNode **)malloc(sizeof(struct TreeNode *) * 1000);
    int nodesTop = 0;
    nodes[nodesTop++] = root;

    while(nodesTop > 0) {
        node = nodes[--nodesTop];
        vals[valsTop++] = node->val;

        if(node->right)
            nodes[nodesTop++] = node->right;
        if(node->left)
            nodes[nodesTop++] = node->left;
    }
    *returnSize = valsTop;
    return vals;
}

int main() {
    struct TreeNode* root = (struct TreeNode *)malloc(sizeof(struct TreeNode));
    root->val = 1;
    struct TreeNode* node1_2 = (struct TreeNode *)malloc(sizeof(struct TreeNode));
    node1_2->val = 2;
    root->left = NULL;
    root->right = node1_2;
    struct TreeNode* node2_3 = (struct TreeNode *)malloc(sizeof(struct TreeNode));
    node2_3->val = 3;
    node1_2->left = node2_3;
    node1_2->right = NULL;
    node2_3->left = NULL;
    node2_3->right = NULL;

    int returnSize = 0;
    int* vals = preorderTraversal(root, &returnSize);
    assert(returnSize == 3);
    assert(vals[0] == 1);
    assert(vals[1] == 2);
    assert(vals[2] == 3);

    return 0;
}
```