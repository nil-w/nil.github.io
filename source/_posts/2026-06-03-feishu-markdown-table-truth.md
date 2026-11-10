---
title: 飞书真的能发表格吗？我赌它不能，然后输了
description: 一个从错误公理到 CardKit v2 的工程故事
tags:
  - hermes
  - feishu
  - lark
  - cardkit
  - debugging
abbrlink: feishu-markdown-table-truth
date: 2026-06-03 10:00:00
---

# 飞书真的能发表格吗？我赌它不能，然后输了

三个月前我做了一个判断：飞书 IM v1 API 拒收 `{tag:"table"}`，会返 230001。

这判断没有依据。可能是某次旧测试留下的印象，可能是从某个 issue 抄来的，可能就是猜的。但它在我脑子里生了根，长成了一棵树——一整套「飞书发表格 = 降级到纯文本 + 中文提示」的代码就围着它长起来。

直到上周看到 chapafan 那个 200 行的方案。

---

## 那 200 行

`chapafan/Hermes-feishu-to-table` 的 README 写得克制：

> 修改 `feishu.py`，在消息发送前检测 Markdown 表格，自动转成飞书 CardKit v2 的 `table` 组件。

克制到我一度怀疑他在吹牛。但点进去看代码，3 个函数干净得像论文摘要：

```python
def _parse_markdown_table(text) -> List[Dict]:
    # 把 markdown 拆成 text 段和 table 段

def _build_table_card(headers, rows) -> Dict:
    # 拼 CardKit v2 table 组件

def _build_interactive_card_with_tables(text) -> Optional[Dict]:
    # 包成 schema 2.0 卡片
```

加上 `_build_outbound_payload` 里 4 行切换，**总共 200 行**。

我盯着这 200 行看了十分钟。它和我脑子里那个「飞书拒收 table」的公理是矛盾的。两个里一定有一个是错的。

---

## 错的那个

移植到本地的过程很顺，但眼尖抓到一个**上游隐藏 bug**：

```python
def _flush_table():
    nonlocal table_lines  # ← chapafan 写的
    if not table_lines:
        return
    ...
    table_lines = []  # ← 这行其实没生效
```

`table_lines` 定义在 `_parse_markdown_table` 函数顶部，嵌套函数里 `nonlocal` 写错位置了——Python 会忽略这个声明，结果是 `table_lines = []` 变成了「给局部变量赋空列表」，外层的 `table_lines` 永远不清空。**第二张表格的解析会混进第一张的残留行。**

chapafan 自己的测试可能没覆盖多表。我用 `table_lines.clear()` 替换——`list.clear()` 是 in-place 操作，不需要 `nonlocal` 也工作。

顺手做了 22 个单测，全部过。然后——

---

## 实弹

跳过文档、跳过猜测，直接发：

```python
content = """## 诊断测试
| 名称 | 数值 | 状态 |
|---|---|---|
| 单元 A | 42 | OK |
| 单元 B | 99 | FAIL |
| 单元 C | 17 | OK |
"""

response = await client.im.v1.message.create(req)
# → code=0, msg=success
```

服务端**收了**。message_id 拿到了。**但服务端收 ≠ 客户端渲染**——这个区别我吃过亏。

打开手机飞书。**3 行表格真渲染成了 CardKit v2 组件。**表头加粗、列对齐、卡片有 header 装饰。

那个陪了我三个月的公理是错的。

---

## 边界

P0 跑通不等于能投产。飞书 CardKit v2 的官方文档列了一堆限制，**每个限制都对应一个会出事的真实场景**：

- 最多 50 行 → 你的用户会发 200 行的需求清单
- 最多 20 列 → 你的用户会发宽表
- 单 cell 1000 字符 → 你的用户会贴长日志
- 整张卡 30KB → 用户发 50KB 的对比表

每一个都得有守卫。加完，测试从 22 涨到 35。

加守卫的时候又踩了一脚 CJK 的坑：Python `str[:n]` 天然在 codepoint 边界上切，**不会切坏 CJK**。我一开始还写了一段 back-off 逻辑，发现是多余的，删了。删比写更难——要承认自己想多了。

嵌套表格也想了半天怎么防。最后方案是：如果 cell 里还含 `|`，整行合并成单 cell。粗暴，但飞书 CardKit v2 不支持嵌套，没优雅解。

---

## 200 行

给飞书发了 200 行的任务清单：

```
elements: 3 (['markdown', 'table', 'markdown'])
  table columns=4, rows=50
  last row last cell: '优先级 低\n\n（表格已截断，最多 50 行 / 20 列 / 单元格 1000 字）'

✅ code=0 msg=success
```

打开飞书。**前 50 行清晰渲染**，最后一行右下角挂着中文提示。**没崩。**用户的 200 行变成了 50 行 + 一句解释，**这不是降级，是有边界的服务**。

---

## 我学到的

最大的收获不是表格能渲染。是**我脑子里那棵"飞书拒收 table"的树被砍了**。一个错公理曾经让我写了不必要的降级代码，让用户看不到真表格，让系统放弃了它能做的事。**三个月。**

如果我没偶然点进 chapafan，那棵树可能还在。

所以现在的我，每个"已知限制"都会在脑子里加一个标签：「这个有实弹证据吗？」没有的，就当传说对待。

---

实弹一次，胜过翻十遍文档。这是我这个月最贵的一课。

---

*附录：commit `600db9109`（P0 移植）、`d1d1d5cc5`（P1 边界）。代码 200 行，测试 35 个，3 次实弹。*
