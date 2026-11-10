---
title: rust-智能指针
toc: false
categories:
  - 学习
abbrlink: 92f6c3d8
date: 2024-03-18 10:12:47
tags:
  - rust
  - box
  - smart-pointer
---



# 智能指针

> 最直接的智能指针是 box，类型写作 `Box<T>`。*Box* 让你把数据存在堆上而不是栈上，留在栈上的只是指向堆数据的指针。

## Box 做什么用

除了把数据放堆上以外没有性能开销，但也没有额外能力。最常用于这几种情况：

- 有一个**编译期无法确定大小**的类型，却要在需要确切大小的上下文里用它
- 有一大块数据，想转移所有权但确保数据**不会被复制**
- 想拥有一个值，只关心它实现了某个 trait，而不关心具体是哪个类型

第一种情况下面会演示。第二种情况下，转移一大块数据的所有权可能要很久，因为数据在栈上被来回复制。把大数据放进 box，栈上只复制小小的指针数据，数据本身留在堆上一个地方。第三种情况叫 **trait object**。

## 把数据存在堆上

```rust
fn main() {
    let b = Box::new(5);
    println!("b = {b}");
}
```

`b` 是一个 `Box`，指向堆上的值 `5`。访问 box 里的数据跟数据在栈上时一样。跟任何拥有的值一样，box 出作用域时被释放 —— 栈上的 box 和它指向的堆数据都会被回收。

单把一个值放堆上没什么用，大多数情况下 `i32` 放在栈上更合适。

## 用 Box 支持递归类型

**递归类型**的值可以包含同类型的另一个值。递归类型有问题是因为 Rust 需要在编译期知道一个类型占多少空间 —— 但递归类型的嵌套理论上可以无限继续，Rust 算不出需要多少空间。因为 box 的大小是已知的，插入一个 box 就能打破递归。

以 cons list 为例。cons list 是函数式语言里常见的数据类型：

```rust
enum List {
    Cons(i32, List),
    Nil,
}
```

这段代码还编译不过，因为 `List` 类型大小未知：

```
error[E0072]: recursive type `List` has infinite size
 --> src/main.rs:2:1
  |
2 | enum List {
  | ^^^^^^^^^
3 |     Cons(i32, List),
  |               ---- recursive without indirection
  |
help: insert some indirection (e.g., a `Box`, `Rc`, or `&`) to break the cycle
  |
3 |     Cons(i32, Box<List>),
  |               ++++    +
```

错误说这个类型「有无限大小」。`List` 的一个变体直接递归地持有另一个自己，Rust 算不出存储一个 `List` 值需要多少空间。

### 间接层

编译器建议的**间接层**（indirection）意思是：不直接存储值，而是存一个指向它的指针。

```rust
enum List {
    Cons(i32, Box<List>),
    Nil,
}

use List::{Cons, Nil};

fn main() {
    let list = Cons(1, Box::new(Cons(2, Box::new(Cons(3, Box::new(Nil))))));
}
```

`Cons` 变体需要 `i32` 的空间加上 box 指针数据的空间。`Nil` 变体不存任何值，占的栈空间比 `Cons` 少。现在我们知道任何 `List` 值都占 `i32` 的大小加上一个 box 指针的大小 —— 递归链被打断，编译器能算出尺寸。

`Cons` 变体不再直接持有另一个 `List` 值，`Box<T>` 指向堆上的下一个 `List` 值。

### 用 Box 写一个实际的链表

```rust
enum List {
    Cons(i32, Box<List>),
    Nil,
}

use List::{Cons, Nil};

fn main() {
    let list = Cons(1, Box::new(Cons(2, Box::new(Cons(3, Box::new(Nil))))));
    match list {
        Cons(first, rest) => {
            println!("first = {first}");
            match *rest {
                Cons(first, rest) => {
                    println!("second = {first}");
                    match *rest {
                        Cons(first, rest) => {
                            println!("third = {first}");
                            match *rest {
                                Nil => println!("end of list"),
                                _ => unreachable!(),
                            }
                        }
                        Nil => println!("end of list"),
                    }
                }
                Nil => println!("end of list"),
            }
        }
        Nil => println!("empty list"),
    }
}
```

输出：

```
first = 1
second = 2
third = 3
end of list
```

写这种嵌套的 `match` 很啰嗦，但目前只能这样 —— 后面会看到 `impl Trait` 怎么改善它。

## Box 提供的两个 trait

Box 只提供间接层和堆分配，没有别的特殊能力，也**没有其他智能指针那种性能开销**。所以在只需要间接层的地方（比如这个 cons list）它很有用。

但 `Box<T>` 之所以是智能指针，是因为它实现了两个 trait：

- **`Deref`** —— 让 `Box<T>` 能像引用一样使用
- **`Drop`** —— `Box<T>` 出作用域时，堆上的数据也会被清理

```rust
use std::ops::Deref;

fn hello(name: &str) {
    println!("Hello, {name}!");
}

fn main() {
    let b = Box::new(String::from("Rust"));
    hello(&b);       // &Box<String> 自动 deref 成 &String
    hello(&*b);      // 显式解引用
}
```

`Deref` 的强制转换让 `&Box<String>` 能传给要 `&str` 的地方 —— 编译器自动加了一层 `*b`。这两个 trait 对后面其他智能指针的功能都很重要。
