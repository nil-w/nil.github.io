---
title: 搭建maven私库
description: java
tags:
  - java
  - maven
  - docker
abbrlink: 1406322052
toc: true
categories:
  - 工作
date: 2022-08-31 14:46:04
---


# 1. docker 搭建maven私库

<!--more-->



```shell
docker run -d --name nexus -p 8081:8081 -d --restart always -u root --privileged=true -v ~/opt/nexus-data:/nexus-data sonatype/nexus3
```


```text
docker exec -it nexus //进入容器
cd /nexus-data
cat admin.password //复制密码
```

访问 http://ip:8081
修改密码后 admin.password自动删除





# 2. 配置maven私库

#### 2.1添加 role

develop => nx-all

##### 2.2 添加 user

developer => develop





# 3. 插件开发环境配置

#### 3.1 maven/setting.xml配置

```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0 http://maven.apache.org/xsd/settings-1.0.0.xsd">
    <servers>
      <server>
        <id>maven-public-gl</id> <!--对应pom.xml的id=maven-public-gl的仓库-->
        <username>developer</username>
        <password>Glrj@1234</password>
      </server>
      <server>
        <id>maven-releases-gl</id>  <!--对应pom.xml的id=maven-releases-gl的仓库-->
        <username>developer</username>
        <password>Glrj@1234</password>
      </server>
      <server>
        <id>maven-snapshots-gl</id> <!--对应pom.xml中id=maven-snapshots-gl的仓库-->
        <username>developer</username>
        <password>Glrj@1234</password>
      </server>
  </servers>
  <mirrors>
      <mirror> <!--对应pom.xml中id=maven-public-gl的仓库-->
        <id>maven-public-gl</id>
        <mirrorOf>*</mirrorOf>
        <name>GZ Repository Mirror.</name>
        <url>https://nexus.corebrew.net/repository/maven-public/</url>
      </mirror>
    </mirrors>
</settings>

```

#### 3.2 插件项目pom.xml配置

```xml
<?xml version="1.0" encoding="UTF-8"?>

<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>com.yq</groupId>
  <artifactId>low-code</artifactId>
  <packaging>pom</packaging>
  <version>1.0-SNAPSHOT</version>

  <modules>
    <...>
  </modules>

  <name>low-code</name>
  <description>低代码开放平台</description>

	<...>
  <distributionManagement>
    <repository>
      <id>maven-releases-gl</id>
      <url>https://nexus.corebrew.net/repository/maven-releases/</url>
    </repository>
    <snapshotRepository>
      <id>maven-snapshots-gl</id>
      <url>https://nexus.corebrew.net/repository/maven-snapshots/</url>
    </snapshotRepository>
  </distributionManagement>
</project>

```



##### 3.3 项目依赖pom.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>

<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
		<repositories>
        <repository>
            <id>maven-public-gl</id>
            <url>https://nexus.corebrew.net/repository/maven-public/</url>
        </repository>
        <repository>
            <id>aliyun-nexus</id>
            <name>aliyun</name>
            <url>http://maven.aliyun.com/nexus/content/groups/public/</url>
        </repository>
    </repositories>

    <pluginRepositories>
        <pluginRepository>
            <id>aliyun-nexus</id>
            <name>aliyun</name>
            <url>http://maven.aliyun.com/nexus/content/groups/public/</url>
        </pluginRepository>
        <pluginRepository>
            <id>maven-public-gl</id>
            <url>https://nexus.corebrew.net/repository/maven-public/</url>
        </pluginRepository>
    </pluginRepositories>
</project>
```

