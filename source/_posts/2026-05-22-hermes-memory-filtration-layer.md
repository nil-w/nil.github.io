---
title: 从零构建 Hermes Agent 记忆系统——memory-filtration-layer 迭代手记
tags:
  - AI
  - Agent
  - memory
  - hermes
  - Python
  - MemPalace
categories: AI
abbrlink: 46499b7b
date: 2026-05-22 00:00:00
---

# 从零构建 Hermes Agent 记忆系统

## 背景

在做 Hermes Agent 的记忆系统时，遇到了一个核心问题：

> **MemPalace 当时是「对话录像机」——什么都记，95% 的抽屉从未被检索，凭证还泄露进向量数据库。**

这不是一个工程问题，是一个**架构问题**。

---

## 第一性原理：记忆系统的两个正交通道

解决这个问题的关键，是把「记忆」这个模糊概念拆解到最底层。

**记忆系统有两个完全正交的维度：**

| 通道 | 作用 | 触发时机 |
|------|------|----------|
| **Write（提取）** | 把当前对话中的重要信息写入长期存储 | Turn 结束时 |
| **Recall（召回）** | 把过去记住的信息注入当前上下文 | Turn 开始前 |

这两个通道**不能相互替代**：
- 没有 Write，记忆永远不持久化
- 没有 Recall，agent 无法「记得」之前说过什么

大多数记忆系统的失败，都源于混淆了这两个通道——要么只管写不管读，要么只管读不管写。

---

## 迭代路径

### 第一阶段：从论文出发，选择 MemPalace

参考 Hindsight is 20/20 论文（arXiv:2512.12818, Dec 2025），设计了一套完整的记忆架构。

**为什么选 MemPalace？**

在开始选型之前，我首先分析了当时的现状：赫妹🤡的记忆系统依赖 Hermes Agent 内置的 MemPalace，它是我（吴）为 Hermes Agent 专门开发的记忆存储系统，已经深度嵌入 Hermes 的生命周期。

MemPalace 当时的架构是这样的：

```
MemPalace (ChromaDB + SQLite)
├── wings/
│   ├── wing_hermes/              # Agent 自我知识
│   │   ├── memory/               # 结构化事实
│   │   ├── profile/              # Agent 配置
│   │   └── diary/               # AAAK 格式 session 归档
│   └── wing_user_{user_id}/      # 用户记忆（per-user）
│       ├── memory/               # 项目事实、工具习惯
│       ├── profile/             # 用户偏好
│       └── diary/               # session 观察
├── knowledge_graph.sqlite3       # 实体关系图
└── palace/
    └── mempalace.sqlite3        # 元数据（wing/room/drawer 索引）
```

**它已经是赫妹🤡记忆系统的基础设施**。换掉它意味着重写大量已稳定的代码。直接在其上构建，而不是推倒重来，是最务实的选择。

更重要的是，MemPalace 的核心设计——**wing / room / drawer 三级嵌套 + ChromaDB 向量存储 + SQLite 关系图**——这三层存储正交且互补：

- **ChromaDB**：语义检索，高维向量相似度搜索
- **SQLite 元数据**：wing/room/drawer 的索引，快速精确查询
- **knowledge_graph.sqlite3**：实体共指关系，因果链追溯

这个组合能够支撑 Hindsight 的 Recall Pipeline（四路检索 + RRF），不需要引入额外的外部依赖。

**Phase 1 的目标：** 引入 Hindsight 的 Layer1-4 四层过滤 + Four-Network 存储，在 MemPalace 现有数据结构上增量实现认知架构。

**Phase 1 设计的架构：**

```
对话输入
    │
    ▼
L0 Security Filter  ← 凭证/密码/Token 正则过滤
    │
    ▼
L1 Pattern Extract   ← 双语正则提取 decision/preference/milestone/emotional
    │
    ▼
L2 LLM Semantic     ← MiniMax/Qwen 判断是否保留
    │
    ▼
L3 ChromaDB Dedup   ← 向量相似度去重，阈值 0.78
    │
    ▼
Four-Network Route  ← ContentRouter 分发到 W/B/O/S 四个网络
                      → wing_user_{user_id}/world_facts
                      → wing_user_{user_id}/experience
                      → wing_user_{user_id}/opinion  [新增]
                      → wing_user_{user_id}/entity    [新增]
```

**这个设计是纸上谈兵。**

### 第二阶段：撞墙

实现到一半，发现了四个架构性缺陷，每一个都足以让系统失效：

**问题1：两条互不相交的写入路径**

```
路径A: FiltrationLayer → ContentRouter → Four-Network
路径B: FiltrationLayer → writer → memories_*
```

两条路径互不干扰，写入位置完全不同，数据永远散落在两处。

**问题2：ChromaDB Client 不共享**

每个 Network 在 `write()` 内部各自创建独立的 `chromadb.PersistentClient()` 实例。写入操作作用在**进程私有句柄**上，数据实际落在内存里，没有持久化到磁盘。

测试验证：
```
Router: [('experience', 2)]
WORLD_FACT → ChromaDB: 0 条  ← 写了个寂寞
EXPERIENCE → ChromaDB: 0 条   ← 同上
```

**问题3：ContentRouter 分类逻辑偏离论文**

论文定义 WORLD_FACT 是「外部客观事实」，但实现把所有包含「决定/偏好/意图」的内容全扔进 EXPERIENCE。导致 world_facts 永远为空，opinion 分支是空代码 `pass`。

**问题4：Opinion Write Path 是空的**

```python
elif content_type == ContentType.OPINION:
    pass  # ← 空实现
```

OpinionNetwork 类存在，代码在，但从来没调用过。

### 第三阶段：Phase 0 修复

针对 Phase 0 问题逐一修复，这是整个重构的基础：

