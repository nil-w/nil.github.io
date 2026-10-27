---
title: revealjs-animated动画文档
toc: true
abbrlink: 8212ba91
date: 2024-01-24 18:00:16
password:
  - 学习
tags:
  - animate
  - css动画
  - css
  - reveal.js
---



[查看示例](https://rogeralmeida.github.io/revealjs-animated-examples/)

## 如何安装
1) 安装revealjs-animated插件
```bash
    npm install revealjs-animated
```
2) 在Reveal.js中初始化安装路径
```javascript
    //index.html
    Reveal.initialize({
        dependencies: [
            // Other plugins
            {src: 'node_modules/revealjs-animated/dist/revealjs-animated.js', async: true}
        ]
    });
```
## 如何使用？

### 居中移动动画

```html
<!--html-->
<h1 id="titulo" class="fragment animated move-to-middle-top">居中</h1>

<!--md-->
# 居中<!-- .element: class="fragment animated move-to-middle-top" -->

```
#### 属性
此动画不允许使用任何属性。

### 自定义位置移动动画
```html
<!--html-->    
<p class="fragment animated move-to">默认参数</p>

<!--md-->
默认参数<!-- .element: class="fragment animated move-to" -->

```
#### 属性
| 名称                       | 默认值 | 描述                        |
| -------------------------- | ------ | --------------------------- |
| data-animated-move-to-left | 50px   | 动画对象应在X轴上移动的距离 |
| data-animated-move-to-top  | 25px   | 动画对象应在Y轴上移动的距离 |

### 放大动画
```html
<!--html-->    
<p class="fragment animated scale-up">放大</p>
<!--md-->
放大<!-- .element: class="fragment animated scale-up" -->

```
#### 属性

| 名称                        | 默认值 | 描述   |
| --------------------------- | ------ | ------ |
| data-animated-scale-up-from | 1      | 起始值 |
| data-animated-scale-up-to   | 2      | 最大值 |

### 缩小动画
```html
<!--html-->    
<p class="fragment animated scale-down">缩小</p>
<!--md-->
缩小<!-- .element: class="fragment animated scale-down" -->

```
#### 属性

| 名称                          | 默认值 | 描述   |
| ----------------------------- | ------ | ------ |
| data-animated-scale-down-from | 1      | 起始值 |
| data-animated-scale-down-to   | 0.5    | 最小值 |

### 旋转动画
```html
<!--html-->    
<p class="fragment animated rotate">旋转</p>
<!--md-->
旋转<!-- .element: class="fragment animated rotate" -->

```
#### 属性

| 名称                      | 默认值   | 描述     |
| ------------------------- | -------- | -------- |
| data-animated-rotate-from | `0deg`   | 起始角度 |
| data-animated-rotate-to   | `180deg` | 最大角度 |

## 时间属性
`duration`, `iteration` 和 `fill` 动画属性可以通过以下属性进行控制：

#### 属性
| 名称                     | 必填 | 默认值   | 描述                                                         |
| ------------------------ | ---- | -------- | ------------------------------------------------------------ |
| data-animated-duration   | 否   | 1000     | 动画持续时间(毫秒)                                           |
| data-animated-iterations | 否   | 1        | 动画循环次数                                                 |
| data-animated-fill       | 否   | forwards | 动画最终状态 `forwards`, `none`, `backwards`, `both`, `auto`. 更多属性设置 [MDN: EffectTiming.fill](https://developer.mozilla.org/en-US/docs/Web/API/EffectTiming/fill) |
# 组合动画
从1.2.0版本开始，可以将多个动画组合在一起以创建动画。只需要添加多个CSS类。

```html
<!--html-->
<p class="fragment animated move-to-middle-top rotate">移动并旋转</p>
<!--md-->
移动并旋转<!-- .element: class="fragment animated  move-to-middle-top rotate" -->
```
 [时间属性](#general-time-attributes) 只能用于组合动画，不能单独用于每个动画；
