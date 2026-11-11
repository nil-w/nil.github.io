---
title: rust-错误处理
description: Result、Option、? 运算符与自定义错误类型
tags:
  - Rust
  - error-handling
abbrlink: b7ffbc2c
date: 2026-10-30 10:00:00
categories:
  - 学习
---

# 错误处理

Rust 把错误分成两类：**可恢复的**和**不可恢复的**。前者返回给调用方，后者直接终止程序。这个划分不是约定俗成，是类型系统强制的。

## Result 和 Option

`Result<T, E>` 表示一个可能成功的值和一个可能的错误，`Option<T>` 表示一个可能存在的值。

```rust
fn main() {
    let ok: Result<i32, String> = Ok(42);
    let err: Result<i32, String> = Err("出错了".to_string());
    let some: Option<i32> = Some(1);
    let none: Option<i32> = None;

    println!("{:?} {:?} {:?} {:?}", ok, err, some, none);
}
```

输出：

```
Ok(42) Err("出错了") Some(1) None
```

Rust 没有异常，`Result` 的所有值都必须被处理。`match` 是最直接的方式：

```rust
fn parse_port(s: &str) -> Result<u16, String> {
    match s.parse::<u16>() {
        Ok(p) => Ok(p),
        Err(e) => Err(format!("端口解析失败: {}", e)),
    }
}

fn main() {
    for s in ["8080", "abc", "99999"] {
        match parse_port(s) {
            Ok(p) => println!("端口: {}", p),
            Err(e) => println!("错误: {}", e),
        }
    }
}
```

输出：

```
端口: 8080
错误: 端口解析失败: invalid digit found in string
错误: 端口解析失败: number too large to fit in target type
```

注意 `Ok` 和 `Err` 里的值类型不同，分支不能混用。这就是编译器在帮你检查「错误是否被处理」。

## Option 的取法

`Option` 只有两态，处理方式比 `Result` 简单。常用的是 `unwrap_or` 给个默认值：

```rust
fn main() {
    let v = vec![1, 2, 3];

    println!("{:?}", v.first());
    println!("{:?}", v.get(5));
    println!("{}", v.first().unwrap_or(&0));
    println!("{}", v.get(5).unwrap_or(&0));
}
```

输出：

```
Some(1)
None
1
0
```

`unwrap_or` 不消耗 `Option`，因为它拿到的是引用。`unwrap_or_else` 接受闭包，参数是 `Option` 本身：

```rust
fn main() {
    let v: Vec<i32> = vec![];
    println!("{}", v.first().unwrap_or_else(|| &0));
    println!("{:?}", v.first().copied().unwrap_or_default());
}
```

输出：

```
0
0
```

`unwrap_or_default` 要求类型实现 `Default`。这里 `v.first()` 返回 `Option<&i32>`，而 `&i32` 没实现 `Default`，编译器会直接拒绝：

```
error[E0277]: the trait bound `&i32: Default` is not satisfied
 --> t5.rs:4:32
  |
4 |     println!("{:?}", v.first().unwrap_or_default());
  |                                ^^^^^^^^^^^^^^^^^ the trait `Default` is not implemented for `&i32`
help: the trait `Default` is implemented for `i32`
 --> /rustc/31fca3adb283cc9dfd56b49cdee9a96eb9c96ffd/library/core/src/default.rs:154:8
```

所以先 `.copied()` 把引用变成值，再交给 `unwrap_or_default`。这个细节在写的时候很容易忘，编译器能挡住。

## ? 运算符

`match` 写多了会很啰嗦。`?` 运算符把「成功就取值，失败就提前返回」压成一行：

```rust
use std::num::ParseIntError;

fn parse_two(a: &str, b: &str) -> Result<i32, ParseIntError> {
    let x = a.parse::<i32>()?;
    let y = b.parse::<i32>()?;
    Ok(x + y)
}

fn main() {
    println!("{:?}", parse_two("10", "32"));
    println!("{:?}", parse_two("10", "ab"));
}
```

输出：

```
Ok(42)
Err(ParseIntError { kind: InvalidDigit })
```

