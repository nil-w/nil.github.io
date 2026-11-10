---
title: 阿里云mysql外网访问
description: 阿里云 ecs 上安装了 mysql 但是外网访问不了
category: 服务器
tags:
  - aliyun
  - 阿里云
  - mysql
  - ubuntu 14.04
abbrlink: b4b628e2
date: 2018-06-05 00:00:00
---

转载原文评论: [阿里云 ecs 上安装了 mysql 但是外网访问不了](https://segmentfault.com/q/1010000009603559?sort=created)

<!--more-->

1.阿里云 ECS 有安全组防火墙.默认只开了 ICMP,22,3389. 在服务器控制台找到 安全组-配置规则-添加安全组规则

![1950746143-596a46107163e_articlex](/images/1950746143-596a46107163e_articlex.png)

2.如果是用 root 登录 MySQL,在登陆后 use mysql, user 表 root 对应的 localhost 改为%

3.mysql 默认只能自本机访问

```
/etc/mysql/mysql.conf.d/mysqld.cnf
#bind-address = 127.0.0.1

service mysql restart
```

4.检查是不是在监听状态

```
netstat -ntpl |grep 3306
```

5.防火墙是否对 mysql 端口限制,设置防火墙
