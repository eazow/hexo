---
title: 在Github上用Hexo搭建个人Blog
date: 2016-03-25 10:01:06
tags: Hexo
---

#### 1. 在github上创建名称为username.github.io仓库

#### 2. 将仓库clone到本地
```
$ git clone https://github.com/username/username.github.io
```

#### 3. Hello World
```
$ cd username.github.io
$ echo "Hello World" > index.html
```

#### 4. push
```
$ git add --all
$ git commit -m "Initial commit"
$ git push -u origin master
```

#### 5. 访问username.github.io
这样就能看到Hello World了

#### 6. 将域名映射到username.github.io
```
$ echo "www.yourdomain.com" > CNAME
$ git commit -m "Create CNAME"
$ git push origin master
```
在域名管理添加一条CNAME记录，将www.yourdomain.com指向username.github.io

#### 7. 安装Hexo
##### 7.1 什么是Hexo

> Hexo is a fast, simple and powerful blog framework. You write posts in Markdown (or other languages) and Hexo generates static files with a beautiful theme in seconds.

##### 7.1 安装Git
##### 7.2 安装Node.js
```
$ wget -qO- https://raw.github.com/creationix/nvm/master/install.sh | sh
$ nvm install 4
```
##### 7.3 安装Hexo
```
$ npm install -g hexo-cli
$ hexo init <folder>
$ cd <folder>
$ npm install
$ hexo server
```
这样就可以通过localhost:4000访问了


##### 7.4 直接部署到github
安装hexo-deployer-git
```
$ npm install hexo-deployer-git --save
```

修改_config.yml
```
    deploy:
      type: git
      repo: <repository url>
```

部署到github
```
$ hexo deploy
```

但是部署后会覆盖掉github上的CNAME和README.md，需要在hexo的source目录添加CNAME和README.md，但是执行hexo generate后README.md会生成README.html，因此需要配置下，不让其渲染README.md。
修改Hexo目录下的_config.yml
```
skip_render: README.md
```

然后运行
``` bash
$ hexo g
$ hexo d
```
这样就部署到github上了，并且不会覆盖掉已写好的CNAME和README.md了。

##### 7.5 写blog
```
$ hexo new "Markdown参考"
```
会在`source/_posts/`目录下生成`Markdown参考.md`文件，编辑该文件后
```
$ hexo g
$ hexo d
```

#### 参考
https://github.io
https://hexo.io