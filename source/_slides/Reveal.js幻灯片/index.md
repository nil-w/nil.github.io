---
title: 演示reveal.js
theme: league
config:
  autoAnimate: true
  controls: true
  transition: zoom
  transitionSpeed: slow
  backgroundTransition: slide
  showNotes: false
  autoSlide: false
  slideNumber: true
  mermaid:
    theme: dark
---





<!-- .slide: id="slide1" data-background-image="./1.jpeg" data-background-opacity="0.5" -->

# Index 1

### 我是第一个页面
<!-- .element: class="fragment custom blur animated scale-down" data-animated-scale-down-from="10" data-animated-scale-down-to="1" -->

```js [1|2|3|4]
    let a = 1;
    let b = 2;
    let c = x => 1 + 2 + x;
    c(3);
```
<!-- .element: class="fragment fade-in  animated rotate" data-animated-rotate-to="360deg"-->


```mermaid
gantt
dateFormat YYYY-MM-DD
title 流程中心、表单中心
excludes weekdays

section 需求阶段
需求调研 :desc1, 2023-11-15,2023-12-05

section 设计阶段
设计 :desc2,2023-12-05,2023-12-10

section 开发阶段
开发 :desc3,2023-12-01,2023-12-29

section 测试阶段
测试     :desc4,2023-12-20,2023-12-29

section 上线启动
部署培训     :desc5,2023-12-22,2023-12-29
```
<!-- .element: class=" fragment fade-in  animated move-to rotate" data-animated-rotate-to="360deg" data-animated-move-to-top="-50px" data-animated-move-to-left="0px" --->

Note:
第一个页面的备注文件

----



<!-- .slide: id="slide2" data-background-image="./2.jpeg" data-background-opacity="0.5"-->

# Index 2

### 我是第二个页面

<!-- .element: class="fragment fade-in" -->

[打开index1](#/slide1)
<!-- .element: class="fragment fade-in" -->

[打开index3](#/slide3)
<!-- .element: class="fragment fade-in" -->

[打开index3.1](#/slide3.1)
<!-- .element: class="fragment fade-in" -->

[打开index3.2](#/slide3.2)
<!-- .element: class="fragment fade-in" -->

[打开index4](#/slide4)
<!-- .element: class="fragment fade-in" -->

Note:
第二个页面的备注文件


----



<!-- .slide: id="slide3" data-background-image="./3.jpeg" data-background-opacity="0.5"-->

# Index 3

### 我是第三个页面

我是<!-- .element: style="color: lightred" -->
第三<!-- .element:  style="color: lightyellow" -->
个页面<!-- .element: style="color: lightblue" -->

* 一 <!-- .element: class="fragment fade-in" -->
* 二 <!-- .element: class="fragment highlight-red" -->
* 三 <!-- .element: class="fragment fade-out" -->

Note:
第三个页面的备注文件

--



<!-- .slide: id="slide3.1" data-background-image="./3.jpeg" data-background-opacity="0.5" -->

# Index 3.1

### 我是第三个页面


```mermaid
gantt
dateFormat YYYY-MM-DD
title 流程中心、表单中心
excludes weekdays

section 需求阶段
需求调研 :desc1, 2023-11-15,2023-12-05

section 设计阶段
设计 :desc2,2023-12-05,2023-12-10

section 开发阶段
开发 :desc3,2023-12-01,2023-12-29

section 测试阶段
测试     :desc4,2023-12-20,2023-12-29

section 上线启动
部署培训     :desc5,2023-12-22,2023-12-29
```

Note:
第三个页面的备注文件

--

<!-- .slide: id="slide3.2" data-background-image="./3.jpeg" data-background-opacity="0.5" -->

# Index 3.2

### 我是第三个页面

> 我是一个备注文件

Note:
第三个页面的备注文件

----



<!-- .slide: id="slide4" data-background-image="./4.jpeg" data-background-opacity="0.5" -->

# Index 4

### 我是第四个页面

Note:
第四个页面的备注文件



