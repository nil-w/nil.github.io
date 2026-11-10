---
title: mybatis动态查询实现
description: mybatis动态查询实现
category: mybatis
tags:
  - mybatis
  - mysql
  - api
abbrlink: b6474c33
date: 2018-10-30 00:00:00
---

model Product，我们希望通过实现 service 的一个方法，并支持所有类型的查询，如 >、>=、<、<=、like 、order by 等常用的查询、排序。

<!--more-->

```java
class Product {
    long id;
    String name;
    String category;
    String price;
    String ...;
}
```

## 分析:

```sql
select * from product
where id > 1 or price > '100.00' ...;
```

Where 条件中包含 字段名称、运算符、值。

```java
/**
* 查询类型
* lt 小于
* lte 小于等于
* gt 大于
* gte 大于等于
* slike 'value%' start_with
* elike '%value' end_with
* like '%value%'
* in 1,2,3,4,5
*/
class Item {
    String name; //字段名称
    String value; //值
    String itemType; //查询类型
    String type = "and"; // 逻辑运算 and or
    String[] values; //如果是in查询转换为字符串数组
}
```

以上是对查询条件的简单封装,如果我们需要满足多个条件的话。

```java
class QueryParam{
    List<Item> items = null;
}
```

mybatis 公共 xml 文件配置

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd" >
<mapper namespace="BaseMapper">
    <sql id="BaseQuery">
        <if test="items != null ">
            where 1 = 1
            <foreach collection="items" item="item" index="index"
                     separator=" ">
                <if test="item.itemType == 'eq' ">
                    ${item.type} ${item.fieldName} = #{item.value}
                </if>
                <if test="item.itemType == 'lt' ">
                    <![CDATA[  ${item.type}  ${item.name} < #{item.value} ]]>
                </if>
                <if test="item.itemType == 'lte' ">
                    <![CDATA[ ${item.type}  ${item.name} <= #{item.value} ]]>
                </if>
                <if test="item.itemType == 'gt' ">
                    <![CDATA[  ${item.type}  ${item.name} > #{item.value} ]]>
                </if>
                <if test="item.itemType == 'gte' ">
                    <![CDATA[  ${item.type}  ${item.name} >= #{item.value} ]]>
                </if>
                <if test="item.itemType == 'slike' ">
                    <![CDATA[  ${item.type}  ${item.name} like '${item.value}%' ]]>
                </if>
                <if test="item.typeitemType == 'elike' ">
                    <![CDATA[  ${item.type}  ${item.name} like '%${item.value}' ]]>
                </if>
                <if test="item.itemType == 'like' ">
                    <![CDATA[  AND ${item.name} like '%${item.value}%' ]]>
                </if>
                <if test="item.itemType == 'in' ">
                    ${item.type}
                    <foreach collection="item.values" item="value" index="index" open="(" close=")" separator="OR">
                        ${item.name} =  #{value}
                    </foreach>
                </if>
            </foreach>
        </if>
    </sql>
</mapper>
```

Product mapper.xml

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd" >
<mapper namespace="com.yqwoe.codegenerator.dao.ProductMapper" >
  <resultMap id="BaseResultMap" type="com.yqwoe.codegenerator.model.Product" >
    <id column="u_id" property="uId" jdbcType="VARCHAR" />
      <!--省略 -->
  </resultMap>
  <sql id="Base_Column_List" >
    id, name, category, price ,.....
  </sql>
  <select id="selectAll" resultMap="BaseResultMap" parameterType="com.yqwoe.model.param.QueryParam">
    select
    <include refid="Base_Column_List" />
    from s_user
    <include refid="BaseMapper.BaseQuery"/>
    <include refid="BaseMapper.BaseOrder" />
  </select>
</mapper>
```

ProductController

```java
class ProductController{
    ProductService productService;

    @GetMapping("/products")
    public Pageinfo index(QueryParam param){
        return productService.selectAll(param);
    }
}
```

### 演示

```
api: http://localhost:8000/products?items[0].name=name&items[0].value=nil?,超级管理员&items[0].itemType=in

sql: select * from product where 1 = 1 and (name = 'nil?' OR name = '超级管理员')

//type 默认为 and
response:
{
    data:[
        ....
    ]
}
```

以上为动态查询，照这样的思路，可以继续围绕 mapper 扩展排序或者更复杂的查询。
