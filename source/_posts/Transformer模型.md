---
title: Transformer模型
toc: false
categories:
  - 学习
abbrlink: e4b8a22b
date: 2024-02-22 11:01:14
tags:
  - NLP
  - text2sql
  - 机器学习
---





&emsp;&emsp;Transformer模型最早是由Google的研究团队在2017年提出的，并在论文《Attention is All You Need》[^1] 中进行了详细的介绍。这个模型是为了解决自然语言处理（NLP）任务中的一些问题而设计的，特别是为了克服传统循环神经网络（RNN）和长短期记忆网络（LSTM）在处理长序列时的局限性，如梯度消失或梯度爆炸问题。

&emsp;&emsp;Transformer模型的核心思想是使用自注意力机制（Self-Attention Mechanism）来捕捉输入序列中的依赖关系。这种机制允许模型在处理每个输入元素时，都能够关注到输入序列中的所有其他元素，从而能够捕捉到更长的依赖关系。此外，Transformer模型还采用了位置编码（Positional Encoding）来弥补模型本身不具备处理序列顺序的能力。

&emsp;&emsp;Transformer模型由两部分组成：编码器（Encoder）和解码器（Decoder）。编码器负责将输入序列转换为一系列向量表示，而解码器则负责根据这些向量表示生成输出序列。这两部分都由多个相同的层堆叠而成，每一层都包含一个多头自注意力子层和一个简单的全连接前馈神经网络。

&emsp;&emsp;由于Transformer模型不依赖RNN的顺序结构，因此它可以实现高效的并行化训练，这使得它在处理大规模数据集时具有显著的优势。此外，Transformer模型的强大表示能力和灵活性使得它在多个NLP任务上都取得了显著的效果，成为了自然语言处理领域的一种主流模型。

&emsp;&emsp;总的来说，Transformer模型是Google研究团队在2017年提出的一种基于自注意力机制的深度学习模型，它的出现为自然语言处理领域的发展带来了革命性的突破。



引用:

* [Text-to-SQL小白入门（一）](https://zhuanlan.zhihu.com/p/647249972)
* [Text-to-SQL小白入门（二）](https://zhuanlan.zhihu.com/p/650407036)







原论文:



[^1]: 《Attention is All You Need》



{%pdf /images/1706.03762.pdf %}
