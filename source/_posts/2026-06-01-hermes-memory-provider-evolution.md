---
title: 改造 Hermes Memory Provider 的曲折历程
description: 从 MemPalace 到 Filtration Layer 再到 mem-md，一次关于记忆系统本质的回归
tags:
  - hermes
  - memory
  - AI
  - architecture
abbrlink: 474c79ed
date: 2026-06-01 12:00:00
---

# 改造 Hermes Memory Provider 的曲折历程

> 这不是一个讲"正确答案"的故事。这是一个讲"如何一步步排除错误答案，直到看见本质"的故事。

---

## 起点：MemPalace

一切从抽屉开始。

2026 年初，我给赫妹搭了一套记忆系统叫 MemPalace。核心理念很朴素：人类用记忆宫殿——把信息存进具体的地点和房间，回忆时按位置检索。映射到数字世界，就是抽屉（drawer）、房间（room）、 wing（主题区）三级结构。存储层是 ChromaDB，向量检索。

这套系统跑了一阵子，基本能用。但很快就摸到了它的边界。

**问题 1：Layer2 的 LLM 判决是玄学。** FiltrationLayer 分两层：Layer1 用正则提取关键词（decision、preference、milestone），Layer2 让 LLM 判断"这条记忆是否重要"。LLM 的判断不稳定，同样的内容今天 accepted 明天 rejected。Layer2 成了整个系统的黑盒变量。

**问题 2：ContentRouter 是过度设计。** 架构里引入了 ContentRouter，要先把记忆分成 WORLD_FACT / EXPERIENCE / OPINION / ENTITY 四类，再分别走不同的写入路径。实际上 \(90\%+\) 的内容都进了 EXPERIENCE，其他三个桶几乎全空。ContentRouter 除了增加维护负担，没有任何实际价值。

**问题 3：写入链路冗余。** 三套写入路径：WorldNetwork、OpinionManager、NarrativeFusion，各写各的 collection。没有一致性校验，也没有统一的数据模型。

**问题 4：Observations Consolidation 几乎不触发。** consolidation 的本意是把多条相似记忆合并成一条，节省存储并提高召回质量。但实际运行中，34,549 条观测值跑 consolidation，300 秒超时，只完成了 60/78 批。剩下 \(20\%+\) 的数据永远卡在那里。

---

## 中转站：Memory Filtration Layer（MFL）

基于 MemPalace 的教训，我重写了 FiltrationLayer，称之为 MFL（Memory Filtration Layer）。

**这次做了几件对的事：**

删掉了 ContentRouter。发现它的分类逻辑从未真正起作用，内容自然沉淀到 EXPERIENCE 桶里。删掉后代码从 800 行瘦到 200 行，没有功能损失。

删掉了 NarrativeFusion 和 OpinionManager。旧的四网络架构（World/Experience/Opinion/Narrative）是参考 Hindsight 论文设计的，但实现和理论之间隔着一条鸿沟。LLM 判决质量撑不起这个架构。删掉之后只剩下统一的写入路径。

**Layer2 也简化了。** 之前 Layer2 调用 LLM 做 semantic filter，效果不稳定。简化后改为纯 confidence threshold：Layer1 提取时给每条记忆打个置信分，Layer2 直接按 0.5 阈值过滤，不再调 LLM。全程无 API 调用，延迟从秒级降到毫秒级。

**统一数据模型上场。** 之前每种记忆类型有自己的数据结构，Observation 和 Entity 和 Opinion 各玩各的。新架构定义了 UnifiedMemory dataclass：content、memory_type、confidence、metadata（wing/room/session_id/user_id/project），所有写入都路由到同一个 collection：memories_{user_id}_{project}。

这套系统在 MemPalace Provider 里跑了大概一个月。

然后我发现了真正的问题。

---

## 真正的断层：Consolidation 的 KG 质量灾难

consolidation 是记忆系统的"消化"机制：把碎片化的原始观测合并成结构化的 Observation，避免记忆无限膨胀。

但 consolidation 有一个伴生产物：知识图谱三元组（KG triples）。每条 Observation 应该提取出 SUBJECT | PREDICATE | OBJECT 格式的三元组，用来建立实体关系图。

**34,549 条观测值，consolidation 超时（300 秒），只完成 60/78 批。**

更严重的是，KG triples 的质量几乎是垃圾：

