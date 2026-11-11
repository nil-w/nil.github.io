---
title: rust-所有权与借用
toc: false
categories:
  - 学习
abbrlink: 4b7e1a92
date: 2024-03-15 09:20:15
tags:
  - rust
  - ownership
  - borrowing
---



# 所有权与借用

> *所有权*（*ownership*）是一组规则，用于管理 Rust 程序如何管理内存。

## 所有权规则

Rust 用第三种方式管理内存：有的语言有垃圾回收器定期回收不再使用的内存，有的语言要求程序员显式分配和释放。Rust 通过所有权系统来管理，编译器会检查这些规则 —— 违反任何一条，程序都编译不过。而且所有权的特性**不会拖慢程序运行**。

三条规则：

- Rust 中每个值都有一个**所有者**（owner）
- 同一时刻只能有一个所有者
- 当所有者离开作用域，值被丢弃（dropped）

## 变量与数据的交互：move

栈与堆：

- 栈：后进先出
- 堆：先进先出

`String` 的数据在堆上，变量本身（指针、长度、容量）在栈上。赋值时如果只复制指针、长度、容量而不复制堆上的数据，听起来像「浅拷贝」—— 但因为 Rust 同时让原变量失效，这被称为 **move**（移动）。

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1;

    println!("{s1}, {s2}");
}
```

编译报错：

```
error[E0382]: borrow of moved value: `s1`
 --> main.rs:5:16
  |
3 |     let s1 = String::from("hello");
  |         -- move occurs because `s1` has type `String`, which does not implement the `Copy` trait
4 |     let s2 = s1;
  |              -- value moved here
5 |     println!("{s1}, {s2}");
  |                ^^ value borrowed here after move
  |
help: consider cloning the value if the performance cost is acceptable
  |
4 |     let s2 = s1.clone();
  |                ++++++++
```

`String` 不实现 `Copy` trait，所以赋值就是移动所有权。`s1` 之后不能再用。

如果确实需要一份副本，用 `clone()`：

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1.clone();

    println!("{s1}, {s2}");
}
```

所有权跟着值走这个规律每次都一样：给另一个变量赋值就是移动它；一个变量（其数据在堆上）离开作用域时，除非所有权已经移交给别的变量，否则值会被 `drop` 清理掉。

## 引用与借用

问题在于：每次都移交所有权再要回来太啰嗦。传参进去用完还得原样传回来，再加上函数体里可能想返回的数据。

引用（reference）跟指针类似 —— 是一个可以跟随的地址，指向存储在某处的数据，那份数据由别的变量拥有。但跟指针不同，**引用保证在它存活的期间指向一个特定类型的有效值**。

```rust
fn main() {
    let s1 = String::from("hello");

    let len = calculate_length(&s1);

    println!("The length of '{s1}' is {len}.");
}

fn calculate_length(s: &String) -> usize { // s 是对 String 的引用
    s.len()
} // 这里 s 离开作用域，但因为 s 不拥有它指向的值，String 不会被 drop
```

`&s1` 创建了一个**引用**指向 `s1` 的值但不拥有它。因为不拥有，引用停止使用时，被指向的值不会被 drop。

与引用相对的是**解引用**（dereferencing），用解引用运算符 `*` 完成。

创建引用这个动作叫**借用**（borrowing）。就像现实生活：如果一个人拥有某样东西，你可以借走，用完要还，你不拥有它。

### 可变引用

变量默认不可变，引用也一样 —— 不允许修改借来的值：

```rust
fn main() {
    let s = String::from("hello");

    change(&s);
}

fn change(some_string: &String) {
    some_string.push_str(", world");
}
```

报错：

```
error[E0596]: cannot borrow `*some_string` as mutable, as it is behind a `&` reference
 --> main.rs:7:5
  |
7 |     some_string.push_str(", world");
  |     ^^^^^^^^^^^ `some_string` is a `&` reference, so it cannot be borrowed as mutable
  |
help: consider changing this to be a mutable reference
  |
6 | fn change(some_string: &mut String) {
  |                         +++
```

改用**可变引用**（mutable reference）：

