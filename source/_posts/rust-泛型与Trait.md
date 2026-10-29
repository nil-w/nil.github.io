---
title: rust-泛型与Trait
toc: false
categories:
  - 学习
abbrlink: a1e05b74
date: 2024-03-17 10:05:28
tags:
  - rust
  - trait
  - generic
---



# 泛型与 Trait

> trait 定义了某个类型所具有、并能与其他类型共享的功能。我们用 trait 以抽象的方式定义共享行为，用 trait bound 指定某个泛型可以是任何具备特定行为的类型。

## 定义 trait

一个类型的行为由我们能在这个类型上调用的方法组成。不同类型如果能调用相同的方法，就共享同一行为。trait 定义就是把这些方法签名归到一起，定义完成某个目的所需的一组行为。

比如有多个持有不同种类和数量文本的结构体：`NewsArticle` 存放某地点的新闻报道，`SocialPost` 最多 280 个字符并带元数据。我们想做一个叫 `aggregator` 的媒体聚合库，能显示来自任一类型的摘要。

```rust
pub trait Summary {
    fn summarize(&self) -> String;
}
```

用 `trait` 关键字声明 trait，再写 trait 名。声明成 `pub` 让依赖这个 crate 的包也能用。花括号里声明方法签名，这里是 `fn summarize(&self) -> String`。

方法签名后面**不写实现**，用分号结尾。每个实现该 trait 的类型都必须自己提供方法体。编译器会强制保证：任何拥有 `Summary` trait 的类型都有签名完全一致的 `summarize` 方法。

一个 trait 里可以有多个方法，签名一行一个，每行以分号结尾。

## 为类型实现 trait

```rust
impl Summary for NewsArticle {
    fn summarize(&self) -> String {
        format!("{}, by {} ({})", self.headline, self.author, self.location)
    }
}
```

实现之后就能当普通方法调用：

```rust
fn main() {
    let article = NewsArticle {
        headline: String::from("Penguins win the Stanley Cup Championship!"),
        location: String::from("Pittsburgh, PA, USA"),
        author: String::from("Iceburgh"),
        content: String::from("The Pittsburgh Penguins once again are the best hockey team in the NHL."),
    };
    println!("New article available! {}", article.summarize());
}
```

输出：

```
New article available! Penguins win the Stanley Cup Championship!, by Iceburgh (Pittsburgh, PA, USA)
```

## 默认实现

有时给 trait 里的部分或全部方法提供默认行为，比要求每个类型都实现所有方法更有用。实现时可以保留或覆盖每个方法的默认行为。

```rust
pub trait Summary {
    fn summarize(&self) -> String {
        String::from("(Read more...)")
    }
}
```

要用默认实现，实现时给一个**空的 impl 块**：

```rust
pub struct NewsArticle {
    pub headline: String,
}

impl Summary for NewsArticle {}
```

```rust
fn main() {
    let article = NewsArticle {
        headline: String::from("Penguins win the Stanley Cup Championship!"),
    };
    println!("New article available! {}", article.summarize());
}
```

输出：

```
New article available! (Read more...)
```

覆盖默认实现的语法，跟实现一个没有默认实现的方法完全一样 —— 所以加了默认实现不需要改动其他类型的实现。

默认实现可以调用同一个 trait 里的其他方法，**即使那些方法没有默认实现**。这样 trait 能提供大量实用功能，只要求实现者指定一小部分。

## 泛型

泛型是「泛型参数的类型」。

```rust
fn largest<T: PartialOrd + Copy>(list: &[T]) -> T {
    let mut largest = list[0];
    for &item in list.iter() {
        if item > largest {
            largest = item;
        }
    }
    largest
}
```

- `<T: PartialOrd + Copy>` 是**trait bound**：类型参数 `T` 必须实现 `PartialOrd`（能比较大小）和 `Copy`（复制不丢所有权）
- `Copy` 是必需的，因为 `largest = item` 是把值移出去，`item` 来自解构模式的 `&item`，没有 `Copy` 的话 `item` 已经被移空，不能再赋值
- `PartialOrd` 是必需的，因为 `item > largest` 需要比较

```rust
fn main() {
    let numbers = vec![34, 51, 2, 3, 5, 6];
    let result = largest(&numbers);
    println!("The largest number is {result}");
}
```

输出：

```
The largest number is 51
```

### 多个类型参数

两个类型参数不意味着能直接比较 —— `a > b` 要求两边是同一类型：

```rust
fn compare<T: PartialOrd>(a: &T, b: &T) -> bool {
    a > b
}
```

```rust
fn main() {
    println!("{}", compare(&1, &2));    // false
    println!("{}", compare(&2, &1));    // true
}
```

如果确实要比较两个**不同**类型，得换个比较方式（比如先转成字符串），并为两者都加上 `Display` 约束：

```rust
use std::fmt::Display;

fn compare<T: PartialOrd + Display, U: PartialOrd + Display>(a: &T, b: &U) -> bool {
    a.to_string() > b.to_string()
}
```

### where 子句

trait bound 多了，`where` 子句更好读：

```rust
use std::fmt::Display;

fn longest_with_an_announcement<'a, T>(
    x: &'a str,
    y: &'a str,
    ann: T,
) -> &'a str
where
    T: Display,
{
    println!("Announcement! {ann}");
    if x.len() > y.len() { x } else { y }
}
```

因为生命周期也是一种泛型，`'a` 和类型参数 `T` 写在同一个尖括号列表里。

## 孤儿规则

不能为**既不是本地类型、其 trait 也不是本地 trait** 的组合实现 trait —— 这叫孤儿规则（orphan rule）。

比如 `Vec` 和 `Display` 都来自标准库，你两者都不是本地的那个，所以不能给 `Vec<String>` 实现 `Display`：

```
error[E0277]: `Vec<String>` doesn't implement `std::fmt::Display`
 --> src/main.rs:6:20
  |
6 |     println!("{}", v);
  |               --   ^ `Vec<String>` cannot be formatted with the default formatter
```

绕过的办法是包一层新类型 —— `MyDisplay` 是本地类型，给它实现 `Display` 就合法：

```rust
use std::fmt::Display;

struct MyDisplay(String);

impl Display for MyDisplay {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}
```

## 小结

- 泛型类型参数让代码能用在不同类型上
- trait 和 trait bound 保证代码虽然泛型，仍有它需要的行为
- 生命周期标注保证这种灵活的代码不会有悬垂引用
- 所有这些分析都发生在编译期，不影响运行时性能