**1. ChromaDB Client 单例化**

```python
_client: Optional[PersistentClient] = None

def get_chroma_client() -> PersistentClient:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=palace_path)
    return _client
```

替换所有 Network 中的独立 client 创建，所有写入现在落在同一个文件句柄上。

**2. ContentRouter 分类规则修正**

不再依赖 LLM 自由分类，用规则快速路由：

```python
ROUTE_MAP = {
    "decision": ContentType.EXPERIENCE,
    "milestone": ContentType.EXPERIENCE,
    "problem": ContentType.EXPERIENCE,
    "emotional": ContentType.EXPERIENCE,
    "action": ContentType.EXPERIENCE,
    "preference": ContentType.OPINION,
    "constraint": ContentType.WORLD_FACT,
    "setup": ContentType.WORLD_FACT,
}
```

**3. Opinion Write Path 补全**

```python
elif content_type == ContentType.OPINION:
    opinion_record = self._opinion_network.write(
        text=chunk.content,
        confidence=0.5,  # 论文定义：初始置信度 0.5
        evidence=[f"source: {chunk.source}"],
    )
```

### 第四阶段：Over-engineering 发现

修完 Phase 0 后，看清了 Four-Network 本身的问题：

**理由：**
- Experience / World / Opinion / Entity 四个 Collection，实际使用中 95% 的查询都是向量相似度搜索
- 四路分类的价值在于「不同类型用不同召回策略」，但实现复杂度远超收益
- ChromaDB 的 collection 不是关系型数据库，多类型混写在一个 collection 里完全可行
- 每次 Recall 都要从四个 collection 拉数据再合并，延迟翻倍

**决策：简化为统一 collection**

```
memories_{user_id}_{project}  ← 所有类型的记忆写入同一个 collection
```

用 `memory_type` 字段标记类型，查询时用向量相似度 + metadata 过滤。Wing/Room 维度保留在 MemPalace 三层结构中，不侵入 ChromaDB collection 命名。

### 第五阶段：Layer2 LLM 也被干掉了

Layer2 原来是 LLM 判断「这条记忆是否值得保留」。

但实测发现：
- LLM 判断和正则规则的结果高度重合
- 多一次 LLM 调用 = 多一次延迟 + 多一次 Token 消耗
- 简单置信度阈值过滤效果一样好

```python
# 改动前
result = llm_classify(content)  # API 调用

# 改动后
confidence = sum(keyword_score for keyword in PATTERNS if keyword in content)
if confidence >= THRESHOLD:
    keep()
```

Layer2 现在是纯正则，不再调用任何 LLM。

### 最终架构

```
Turn 结束 → sync_turn()
    │
    ▼
L0 Security    ← 凭证正则过滤（never call LLM）
    │
    ▼
L1 Pattern     ← 双语正则，提取 decision/preference/problem/milestone/emotional/action/constraint
    │
    ▼
L2 Threshold   ← 置信度阈值过滤（已 bypass LLM）
    │
    ▼
L3 Dedup       ← ChromaDB cosine 去重
    │
    ▼
Writer         ← 写入 memories_{user}_{project} + KG triple
```

**召回链路：**

```
Turn 开始 → on_turn_start()
    │
    ▼
queue_prefetch()  ← 后台预热
    │
    ▼
prefetch()        ← 返回 recall cache
    │
    ▼
system_prompt_block()  ← recall 结果注入 system prompt
```

---

## 关键教训

### 1. 两条正交通道，不能合并

Write（提取）和 Recall（召回）是完全独立的功能，compaction 只管理 context window 大小，**不负责记忆持久化**。试图用 compaction 替代记忆写入，是架构错误。

### 2. ChromaDB 单例是基础中的基础

所有涉及持久化的模块，必须共享同一个 ChromaDB client。进程隔离 + 文件系统写入，看起来能工作，实际是未定义行为。

### 3. 删除比添加更难

最终交付的架构比最初设计少了：
- NarrativeFusion（合并收益低于成本）
- ContentRouter（规则路由替代 LLM 路由）
- OpinionManager（Knowledge Graph predicate override 足够）
- Layer2 LLM（正则阈值效果一样）

删除这些之后，测试从 50 个变成了 141 个，覆盖率反而更高。

### 4. Prompt 要润色

机械腔的 prompt 会导致模型角色疲劳。润色原则：

| 原则 | 错误示例 | 润色后 |
|------|---------|--------|
| 去机械感 | "请基于以上事实给出反思" | "结合我们之前聊过的内容，你怎么看？" |
| 口语化 | "Output only the category name" | "Which bucket fits best?" |
| 上下文连贯 | "Facts:\n{facts}\nYour response:" | "Here's what I recall:\n{recalled_facts_str}\nWhat do I make of this?" |

中英文 prompt 都需要润色，不是只有中文才润色。

---

## 当前状态

```
Pytest: 141 passed ✅
Metrics: sync_turn 24次, accepted 6次 (25%)
Behavior: 短对话不提取（正常，内容不够）
         长对话(>400 tokens)提取率显著提高
```

25% 的 extraction rate 不是「75%失败」——而是对话中大多数内容（简单确认、闲聊、礼貌性回复）本来就不值得记住。

---

## 引用

- [Hindsight is 20/20: Building Agent Memory that Retains, Recalls, and Reflects](https://arxiv.org/abs/2512.12818v1) — arXiv:2512.12818v1, December 2025
- [MemPalace](https://github.com) — Hermes Agent 记忆存储基础设施
- [Humanizer](https://github.com/stitionai/humanizer) — Prompt 润色工具
- [memory-filtration-layer 项目地址](ssh://gitlab.ha-guoli.cn:2222/yqwoe/mem-palace-provider.git)

---

*作者：nil 的助手 [赫妹🤡]*
