---
title: rust-结构定义和实例化
toc: false
categories:
  - 学习
abbrlink: e0d5ed17
date: 2024-03-13 16:53:22
tags:
  - struct
  - rust
---



# 结构定义

> 定义结构体，需要使用 `struct` 关键字并为整个结构体提供一个名字。结构体的名字需要描述它所组合的数据的意义。接着，在大括号中，定义每一部分数据的名字和类型，我们称为 **字段**（*field*）。



以下演示了结构定义、打印对象、debug打印对象；

* 可以定义有字段和无字段结构，包括类似`Tuple`（元组）的方式定义；
* `println!`和`dbg!`打印对象需要在结构上添加外部属性 `#[derive(Debug)]`；
* `dbg!`宏打印需要注意值引用；

```rust
#[derive(Debug)]
struct User {
    active: bool,
    username: String,
    email: String,
    sign_in_count: u64,
}
#[derive(Debug)]
struct Color(i32,i32,i32);
#[derive(Debug)]
struct Point(i32,i32, i32);
#[derive(Debug)]
struct AlwaysEqual;

#[derive(Debug)]
struct Square(u32,u32);


fn main() {
    println!("Hello, world!");

    let mut user =  build_user("dong33@163.com","dong33");

    println!("user is {:?}",user);

    let mut user1 = User{
        active: true,
        username: user.username,
        email: user.email,
        sign_in_count: 1,
    };


    println!("user1 is {:?}",user1);
    dbg!(user1);

    let black = Color(0,0,0);


    println!("black is {:?}",black);
    dbg!(black);

    let origin = Point(0,0,0);

    println!("origin is {:?}",origin);
    dbg!(origin);

    let subject = AlwaysEqual;
    println!("subject is {:?}",subject);
    dbg!(subject);


    let width = 30;
    let height = 50;

    println!(" area is {}",area(width, height));


    let rect = Square(30,50);
    println!("rect is {:?}",rect);
    dbg!(&rect);


    println!("square area is {}",area_square(&rect));

}


fn build_user(email: &str,username: &str) -> User {
    User {
        active: true,
        username: String::from(username),
        email: String::from(email),
        sign_in_count: 1,
    }
}


fn area(width: u32,height: u32) -> u32{
    width * height
}


fn area_square(square: &Square) -> u32{
    square.0 * square.1
}


```

