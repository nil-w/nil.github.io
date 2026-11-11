---
title: 通用excel导入设计
tags:
  - easyexcel
  - excel
  - import
  - export
  - jdbc
  - replace
  - ignore
  - insert
  - mysql
abbrlink: 7178be5f
toc: true
categories:
  - 工作
date: 2023-04-12 09:44:54
---



## 业务场景:

1. 上传excel按需写入字段；
2. 覆盖更新数据；



<!--more-->





## 设计方案

```mermaid
sequenceDiagram
excel ->> handler: 上传文件,传入对应excel的字段名称、类型、索引
handler ->> execute: insert[插入]\ignore[忽略重复数据]\replace[替换重复数据]
execute ->> insert: 写入数据库
```





## mysql

1. insert into  table ()  select '' from dual where not exsits ()
2. insert ignore into id={IDGenerrate.gernxxx}
3. Insert into on dupli   update  xx=values()





Sql:



1. select id from table where dupKeys = ''
2. insert ignore into  values (id)

3. ignore :  insert into  table ()  select 'xx','x','xx from dual where not exsits ( select id from table where dupKeys = ''')

4. Insert into table ()  select 'x','id' from dual  on dupli   update  xx=values()





```mermaid
classDiagram
class Field{
		Intger index 索引
		String name  字段名
		String type  字段类型
		Object value  字段值
		String exp 校验表达式
}

class Record{
		String tableName 表名
		List fields 字段
}

class ModeEnum{
	INSERT("insert") 写入
	IGNORE("ignore") 忽略重复数据
	REPLACE("replace") 更新重复数据
}

class ExcelUtil{
	+File file excel
	+List:String fields 字段
  +String tableName 数据表名
  +Integer skip 跳过行
  +ModeEnum mode 写入方式
  +List:String dupKeys 用于校验重复的字段
  +RecordHandler recordHandler 数据行处理
	-static importExcel(file,tableName,fields,skip,mode,recordHandler) 导入
	-static exportExcel(response,tableName,fields,skip,mode,recordHandler) 导出
}

class RecordHandler{
	-read(Record) 读取行
}

ExcelUtil --> ModeEnum
ExcelUtil --> Field
ExcelUtil --> Record
ExcelUtil --> RecordHandler
```

