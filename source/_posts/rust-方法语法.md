---
title: rust-方法语法
toc: false
categories:
  - 学习
abbrlink: d1274d86
date: 2024-03-13 17:18:32
tags:
  - rust
  - method
  - syntax
---



# 方法语法

> **方法**（method）与函数类似：它们使用 `fn` 关键字和名称声明，可以拥有参数和返回值，同时包含在某处调用该方法时会执行的代码。不过方法与函数是不同的，因为它们在结构体的上下文中被定义（或者是枚举或 trait 对象的上下文，并且它们第一个参数总是 `self`，它代表调用该方法的结构体实例。

## 方法定义

使用`impl`块为结构定义方法；

```rust
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    fn area(&self) -> u32 {
        self.width * self.height
    }

  	fn can_hold(&self,target: &Rectangle ) -> bool {
      self.width > target.width && self.height > target.height
    }

  	// 关联函数经常被用作返回一个结构体新实例的构造函数。
  	// 这些函数的名称通常为 new ，但 new 并不是一个关键字。
    fn square(size: u32) -> Self{
        Self {
            width: size,
            height: size,
        }
    }
}

fn main() {
    let rect = Rectangle::square(30);

    let rect1 = Rectangle { width: 10, height: 30 };

    let rect2 = Rectangle { width: 60, height: 80 };
    dbg!(&rect);
    println!("The area of the rectangle is {} square pixels.", rect.area());
  	println!("Can rect hold rect1? {}", rect.can_hold(&rect1));
    println!("Can rect hold rect2? {}", rect.can_hold(&rect2));
}
```



