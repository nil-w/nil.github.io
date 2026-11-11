---
title: rust-生命周期
toc: false
categories:
  - 学习
abbrlink: 6d3c8f51
date: 2024-03-16 09:35:41
tags:
  - rust
  - lifetime
---



# 生命周期

> 生命周期是另一类泛型，我们一直在用。类型的泛型确保类型具有我们想要的行为，而生命周期确保引用在我们需要它的时候一直有效。

## 悬垂引用

生命周期的主要目的是防止悬垂引用 —— 如果允许存在，程序就会引用到并非它本该引用的数据。

```rust
fn main() {
    let r;

    {
        let x = 5;
        r = &x;
    }

    println!("r: {r}");
}
```

报错：

```
error[E0597]: `x` does not live long enough
 --> main.rs:6:13
  |
5 |         let x = 5;
  |             - binding `x` declared here
6 |         r = &x;
  |             ^^ borrowed value does not live long enough
7 |     }
  |     - `x` dropped here while still borrowed
8 |
9 |     println!("r: {r}");
  |                   - borrow later used here
```

`x` 在内层作用域结束时（7 行）就出作用域了，但 `r` 在外层作用域仍然有效 —— 因为 `r` 的作用域更大，我们说它「活得更久」。如果 Rust 允许这样写，`r` 引用的内存已经在 `x` 出作用域时被释放了。

## 借用检查器

Rust 编译器有个**借用检查器**（borrow checker），它比较作用域来判断借用是否有效。

```rust
fn main() {
    let r;                // ---------+-- 'a
                          //          |
    {                     //          |
        let x = 5;        // -+-- 'b  |
        r = &x;           //  |       |
    }                     // -+       |
                          //          |
    println!("r: {r}");   //          |
}                         // ---------+
```

内层 `'b` 块比外层 `'a` 生命周期小得多。编译时 Rust 比较两个生命周期的大小，发现 `r` 的生命周期是 `'a` 但它引用的内存生命周期是 `'b` —— `'b` 比 `'a` 短，被引用的主体活得没有引用久。程序被拒绝。

把 `x` 提到外层就能编译：

```rust
fn main() {
    let x = 5;            // ----------+-- 'b
                          //           |
    let r = &x;           // --+-- 'a  |
                          //   |       |
    println!("r: {r}");   //   |       |
                          // --+       |
}                         // ----------+
```

这里 `x` 的生命周期 `'b` 比 `'a` 大，所以 `r` 可以引用 `x` —— Rust 知道只要 `x` 有效，`r` 里的引用就一定有效。

## 函数签名中的泛型生命周期

写一个返回两个字符串切片中较长者的函数。参数要用字符串切片（引用）而不是字符串，因为不想让函数拿走参数的所有权。

```rust
fn main() {
    let string1 = String::from("abcd");
    let string2 = "xyz";

    let result = longest(string1.as_str(), string2);
    println!("The longest string is {result}");
}

fn longest(x: &str, y: &str) -> &str {
    if x.len() > y.len() { x } else { y }
}
```

编译不过：

```
error[E0106]: missing lifetime specifier
 --> main.rs:8:33
  |
8 | fn longest(x: &str, y: &str) -> &str {
  |               ----     ----     ^ expected named lifetime parameter
  |
  = help: this function's return type contains a borrowed value, but the signature does not say whether it is borrowed from `x` or `y`
help: consider introducing a named lifetime parameter
  |
8 | fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
  |           ++++     ++          ++          ++
```

编译器不知道返回的引用来自 `x` 还是 `y` —— 函数体的 `if` 分支返回 `x`，`else` 分支返回 `y`。定义函数时不知道具体传进来什么值，也不知道引用的具体生命周期，借用检查器同样判断不出来。

加泛型生命周期参数，把关系说清楚：

