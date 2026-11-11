---
title: rust-枚举与模式匹配
toc: false
categories:
  - 学习
abbrlink: 7d69317e
date: 2024-03-13 17:35:29
tags:
  - enum
  - rust
---



# 枚举

> 结构体给予你将字段和数据聚合在一起的方法，像 `Rectangle` 结构体有 `width` 和 `height` 两个字段。而枚举给予你一个途径去声明某个值是一个集合中的一员。比如，我们想让 `Rectangle` 是一些形状的集合，包含 `Circle` 和 `Triangle` 。为了做到这个，Rust 提供了枚举类型。



```rust

#[derive(Debug)]
enum IpAddrKind {
    V4(u8,u8,u8,u8),
    V6(String),
}

#[derive(Debug)]
enum Message{
    Quit,
    Move{x: i32,y:i32},
    Write(String),
    ChangeColor(i32,i32,i32),
}

impl Message{
    fn call(&self){
        println!("self is {:?}",&self)
    }
}

fn main() {
    println!("Hello, world!");

    let four = IpAddrKind::V4(127,0,0,1);
    let six = IpAddrKind::V6(String::from("::1"));

    dbg!(&four);
    dbg!(&six);

    let m = Message::Move { x: 1, y: 2 };
    m.call();
}

```



# match匹配模式

## Option枚举

> `Option` 是标准库定义的另一个枚举。`Option` 类型应用广泛因为它编码了一个非常普遍的场景，即一个值要么有值要么没值。

```rust
#[derive(Debug)]
enum Coin{
    Penny,
    Nickel,
    Dime,
    Quarter,
}

fn main() {
    println!("Hello, world!");
    let v = value_in_cents(Coin::Quarter);
    println!("value_in_cents(coin) = {}", v);
}

fn value_in_cents(coin: Coin) -> u32 {
    match coin {
        Coin::Penny => 1,
        Coin::Nickel => 5,
        Coin::Dime => 10,
        Coin::Quarter => 25,
    }
}

```

