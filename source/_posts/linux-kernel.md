---
title: 编译Linux内核增加系统调用
date: 2008-02-29 18:50:36
tags: Linux
categories: Linux
---

折腾了差不多一、两天，终于通过虚拟机在Ubuntu下完成了通过编译内核，增加系统调用的实验，在此与大家分享一下，希望能够对看到的xdjm们或多或少地提供些帮助！

期间我换了几个内核版本，make了几次，浪费了大量的时间，主要还是对里面的文件不了解，找不到网上说的文件就很郁闷，甚至有些烦躁，最后换了个有同学成功的版本，终于坚持下来完成了！

其中make modules很费时间，而且用的是虚拟机，那就更慢了，估计2小时左右吧，当然这两小时也不闲着，外面阳光灿烂，出去好好的打了几次球 ^_^，劳逸结合！正当我打累了回来它差不多就好了，Ubuntu真给面子啊！



我用的 Ubuntu 7.10 ，编译的内核版本是2.6.23.12(更多版本可以到[http://www.kernel.org](http://www.kernel.org/)去下载)


#### 内核解压
将内核包解压到/usr/src下:

```
$ tar jvxf linux-2.6.23.12.tar.gz2
``` 
或者是
```
$ tar zxvf linux-2.6.23.12.tar.gz
```

##### 增加系统调用
修改sys.c
```
$ cd /usr/src/linux-2.6.23.12
$ vim kernel/sys.c
```

添加一个简单的调用
```c
asmlinkage int sys_mysyscall(int num) {
    printk("hello");
    return num;
}
```

修改系统调用表，syscall_table.S：
```
$ cd /usr/src/linux-2.6.23.12/arch/i386/kernel
//（没有i386文件夹的版本的貌似是进x86）
$ vim syscall_table.S
```
在最后加上
```
.long sys_mysyscall
```


增加新系统调用号，修改/usr/include/asm-i386/unisted.h, 添加

```
#define _ _NR_mysyscall 325
```

修改/usr/src/linux-2.6.23.12/include/asm-i386/unistd.h
添加`#define _ _NR_mysyscall 325`, 并将里面的 `#define NR_syscall 325`改为326, 增加更多的系统调用依此类推

开始编译内核了
```
$ cd /usr/src/linux-2.6.23.12
$ make menuconfig
$ make bzImage
$ make modules
$ make modules_install
$ cp arch/i386/boot/bzImage /boot/vmlinuz-2.6.23.12 $ mkinitramfs -o initrd.img-2.6.23.12 2.6.23.12
```
/lib/modules会多出2.6.23.12这个文件夹

修改grub：

第5步后/boot 下会多出两个文件 vmlinuz-2.6.23.12 initrd.img-2.6.23.12 
修改`/boot/grub/menu.lst`, 没有menu.lst可能会是grub.conf
仿照里面的格式
```
title Ubuntu 7.10, kernel 2.6.22-14-generic
root (hd0,0)
kernel /boot/vmlinuz-2.6.22-14-generic root=UUID=e2478f9d-7f5d-458f-b017-43458a8f62ea ro quiet
splash
initrd /boot/initrd.img-2.6.22-14-generic 
quiet
```
添加
```
title Ubuntu 7.10, kernel 2.6.23-12
root (hd0,0) 
kernel /boot/vmlinuz-2.6.23.12 root=UUID=e2478f9d-7f5d-458f-b017-43458a8f62ea ro quiet
splash 
initrd /boot/initrd-2.6.23.12.img
quiet
```
将hiddenmenu注释掉 即#hiddenmenu

重启，导入新的内核，测试，新建test.c

```
#include <linux/unistd.h>
#include <stdio.h>
#include <asm/unistd.h>

#define __NR_mycall     325 
#define __NR_myfilecopy     326    //增加的拷贝文件的系统调用

int main()
{ 
    syscall(325, 6);    //6为系统调用的参数，多参数的类推
    return 1;
}
```

最后，预祝你们圆满成功！！