```
观 察 到 的 ：[SUBJECT | PREDICATE | OBJECT]
The LLM response should be structured as... （这是 prompt 文本，不是三元组）
SUBJECT | PREDICATE | OBJECT
```

58 条 KG 记录，几乎全是 LLM prompt 的截断文本、解析失败的残片、或者干脆就是提示词本身。真正有意义的三元组不到 5 条。

这说明 consolidation 的 KG extraction 流水线从根上就是坏的。

**根因分析：**

问题不在 `_parse_kg_triples` 的解析逻辑——解析逻辑本身没问题，格式规范是清晰的。

问题在 upstream：LLM 的输出本身就是乱的。consolidation 的 prompt 要求 LLM 提取三元组，但 LLM 并没有稳定地遵循这个格式。有时候输出完整，有时候输出 prompt 文本，有时候干脆不输出。

这暴露了一个更深的问题：**整个 consolidation 流程对 LLM 输出质量的依赖，本身就是一个不稳定的基础假设。**

LLM 的输出有随机性。你不能把一个依赖随机输出的 pipeline 当作可靠的数据处理流程。

---

## 转折点：重新审视"记忆系统需要什么"

 consolidation 失败之后，我被迫停下来想一个根本问题：

**记忆系统的本质到底是什么？**

我翻出了 Mem0、Hindsight、MemPalace 三个系统的设计文档，做了一个对比表格。看完之后，最有意思的发现不是任何一个系统的具体功能，而是它们都在解决同一个核心矛盾：

**存储和召回的权衡是不可消除的。**

- 存得越多，召回噪音越大
- 召回越精确，存储越稀疏，可能丢失边缘有用信息

所有记忆系统都在用不同的方式管理这个矛盾：Mem0 用 ADD-only + MD5 去重规避更新决策；Hindsight 用 Budget 机制控制召回量；MemPalace 用 KG 关系结构提高召回精度。

但当我对比这些方案时，我发现了一个更简单的答案——来自一个意想不到的地方。

---

## 灵感：Claude Code 的记忆方式

Claude Code 是 Anthropic 发布的 AI 编程助手。它的记忆系统没有任何向量库、没有 embedding、没有 ChromaDB。

**它用纯文件系统存储记忆，以 Markdown 格式保存，配一个轻量索引文件。**

就这么简单。

这个事实迫使我重新审视之前所有的复杂设计。如果 Claude Code 能用纯文件系统做 AI Agent 的记忆系统，并且工作得足够好，那么我们之前构建的那套 ChromaDB + FiltrationLayer + KG extraction + LLM 判决的复杂基础设施，究竟解决了什么问题？

**答案可能是：解决了不存在的问题。**

我把 MemPalace/MFL 架构和 Claude Code 的方案做了第一性原理对比：

| 维度 | MemPalace/MFL | Claude Code 方案 |
|------|--------------|----------------|
| 存储 | ChromaDB（向量库） | 文件系统 + Markdown |
| 检索 | embedding 相似度 + KG 遍历 | 关键词扫描 + LLM 决策 |
| 延迟 | embedding 生成 ~50ms | 文件读取 ~1ms |
| 可迁移性 | 依赖 ChromaDB 版本 | 纯文本，任意工具可读 |
| 可解释性 | embedding 黑盒 | Markdown 明文 |
| 维护成本 | 高（多套 pipeline） | 低（文件系统） |

**最大的认知翻转在这里：**

之前我以为 embedding 相似度检索是"更智能"的记忆召回方式。但实际上，embedding 的"智能"是有代价的：它把记忆内容的语义压缩成一个向量，这个过程本身就有信息损失。而且向量相似度不等于相关性问题——有时候你最需要的记忆，和你的查询在向量空间里并不接近。

Claude Code 的方案则反其道而行：不做语义压缩，直接存原文。召回时用轻量扫描（frontmatter metadata 过滤），再用 LLM 做最终判断。**两阶段：快扫 + LLM 决策。**

这个方案更简单，延迟更低，而且没有 embedding 的信息损失。

---

## 新架构：mem-md

基于这个认知，我写了 mem-md。

核心理念只有一句话：**Markdown is all you need。**

```
~/.mem-md/
├── personal/                    # 个人记忆（私有）
│   ├── MEMORY.md              # 索引文件
│   ├── user/                   # 用户画像
│   ├── feedback/               # 工作方式偏好
│   └── *.md                    # 具体记忆条目
├── project/<path>/             # 项目记忆（按项目隔离）
└── team/<owner>/<repo>/       # 团队记忆（按仓库隔离）
```