```rust
fn main() {
    let string1 = String::from("abcd");
    let string2 = "xyz";

    let result = longest(string1.as_str(), string2);
    println!("The longest string is {result}");
}

fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

这个签名告诉 Rust：存在某个生命周期 `'a`，函数接收两个都至少活 `'a` 久的字符串切片，返回的切片也至少活 `'a` 久。

实践上意味着：**返回引用的生命周期 = 两个参数生命周期中较小的那个**。

## 生命周期标注语法

生命周期标注**不改变任何引用的实际存活时间**。它只是描述多个引用的生命周期之间的关系。

名字必须以撇号（`'`）开头，通常全小写且很短。大多数人第一个标注用 `'a`。放在引用的 `&` 之后，用空格分隔：

```rust
&i32        // 一个引用
&'a i32     // 带显式生命周期的引用
&'a mut i32 // 带显式生命周期的可变引用
```

单个生命周期标注本身没多少意义 —— 标注是用来告诉 Rust 多个引用的泛型生命周期参数之间怎么关联的。

在函数签名里用，需要在函数名和参数列表之间的尖括号里声明泛型生命周期参数：

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

标注写在**函数签名**里，不在函数体里。生命周期标注是函数契约的一部分，就像签名里的类型。

传具体的引用进去时，替换 `'a` 的具体生命周期是 `x` 作用域与 `y` 作用域**重叠的部分**。

```rust
fn main() {
    let string1 = String::from("long string is long");

    {
        let string2 = String::from("xyz");
        let result = longest(string1.as_str(), string2.as_str());
        println!("The longest string is {result}");
    }
}

fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

`string1` 活到外层作用域结束，`string2` 活到内层作用域结束，`result` 引用的东西活到内层作用域结束。借用检查器批准，能编译，输出 `The longest string is long string is long`。

如果把 `result` 的声明提到内层作用域外、使用也放到外面，就编译不过：

```rust
fn main() {
    let string1 = String::from("long string is long");
    let result;
    {
        let string2 = String::from("xyz");
        result = longest(string1.as_str(), string2.as_str());
    }
    println!("The longest string is {result}");
}

fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

```
error[E0597]: `string2` does not live long enough
 --> main.rs:7:44
  |
6 |         let string2 = String::from("xyz");
  |             ------- binding `string2` declared here
7 |         result = longest(string1.as_str(), string2.as_str());
  |                                            ^^^^^^^ borrowed value does not live long enough
8 |     }
  |     - `string2` dropped here while still borrowed
9 |     println!("The longest string is {result}");
  |                                      ------ borrow later used here
```

人眼看得出 `string1` 比 `string2` 长，所以 `result` 里装的是 `string1` 的引用，而 `string1` 还没出作用域，引用对 `println!` 仍然有效。但编译器看不出来 —— 我们已经告诉 Rust 返回引用的生命周期等于传入引用的较小者，借用检查器因此拒绝这个可能有无效引用的代码。

## 关系

要指定几个生命周期参数，取决于函数在做什么。

如果把 `longest` 改成永远返回第一个参数，`y` 上就不需要生命周期标注：

```rust
fn longest<'a>(x: &'a str, _y: &str) -> &'a str {
    x
}
```

返回值只跟 `x` 有关，编译器能推出来 `'a` 就是 `x` 的生命周期。但 `'a` 本身**不能省** —— 省略后编译器会报 `missing lifetime specifier`，因为签名里还有第二个输入引用，它无法确定返回值跟哪个关联。

## 'static

```rust
fn main() {
    let s: &'static str = "I have a static lifetime.";
    println!("{s}");
}
```

字符串字面量的文本直接存在程序的二进制里，永远可用，所以所有字符串字面量的生命周期都是 `'static`。

错误信息里有时会建议用 `'static`。但在指定 `'static` 之前，先想想这个引用是不是真的活在整个程序期间 —— 大多数时候，建议 `'static` 恰恰是因为在试图造悬垂引用或生命周期不匹配，这时该修的是那些问题。
