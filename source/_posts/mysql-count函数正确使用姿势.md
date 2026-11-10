---
title: mysql count函数正确使用姿势
abbrlink: 9f600c63
tags:
  - mysql
  - count
  - 聚合函数
  - InnoDB
  - MyISAM
  - mybatis
toc: true
categories:
  - 工作
date: 2024-01-09 15:38:00
---

&emsp;&emsp;`count()` 是`mysql`聚合函数，返回指定匹配条件的行数。开发中常用来统计表中数据，全部数据，不为null数据，或者去重数据。

<!--more-->

```sql
-- 统计表中数据包括null
select count(1) from zs_access_log;

-- 统计表中数据包括null
select count(*) from zs_access_log;

-- 统计表中指定列不为null的数据
select count(id) from zs_access_log;

-- 统计表中指定列去重不为null的数据
select count(distinct id) from zs_access_log;
```

# 1. 背景
&emsp;&emsp;生产环境使用 `mysql: 8.0.18 Innodb`，  `mybatis`分页查询由两次查询完成，第一次获取总的记录行数，再次获取具体分页数据。
&emsp;&emsp;以下查询可以看到`count`是存在性能问题的，接口的响应`> 800ms`  `< 4s`，但是该如何优化呢？

```bash
mysql> select count(*) from zs_access_log;
+----------+
| count(*) |
+----------+
|    37485 |
+----------+
1 row in set (0.53 sec)

mysql> select * from zs_access_log  limit 0,10;
10 rows in set (0.00 sec)

```


# 2. count性能对比
​		对比 `count` 几种使用姿势，在`InnoDB`和`MyISAM`引擎的性能对比。
```bash
mysql> show engines;
+--------------------+---------+----------------------------------------------------------------+--------------+------+------------+
| Engine             | Support | Comment                                                        | Transactions | XA   | Savepoints |
+--------------------+---------+----------------------------------------------------------------+--------------+------+------------+
| FEDERATED          | NO      | Federated MySQL storage engine                                 | NULL         | NULL | NULL       |
| MEMORY             | YES     | Hash based, stored in memory, useful for temporary tables      | NO           | NO   | NO         |
| InnoDB             | DEFAULT | Supports transactions, row-level locking, and foreign keys     | YES          | YES  | YES        |
| PERFORMANCE_SCHEMA | YES     | Performance Schema                                             | NO           | NO   | NO         |
| MyISAM             | YES     | MyISAM storage engine                                          | NO           | NO   | NO         |
| MRG_MYISAM         | YES     | Collection of identical MyISAM tables                          | NO           | NO   | NO         |
| BLACKHOLE          | YES     | /dev/null storage engine (anything you write to it disappears) | NO           | NO   | NO         |
| CSV                | YES     | CSV storage engine                                             | NO           | NO   | NO         |
| ARCHIVE            | YES     | Archive storage engine                                         | NO           | NO   | NO         |
+--------------------+---------+----------------------------------------------------------------+--------------+------+------------+
9 rows in set (0.00 sec)
```

​		数据表 `zs_access_log` 和 `zs_access_log_myisam`

```bash
mysql> select TABLE_NAME , ENGINE from information_schema.tables where TABLE_SCHEMA = 'unified-form' and TABLE_NAME like '%zs_access%';
+----------------------+--------+
| TABLE_NAME           | ENGINE |
+----------------------+--------+
| zs_access_log        | InnoDB |
| zs_access_log_myisam | MyISAM |
+----------------------+--------+
2 rows in set (0.00 sec)
```


## 2.1 InnoDB


### 2.1.1 count(1)

```bash
mysql> select count(1) from zs_access_log;
+----------+
| count(1) |
+----------+
|    37485 |
+----------+
1 row in set (0.53 sec)
```
### 2.1.2 count(*)

```bash
mysql> select count(*) from zs_access_log;
+----------+
| count(*) |
+----------+
|    37485 |
+----------+
1 row in set (0.52 sec)
```

### 2.1.3 count(column)

```bash
mysql> select count(id) from zs_access_log;
+-----------+
| count(id) |
+-----------+
|     37485 |
+-----------+
1 row in set (0.50 sec)
```
​		数据表明以上几种方式查询效率相差无几，为什么会出现这样的问题呢？


## 2.2 MyISAM

### 2.1.1 count(1)

```bash
mysql> select count(1) from zs_access_log_myisam;
+----------+
| count(1) |
+----------+
|    37485 |
+----------+
1 row in set (0.00 sec)
```
### 2.1.2 count(*)

```bash
mysql> select count(*) from zs_access_log_myisam;
+----------+
| count(*) |
+----------+
|    37485 |
+----------+
1 row in set (0.00 sec)
```

### 2.1.3 count(column)

```bash
mysql> select count(id) from zs_access_log_myisam;
+-----------+
| count(id) |
+-----------+
|     37485 |
+-----------+
1 row in set (0.00 sec)
```
​		数据表明以上几种方式在`InnoDB`和`MyISAM`引擎中，查询效率差别很大。

​		`MyISAM`把总行数存在磁盘(`information_schema.partitions`)中，`count(*)`和`count(1)`的性能会好很多。

​		`InnoDB`获取所有数据，并逐行计算总行数，`count(*)`和`count(1)`的性能会差很多。`

[mysql文档原文](https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_count)


# 3. 性能优化

​		在实际开发过程中，业务系统的数据表均使用`InnoDB`支持事务。

​		该如何优化`InnoDB`中`count`的性能？

* 使用`redis`记录数据行数

* 使用除了`主键`以外索引列

  ```bash
  mysql> select count(id) from zs_access_log;
  +-----------+
  | count(id) |
  +-----------+
  |     37485 |
  +-----------+
  1 row in set (0.54 sec)
  
  mysql> select count(action) from zs_access_log;
  +---------------+
  | count(action) |
  +---------------+
  |         37485 |
  +---------------+
  1 row in set (0.01 sec)
  
  ```



