---
title: mysql 'No DataSource Set'解决办法
tags:
  - mysql
  - error
  - jdbc
  - springboot
  - java
abbrlink: 202678719
toc: true
categories:
  - 工作
date: 2022-10-10 14:38:01
---

mysql 8.0.13开始，使用sslMode属性代替了原来的useSSL属性， 所以把`useSSL=true`改成`sslMode=DISABLED` 或者添加`allowPublicKeyRetrieval=true`