`?` 的行为是：值是 `Ok(x)` 就取出 `x` 继续，值是 `Err(e)` 就立刻 `return Err(e)`。上面第二行里 `a.parse::<i32>()?` 失败，函数直接返回 `Err`，`b` 那行根本没执行。

关键在类型：`?` 要求错误类型能转成函数的错误类型。这叫「错误转换」，靠 `From` trait 实现：

```rust
use std::fmt;
use std::num::ParseIntError;

#[derive(Debug)]
enum AppError {
    Parse(ParseIntError),
    Missing(&'static str),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            AppError::Parse(e) => write!(f, "解析失败: {}", e),
            AppError::Missing(s) => write!(f, "缺少字段: {}", s),
        }
    }
}

impl std::error::Error for AppError {}

impl From<ParseIntError> for AppError {
    fn from(e: ParseIntError) -> Self {
        AppError::Parse(e)
    }
}

fn parse_port(s: &str) -> Result<u16, AppError> {
    if s.is_empty() {
        return Err(AppError::Missing("port"));
    }
    Ok(s.parse::<u16>()?)
}

fn main() {
    for s in ["8080", "", "99999"] {
        match parse_port(s) {
            Ok(p) => println!("端口: {}", p),
            Err(e) => println!("错误: {}", e),
        }
    }
}
```

输出：

```
端口: 8080
错误: 缺少字段: port
错误: 解析失败: number too large to fit in target type
```

`Ok(s.parse::<u16>()?)` 里的 `?` 走 `From<ParseIntError> for AppError`，把底层错误包进 `AppError::Parse`。这就是自定义错误类型的标准写法：定义枚举，实现 `Display` 和 `Error`，再为每个可能的底层错误实现 `From`。

## panic 与 unwrap

`unwrap` 遇到 `None` 会 panic，程序终止：

```rust
fn main() {
    let n: i32 = "42".parse().unwrap();
    println!("解析成功: {}", n);

    let opt: Option<i32> = None;
    println!("{}", opt.expect("配置里没有这个键"));
}
```

输出（stdout）：

```
解析成功: 42
```

stderr：

```
thread 'main' (687536) panicked at t4.rs:6:39:
配置里没有这个键
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
```

panic 信息走 stderr，不走 stdout，退出码 101。

`expect` 和 `unwrap` 一样会 panic，区别是能带一句说明。这句说明在 panic 时才出现，所以它是给**看日志的人**看的，不是给编译器看的。

用 `expect` 而不是 `unwrap` 的实际价值：出问题时日志里能直接看出是哪个环节炸的。

索引越界也是 panic：

```rust
fn main() {
    let v: Vec<i32> = vec![1, 2, 3];
    println!("{}", v[5]);
}
```

输出（stderr，退出码 101）：

```
thread 'main' (687583) panicked at t3.rs:3:21:
index out of bounds: the len is 3 but the index is 5
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
```

注意这行是**运行时**错误，编译能过。编译期能抓的类型错误是另一个：

```rust
fn main() {
    let x: i32 = "42";
    println!("{}", x);
}
```

编译输出：

```
error[E0308]: mismatched types
 --> e1.rs:2:18
  |
2 |     let x: i32 = "42";
  |            ---   ^^^^ expected `i32`, found `&str`
  |            |
  |            expected due to this

error: aborting due to 1 previous error

For more information about this error, try `rustc --explain E0308`.
```

`Result` 存在就是为了让「可能失败」这件事进到类型里，让编译器逼你处理。`unwrap` 是主动放弃这个检查，代价是运行时炸。

## 什么时候 panic，什么时候返回错误

判断标准很简单：**调用方有没有办法恢复**。

配置读错了、文件不存在、网络超时 —— 调用方可以重试、可以给用户提示、可以换个值，这些都该返回 `Err`。

数组越界、内部状态被破坏、不变量被违反 —— 这类 bug 修复不了，重试只会重复崩溃，该 panic。

`unwrap` 和 `expect` 在库代码里几乎不该出现，在应用代码的启动阶段（读配置、初始化全局状态）可以接受，因为那时候失败就该直接停。
