---
title: 'gitlab & OKR 进行项目管理 '
tags:
  - gitlab
  - git
  - okr
  - 项目管理
abbrlink: 2050102104
toc: true
categories:
  - 工作
date: 2023-03-28 10:40:36
---

>本文章围绕gitlab 和 OKR，使用gitlab已有功能，进行项目管理、问题追踪和开发流程规范。



<!--more-->



## 需求管理




```mermaid
graph TB
A[需求池] -->|产品/研发共同确认| B[需求分类]
B --> High[高优先级:high] ----C
B --> Medium[普通优先级:medium]----C
B --> Low[低优先级:low]----C
B --> Trivial[微小改动:trivial]----C
C(需求队列)
```



## 版本管理





```mermaid
graph LR
A[个人开发分支:feat]
B[开发分支:dev]
C[测试分支:test]
D[预发布分支:stag]
E[稳定版本分支:realse]
F[hot/fix分支]


subgraph P1 [分支管理流程]
	direction BT
	A-->|合并|B
	B-->|合并|C
	C-->|合并|D
	D-->|合并|E
end
subgraph P2 [紧急修复]

	direction LR
F:::pureRed -.->  B & C & E
end

classDef red fill:#eeaa9c,color:#fff;
classDef blue fill:#93b5cf,color:#fff;
classDef yellow fill:#fcd217,color:#fff;
classDef purple fill:#e0c8d1,color:#fff;
classDef green fill:#0f0;
classDef pureRed fill:#f00,color:#fff;
classDef pureBlue fill:#00f,color:#fff;
classDef lightBlue fill:#2e317c,color:#fff;
classDef lightGreen fill:#a4cab6,color:#fff;



```









## 里程碑管理





里程碑可以是具体的项目、要发布的版本、特定的研发类需求...

里程碑作为【售前】【产品】【研发】 【测试】【运维】目标（O）

根据目标来拆解各自的KR。

* **售前: 跟踪项目进展、时间把控；客户问题沟通；**

* 产品: 跟进项目进展、业务答疑；测试跟进；

* **研发: 完成既定研发目标；项目进展反馈；**

* 测试: 测试方案推敲；

* 运维: 准备开发、测试、预发布环境；

```mermaid
graph LR
A[Timeline]
B[里程碑]
C[看板]
D[OKR]
E[Bug]
F[发布上线]

subgraph 里程碑管理
	direction LR
	A --> B
	B --->|个人OKR拆解|D
	B --->|bug关联里程碑|E
	B --->|日常项目看板|C

	C & D & E --> F
end
```

```mermaid
gantt
dateFormat YYYY/MM/DD
title 项目一览
excludes weekdays 2023-03-28

section 需求阶段
启动会议 : des1,2023-04-01,2023-04-10
客户调研 : des2,2023-04-01,2d
需求整理 : des3,after desc2,2d
需求报告 : des4,after des3,2d
section 开发阶段
需求分析 : des21,after des4,2d
原型选定 : des22,after des21,2d
代码开发 : des23,after des22,2d
内测 : des24,after des23,2d
section 测试阶段
部署     : des1,2023-04-06,2023-05-08
客户测试  : des2,2023-04-06,2d
bug修复  :  desc3,after des2,2d
问题修复  : desc4,after des3,5d
section 上线启动
培训     :  des1,2023-04-06,2023-04-08
问题日结  : des2,2023-04-09,2d
问题修复  : des3,after des2,2d
发版      : des4,after des3,2d
项目验收   : des5,after des4,2d
section 运维阶段
问题整理   : des1,2023-04-10,2023-04-20
问题修复   : des2,after des1,2d
发版      : des3,after des2,2d
```





## 工作流程



```mermaid
sequenceDiagram
	Actor A as 售前
	Actor B as 产品
	Actor C as 设计
	Actor D as 测试
	Actor E as 研发
	Actor F as 运维
	par 售前解决方案
      A->> B: 需求调研
      note left of A: 产品和售前做充分调研、客户问题跟踪、项目进展跟踪
    and 产品 -> 设计、测试
    	B -->>C: 原型、设计评审
      note left of C: 根据项目情况是否需要原型、设计
    	B ->>D: 测试用例评审
      B ->>E: 需求评审(拆解)
    	par 研发 -> 测试、运维
        E ->>D: 提交版本测试、问题修复
        E -->>F: 开发、预发布环境准备
      and 测试 -> 产品、售前
      	D ->> B: 分支管理、版本发布、交付验收
      	note left of C: 分支管理由测试统一管理、测试问题跟踪、内部演示验收
    	end
    end

```



1. 需求分析：首先，需要了解客户的需求，并定义项目的目标、范围和可交付成果。
2. 规划阶段：在这一阶段，需要确定项目的资源、时间表和预算。制定项目计划，并确定项目的关键里程碑和交付时间。
3. 执行阶段：在这一阶段，需要跟踪项目的进度，分配任务，并确保项目按计划进行。确保与客户和利益相关者进行沟通和协调。
4. 控制阶段：在这一阶段，需要监控项目的进度和成本，并及时采取纠正措施。需要定期评估项目的绩效和成果，并与客户和利益相关者分享进展。
5. 收尾阶段：在这一阶段，需要完成项目并提交可交付成果。需要评估项目的成功和教训，并为下一个项目做准备。

此外，以下是一些有助于软件项目管理的最佳实践：

- 使用项目管理软件：使用项目管理软件可以帮助您轻松跟踪任务、资源、时间表和预算。
- 与利益相关者沟通：确保您与客户、团队成员和其他利益相关者进行沟通和协调。
- 采用敏捷开发方法：敏捷开发方法强调快速反馈和快速迭代，可以帮助您更快地实现项目目标。
- 风险管理：在整个项目周期内，您需要识别和管理风险，并制定应对措施。
- 团队管理：鼓励团队成员进行有效的协作和沟通，并激励他们为项目成功做出贡献。
- 持续学习：了解新的技术和工具，以保持对软件项目管理最新的见解和技能。
