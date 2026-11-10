---
title: 表单中心功能
theme: dracula
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













<!-- .slide: id="slide1" -->

### 0.多端适配

* 一次绘制表单；<!-- .element: class="fragment custom blur animated scale-down" data-animated-scale-down-from="5" data-animated-scale-down-to="1" -->

* PC、终端、移动端自适应； <!-- .element: class="fragment custom blur animated scale-down" data-animated-scale-down-from="5" data-animated-scale-down-to="1" -->

* CSS 计算适配样式；  <!-- .element: class="fragment custom blur animated scale-down" data-animated-scale-down-from="5" data-animated-scale-down-to="1" -->



----

<!-- .slide: id="slide2" -->

### 1.集成方式

* URL iframe集成；<!-- .element: class="fragment custom blur animated scale-down" data-animated-scale-down-from="5" data-animated-scale-down-to="1" -->
* 前端 SDK 引入；<!-- .element: class="fragment custom blur animated scale-down" data-animated-scale-down-from="5" data-animated-scale-down-to="1" -->
* 前两者兼容；<!-- .element: class="fragment custom blur animated scale-down" data-animated-scale-down-from="5" data-animated-scale-down-to="1" -->



--

<!-- .slide: id="slide3" -->

### 1.1 需求分析

* 需求基本明确；<!-- .element: class="fragment custom blur animated scale-down" data-animated-scale-down-from="5" data-animated-scale-down-to="1" -->
* 类iframe方式微应用集成；<!-- .element: class="fragment custom blur animated scale-down" data-animated-scale-down-from="5" data-animated-scale-down-to="1" -->
* 如何消除接入方技术复杂度？<!-- .element: class="fragment custom blur animated scale-down" data-animated-scale-down-from="5" data-animated-scale-down-to="1" -->

--



<!-- .slide: id="slide4_1" -->

### 1.2 可行技术


**流行的微应用框架**

|对比|qiankun|wujie|micro app|
|---|---|---|---|
|  接入成本  |      高       |          低          |          低          |
|  数据通信  | props属性传递 | 发布订阅+CustomEvent | 发布订阅+CustomEvent |
| 多框架兼容 |       ✔️       |          ✔️           |          ✔️           |
|   js沙箱   |       ✔️       |          ✔️           |          ✔️           |
| window侵入 |       ❎       |          ✔️           |          ✔️           |
|  样式隔离  |       ❎       |          ✔️           |          ✔️           |
|  元素隔离  |       ❎       |          ✔️           |          ✔️           |
|   预加载   |       ✔️       |          ✔️           |          ✔️           |
|  保活模式  |       ❎       |          ✔️           |          ✔️           |

<!-- .element:  style="font-size: 22px" class="fragment custom blur animated scale-down" data-animated-scale-down-from="5" data-animated-scale-down-to="1" -->

--

<!-- .slide: id="slide4" -->

### 1.3 注意点

* 样式隔离；<!-- .element: class="fragment custom blur animated scale-down" data-animated-scale-down-from="5" data-animated-scale-down-to="1" -->
* 资源隔离；<!-- .element: class="fragment custom blur animated scale-down" data-animated-scale-down-from="5" data-animated-scale-down-to="1" -->
* 自定义元素；<!-- .element: class="fragment custom blur animated scale-down" data-animated-scale-down-from="5" data-animated-scale-down-to="1" -->
* 数据通信；<!-- .element: class="fragment custom blur animated scale-down" data-animated-scale-down-from="5" data-animated-scale-down-to="1" -->



----



<!-- .slide: id="slide5" -->

### 2.版式文件

* 类Word编辑器；<!-- .element: class="fragment custom blur animated scale-down" data-animated-scale-down-from="5" data-animated-scale-down-to="1" -->
* 支持编辑器分页；<!-- .element: class="fragment custom blur animated scale-down" data-animated-scale-down-from="5" data-animated-scale-down-to="1" -->
* A4版面样式控制；<!-- .element: class="fragment custom blur animated scale-down" data-animated-scale-down-from="5" data-animated-scale-down-to="1" -->
* PDF\Word导出套打;<!-- .element: class="fragment custom blur animated scale-down" data-animated-scale-down-from="5" data-animated-scale-down-to="1" -->



----



<!-- .slide: id="slide6" -->

### 3.数据存储

* 表单数据缓存在表单中心；