```rust
fn main() {
    let mut s = String::from("hello");

    change(&mut s);
}

fn change(some_string: &mut String) {
    some_string.push_str(", world");
}
```

### 可变引用的限制

可变引用有个大限制：有了对一个值的可变引用，就不能再有其他指向该值的引用。

```rust
fn main() {
    let mut s = String::from("hello");

    let r1 = &mut s;
    let r2 = &mut s;

    println!("{r1}, {r2}");
}
```

报错：

```
error[E0499]: cannot borrow `s` as mutable more than once at a time
 --> main.rs:5:14
  |
4 |     let r1 = &mut s;
  |              ------ first mutable borrow occurs here
5 |     let r2 = &mut s;
  |              ^^^^^^ second mutable borrow occurs here
6 |     println!("{r1}, {r2}");
  |                -- first borrow later used here
```

可变引用和不可变引用混用也不行：

```rust
fn main() {
    let mut s = String::from("hello");

    let r1 = &s; // no problem
    let r2 = &s; // no problem
    let r3 = &mut s; // BIG PROBLEM

    println!("{r1}, {r2}, and {r3}");
}
```

报错：

```
error[E0502]: cannot borrow `s` as mutable because it is also borrowed as immutable
 --> main.rs:6:14
  |
4 |     let r1 = &s; // no problem
  |              -- immutable borrow occurs here
5 |     let r2 = &s; // no problem
6 |     let r3 = &mut s; // BIG PROBLEM
  |              ^^^^^^ mutable borrow occurs here
7 |
8 |     println!("{r1}, {r2}, and {r3}");
  |                -- immutable borrow later used here
```

用不可变引用的人不希望值在脚下突然变了。但多个不可变引用是允许的 —— 单纯读数据的人没法影响别人读到的数据。

引用的作用域从它被引入开始，到**最后一次使用**为止。所以这样能编译：

```rust
fn main() {
    let mut s = String::from("hello");

    let r1 = &s; // no problem
    let r2 = &s; // no problem
    println!("{r1} and {r2}");
    // r1 和 r2 之后不会再被使用

    let r3 = &mut s; // no problem
    println!("{r3}");
}
```

`r1`、`r2` 的作用域在 `println!` 之后结束，早于可变引用 `r3` 的创建。两个作用域不重叠。

用花括号开新作用域可以造出多个可变引用，只是不能**同时**存在：

```rust
fn main() {
    let mut s = String::from("hello");

    {
        let r1 = &mut s;
    } // r1 在这里离开作用域，所以可以再建一个引用

    let r2 = &mut s;
}
```

### 悬垂引用

在有指针的语言里，很容易不小心造出**悬垂引用**（dangling reference）—— 指向的内存可能已经给了别人。Rust 里编译器保证引用永远不会悬垂：有引用的数据，编译器确保数据的生命周期不会比引用短。

```rust
fn main() {
    let reference_to_nothing = dangle();
}

fn dangle() -> &String {
    let s = String::from("hello");

    &s
}
```

报错：

```
error[E0106]: missing lifetime specifier
 --> main.rs:5:16
  |
5 | fn dangle() -> &String {
  |                ^ expected named lifetime parameter
  |
  = help: this function's return type contains a borrowed value, but there is no value for it to be borrowed from
help: consider using the `'static` lifetime, but this is uncommon unless you're returning a borrowed value from a `const` or a `static`
  |
5 | fn dangle() -> &'static String {
  |                 +++++++
help: instead, you are more likely to want to return an owned value
  |
5 - fn dangle() -> &String {
5 + fn dangle() -> String {
  |
```

`s` 在 `dangle` 内部创建，函数结束时被释放，而我们却返回了指向它的引用 —— 这个引用会指向无效的 `String`。Rust 不让这么写。

解法是直接返回 `String`：

```rust
fn main() {
    let string = no_dangle();
}

fn no_dangle() -> String {
    let s = String::from("hello");

    s
}
```

所有权被移出，没有任何东西被释放。

## 小结

- 任意时刻，要么有一个可变引用，要么有任意多个不可变引用
- 引用必须始终有效
