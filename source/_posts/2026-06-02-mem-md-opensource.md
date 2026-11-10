---
title: mem-md 开源：一个反向量库的 Agent 记忆系统
description: 从 5.2 万行 MemPalace 到 0.1.0 mem-md，把记忆系统退回到第一性原理
tags:
  - hermes
  - memory
  - AI
  - opensource
  - architecture
abbrlink: mem-md-opensource
date: 2026-06-02 22:30:00
---

# mem-md 开源：一个反向量库的 Agent 记忆系统

> Markdown is all you need.

---

## 序：从 MemPalace 到 mem-md

上个月写了《改造 Hermes Memory Provider 的曲折历程》，把记忆系统的演化讲到了 MFL（Memory Filtration Layer）阶段。那篇文章结尾埋了一个伏笔：mempalace 里有 5.2 万行历史观测数据，要怎么迁移到 MFL？

这篇文章就是这个伏笔的答案：**不迁移到 MFL，直接退回到更底层的 mem-md**。

`mem-md` 今天 0.1.0 开源。代码在 [gitlab.ha-guoli.cn/yqwoe/mem-md](https://gitlab.ha-guoli.cn/yqwoe/mem-md)，171 个测试全过，P0/P1 稳定性全部落地。

但这不是一个"我做了一个项目"的炫耀贴。这是一个**关于记忆本质的回归**。

---

## 核心问题：记忆到底是什么？

先把问题拆到不能再拆。

**公理 A**：记忆是「在未来的某个时间点，能被检索出来辅助决策的文本」。

**公理 B**：检索的本质是「判断这条文本和当前 query 的相关度」。

**公理 C**：相关度 = `sim(text, query) × importance(text, context) × recency(text, now)`。

**公理 D**：人类能「用脑子」判断相关度。LLM 也能。embedding 是另一种近似方式——把文本压成向量，再用余弦相似度替代语义判断。

到这里分叉了。**embedding 的本质是用几何距离替代语义判断**。它有几个不可逆的代价：

1. **压缩不可逆**：你不可能从向量还原原文
2. **黑箱不可解释**：「为什么召回这条」没有答案
3. **语义边界模糊**：「猫」和「狗」距离很近，但「猫在沙发」和「狗在沙发」距离一样近

mem-md 的选择是：**用 LLM 做语义判断，用 Markdown 文件做存储**。

不压缩。**可读**。**可审计**。**`cp -r` 就能迁移**。

---

## 架构

```
~/.mem-md/
├── personal/
│   ├── MEMORY.md
│   ├── {user_id}/
│   │   ├── user/         # 用户画像
│   │   ├── feedback/     # 工作方式
│   │   ├── project/      # 项目上下文
│   │   └── reference/    # 外部引用
├── project/<path>/
└── team/<owner>/<repo>/
```

四条规则，没有第六条：

| 类型 | 问什么 |
|------|--------|
| `user` | 你是谁 |
| `feedback` | 你怎么工作 |
| `project` | 项目正在发生什么 |
| `reference` | 信息在哪里 |

闭集。LLM 不需要分类。

---

## 三个反直觉的设计

### 1. 不用向量库

| 维度 | 向量库 | mem-md |
|------|--------|--------|
| 检索 | 几何距离 | 关键词 + LLM 决策 |
| 可解释 | 黑箱 | Markdown，可人工审查 |
| 迁移 | 重新索引 | `cp -r` |
| 部署 | 独立服务 | 零依赖 |
| 成本 | embedding API | 0 |

部署复杂度这条最关键。ChromaDB 要起服务、要监控、要备份。mem-md **零运行时依赖**——只有文件系统。

### 2. 三层 LLM 降级

调用 LLM 的成本是秒级延迟 + 钱。mem-md 的 selector 实现三层降级：

- **Layer 0**：候选 ≤2 → **零 LLM 调用**，按 mtime 排序返回
- **Layer 1**：候选 >2 → 缓存命中（md5(query+paths+budget)，TTL 5min）直接返回
- **Layer 2**：cache miss → LLM 调用。**LLM 失败时 mtime fallback**

实测：日常 80%+ 的 recall 走 Layer 0/1，**LLM 调用是异常路径不是主路径**。

### 3. 文件级 mtime 缓存

扫描 `~/.mem-md/personal/{user_id}/` 是个递归遍历。第一次扫 200 个文件要 50ms，第二次扫只读 frontmatter（前 30 行）只花 5ms。但每次都重扫还是浪费。

mem-md 在每个 user_id 目录下放一个 `.scan_cache.json`：

```json
{
  "root": "/home/nil/.mem-md/personal/feishu:oc_xxx",
  "files": {
    "/path/to/memory1.md": {
      "mtime": 1748934567.89,
      "size": 1234,
      "frontmatter": {"name": "...", "description": "...", "type": "project"}
    }
  }
}
```

下次扫描时：mtime + size 都没变 → **直接用缓存的 frontmatter，不读盘**。变了才重新读。

5 秒内存 TTL 兜底跨进程同步，**写盘后通过 `fire_invalidation()` 全局事件立即失效**。

---

## 稳定性：P0 + P1 共 8 项机制

0.1.0 不是 demo。**该爆的雷全拆了**：

### P0（必落地）

| 机制 | 解决什么 |
|------|----------|
| `atomic_write()`（tmp + os.replace） | 半截文件 → 烂文件 |
| `FileLock` + `fcntl.flock` 跨进程锁 | import 脚本并发写文件 |
| `error_log.py` 静默 except 捕获 | 「写入失败」不再沉默 |

### P1（已落地 4 项）

| 机制 | 解决什么 |
|------|----------|
| 日志轮转（errors/metrics/access） | 三类日志按 size+backups 自动 `.1` `.2` `.3` |
| `archive-prune` CLI（默认 dry-run） | archive/ 目录无界累积 |
| 写盘后 `fire_invalidation()` | 5s TTL 窗口期内的陈旧候选 |
| 三层 LLM 降级 | LLM 失败时 mtime fallback |

写盘后的 cache 失效这个最微妙。`MemMdProvider._init_modules()` 注册 scanner 的 `invalidate_memory_cache` 为全局监听器，**`MemoryStorage.write_memory` / `update_memory` / `delete_memory` 末尾自动 fire**。端到端：write → scan 立即看到新文件，不再受 5s 窗口期限制。

---

## 公开 CLI

```bash
# 安装
pip install mem-md

# 导入 Hermes sessions（飞书 / 微信 / 任意平台）
export MEM_MD_USER_ID=feishu:oc_xxxxxxxx
mem-md import-sessions feishu

# 查询
mem-md recall "吴的商业思维" --budget high

# 手动写入
mem-md retain "用户偏好极简界面" feedback --name ui_preference

# auto-dream
mem-md consolidate

# 归档清理（dry-run 默认）
mem-md archive-prune --apply
```

`user_id` 三级回退：`--user-id` CLI 参数 > `MEM_MD_USER_ID` 环境变量 > `PLATFORM_USER_ID_MAP` 配置。

---

## scripts 分离原则

仓库里的 `scripts/` 目录分两类：

- **公共**（pip 打包分发）：`import_sessions.py` / `session_migrator.py` / `remember.py`
- **个人**（仅仓库所有者追溯）：`scripts/personal/*.archived.py`

个人脚本里残留的个人 user_id / API key 全部隔离，**不进入 pip 包**。`pyproject.toml` 的 authors 写的是 `nil <yqwoe@live.cn>`，没有联系方式泄露，没有凭据泄露。

---

## MemMdProvider：Hermes 集成

```python
from mem_md import MemMdProvider

provider = MemMdProvider()
provider.initialize(
    session_id="20260516_xxx",
    platform="feishu",
    user_id="feishu:oc_xxx",
    hermes_home="~/.hermes",
)
provider.inject_ctx_llm(ctx.llm)  # 用 Hermes 的主模型
```

`MemMdProvider` 实现 `MemoryProvider` ABC——和 MemPalace 完全相同的接口签名。**底层从 ChromaDB + embedding 替换为文件系统 + LLM 决策**。

这是关键：上层代码（content extraction、session import、Hermes agent loop）**完全不需要改**。换 provider 一行配置搞定。

---

## 路线图

- **0.2.0** — 5.2 万行 mempalace 数据一次性迁移工具 + 教程博客
- **0.3.0** — `mem-md-ui` 独立项目（基于 Obsidian 打开 `~/.mem-md/personal/{user_id}/` 作为零代码 UI）
- **0.4.0** — 多 profile 隔离完善
- **1.0.0** — 相似度阈值校验 + 跨进程 cache 协调 + 完整语义版本承诺

UI 不在核心包里——这是哲学选择。核心包的哲学是「**Markdown is all you need**」。UI 是另一回事。Obsidian 直接打开 `~/.mem-md/personal/{user_id}/` 就是现成的浏览/编辑/搜索 UI。为什么要重复造轮子？

---

## 写给想用的人

**如果你在用 ChromaDB / FAISS / Qdrant 做 Agent 记忆**，请先问自己一个问题：

> 我真的需要「语义相似」吗？还是只需要「相关」？

如果是后者，mem-md 是个**30MB pip 包，零运行时依赖，5 分钟装好**的替代方案。

**如果你在用 LLM 做记忆整理**，mem-md 的 `archive-prune` + `consolidate` + 软删除机制是直接可用的。不需要写 chroma adapter。

**如果你只是想给 agent 加个跨会话记忆**，最简路径：

```python
from mem_md import MemMdProvider
provider = MemMdProvider()
provider.initialize(session_id="...", platform="feishu", user_id="feishu:oc_xxx")
# 然后在 agent loop 里调 provider.recall(...) 和 provider.retain(...)
```

完。

---

## 一句话总结

> **记忆是文本，文本存在文件里，按需读取。**
>
> 任何把文本压成向量的方案，都在做**不可逆的信息损失**——除非你能证明这种损失对你的任务没有影响。
>
> 如果你不能证明——试试 mem-md。

---

**项目地址**：[gitlab.ha-guoli.cn/yqwoe/mem-md](https://gitlab.ha-guoli.cn/yqwoe/mem-md)
**许可**：MIT
**版本**：0.1.0
**测试**：171 passed
**作者**：nil <yqwoe@live.cn>