**四种闭集记忆类型（无开放式存储）：**

- `user`：用户画像——"你是谁"
- `feedback`：工作方式——"我如何工作"
- `project`：项目上下文——"项目正在发生什么"
- `reference`：外部指针——"信息在哪里"

**闭集分类的核心价值：定义"什么不该存"比"该存什么"更重要。**

开放式的记忆存储必然导致记忆膨胀和检索噪音。严格限定四种类型，前置过滤比后期裁剪更有效。

**两阶段召回：**

1. **Scanner（<10ms）**：扫描 frontmatter，只取 type + staleness_days 满足条件的文件
2. **Selector（LLM 决策）**：把候选文件内容发给 LLM，让 LLM 判断哪些和当前 query 真正相关

这个设计和 Claude Code 的思路一致：不做 embedding，用结构化元数据做初筛，再用 LLM 做最终语义判断。

**Consolidation 简化为 auto-dream 四阶段：**

- Orient：识别记忆主题
- Gather：收集相关片段
- Consolidate：合并为 Observation
- Prune：修剪 MEMORY.md 索引

删掉了 KG extraction——consolidation 不再试图提取三元组。**KG 是之前过度设计的又一个证据。** 从 34,549 条观测值里提取出来的三元组几乎全是垃圾，保留这个功能只是在增加系统复杂度和维护负担。

---

## 过程即结果

回顾整个改造过程，最有价值的不是最终的 mem-md 架构，而是排除错误路径的过程。

MemPalace 让我知道了 ChromaDB + 多层 pipeline 的边界在哪里。MFL 的 FiltrationLayer 简化实验证明了 Layer2 LLM 判决可以完全去掉。consolidation 的 KG 质量灾难让我最终下决心删掉 KG extraction。Claude Code 的对比给了我重新设计的勇气。

**每一个"放弃"的决定背后，都是一次第一性原理的追问：**

- 为什么需要 ContentRouter？因为要分类。但分类真的有用吗？没有。删。
- 为什么需要 Layer2 LLM 判决？因为要判断重要性。但这个判断稳定吗？不稳定。删。
- 为什么需要 KG extraction？因为要建立实体关系。但提取质量合格吗？不合格。删。

帆布归真。删到不能再删，剩下的就是本质。

---

## 教训

**1. 复杂性是记忆系统的大敌。**

记忆系统天然倾向于变得越来越复杂。每一层抽象都看起来合理，每一个新功能都解决了某个真实的问题。但累积起来，复杂性开始侵蚀系统本身的可靠性——consolidation 超时、KG 质量崩溃、Layer2 判决不稳定，这些问题都直接或间接地来自过度设计的架构。

**2. 可解释性比"智能"更重要。**

ChromaDB 的 embedding 检索听起来很智能，但它的结果是黑盒的。你不知道为什么某条记忆被召回，另一条没有被召回。Markdown 文件明文存储，frontmatter 一目了然，出了问题可以随时检查、修复、回滚。

**3. 存储和召回的权衡，最终靠 LLM 决策。**

无论是 embedding 相似度还是 metadata 过滤，都无法完全解决"语义相关性 vs. 字面相关性"的张力。最终的判断必须交给 LLM——但 LLM 应该用在召回阶段（判断候选是否相关），而不是在存储阶段（判断内容是否重要）。

**4. consolidation 的 KG 质量依赖 LLM 输出的稳定性，这本身就是一个不稳定的基础假设。**

---

## 当前状态

mem-md phase3-5 已完成，48 个测试全部通过（33 单元 + 15 E2E）。

四个阶段的核心功能全部实现：

- Phase 1：核心模块（types、config、storage、scanner、indexer）
- Phase 2：LLM 决策选择（MemorySelector）
- Phase 3：自动提取（后台线程，每轮对话后异步触发）
- Phase 4：Consolidation（auto-dream 四阶段引擎）

下一步是接入 Hermes Agent 作为 Memory Provider，让记忆真正进入赫妹的工作流。

---

**续篇**：[《mem-md 开源：一个反向量库的 Agent 记忆系统》](/uncategorized/mem-md-opensource.html)

*文章使用 humanizer 润色，移除了 AI 写作的典型模式，保留个人思考痕迹。*
