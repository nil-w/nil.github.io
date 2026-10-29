---
title: rust入门
toc: false
categories:
  - 学习
abbrlink: 94fe59ce
date: 2024-03-11 09:30:48
tags:
  - cargo
  - rustc
  - rustup
---



# Cargo是什么？

`Cargo`是rust的构建工具、包管理器；

### crate是什么？

&emsp;&emsp;crate类似npm package或ruby gem，类似`依赖包`的意思；

# rust和动态语言对比



# rust库

### std io标准库



### let声明变量

```rust
let apples = 5; // 不可变
let mut bananas = 5; // 可变
```



### 整型

| 长度                                           | 有符号 | 无符号 |
| ---------------------------------------------- | ------ | ------ |
| 8-bit                                          | i8     | U8     |
| 16-bit                                         | i16    | u16    |
| 32-bit                                         | i32    | u32    |
| 64-bit                                         | i64    | U64    |
| 128-bit                                        | i128   | u128   |
| arch（由CPU架构决定大小 x86为32位，x64为64位） | isize  | Usize  |

| 数字字面值                 | 例子        |
| -------------------------- | ----------- |
| Decimal(十进制)            | 98_222      |
| Hex(十六进制)              | 0xff        |
| Octal(八进制)              | 0o77        |
| Binary(二进制)             | 0b1111_0000 |
| Byte(单字节字符)(仅限于u8) | b'A'        |



### 浮点型

Rust的浮点数类型是 `f32`和`f64`,分别占32位和64位，默认类型是`f64`

浮点数采用 IEEE-754 标准表示。`f32` 是单精度浮点数，`f64` 是双精度浮点数。

### 布尔型

Rust的布尔类型有两个值: `true`和`false`,使用 `bool`表示；

### 字符类型

Rust的 `char`类型是语言中原生的字符类型；使用 `''`声明字符类型，字符串使用 `""`声明；

### 复合类型

Rust有两个原生复合类型: 元组（tuple）和数组 （array）

#### 元组 Tuple

```rust
fn main() {
    let x: (i32, f64, u8) = (500, 6.4, 1);

    let five_hundred = x.0;

    let six_point_four = x.1;

    let one = x.2;
}
```

#### 数组 Array

```rust
let a: [i32; 5] = [1, 2, 3, 4, 5];

let first = a[0];
let end = a[4];
```



### fn、main

`fn`用于声明函数，`main`函数为程序入口；

在函数声明中，必须声明每个参数的类型。

```rust
fn main(){
	print_labeled_measurement(5,'h');
}

fn print_labeled_measurement(value: i32,unit_label: char){
  println!("The measurement is: {value}{unit_label}")
}

fn five() -> i32{
  5
}
```

语句和表达式的区别,语句需要`;`修饰，表达式不需要。

```rust
fn main() {
    let x = plus_one(5); //语句

    println!("The value of x is: {x}"); //语句
}

fn plus_one(x: i32) -> i32 {
    x + 1 //表达式
}

```

##### **练习-斐波那契数列**

```rust
fn main() {
    fibonacci(22);
}

fn fibonacci(n: i32) -> i32 {
    match n {
        0 => 0,
        1 =>1,
        2 => 1,
        _ => fibonacci(n-1) + fibonacci(n-2),
    }
}

```



### 注释

```rust
//这是第一行注释
//这是第二行注释
//这是第三行注释
```

#### 文档注释

```rust
///这是第一行注释
///这是第二行注释
///这是第三行注释


//! #这是第一行注释
//!
//! ###这是第三行注释
```



### if表达式

```rust
fn main(){
  let number = 3;
  if number < 3 {
    printlin!("Number is less than 3 ")
  }else{
     printlin!("Number is greater than or equal to 3 ")
  }
}
```

#### 在let语句中使用if else

提示: if else的分支类型要匹配，否则会提示编译错误

```rust
fn main(){
	let number = 3;
	let result = if number >= 3 { 10 } else {0};
	println!("The value of number is: {result}")
}
```



### loop循环

```rust
fn main() {
    let mut  count = 0;

    'counting_up: loop {
        println!("count = {count}");
        let mut remaining = 10;

        loop{
            println!("remaining = {remaining}");
            if remaining == 9 {
                break;
            }

            if count == 2{
                break 'counting_up;
            }
            remaining -= 1;
        }
        count += 1;
    }

    println!("End count = {count}")

}
```

### while循环

```rust
fn main(){
	let mut number = 3;

    while number != 0 {
        println!("{number}");
        number -= 1;
    }

    println!("End");
}
```

### for循环

```rust
fn main(){
		let a = [10,20,30,40,50];

    for element in a {
        println!("the value is: {element}");
    }
}
```



### match 分支

用于分支判断，类似其他语言的switch(condition){}

```rust
let guess: u32 = match guess.trim().parse() {
            Ok(num) => num,
            Err(_) => continue,
        };
```



### const 常量

常量和其他语言类似，约定大写+`_`命名





### 所有权(ownership)

* 堆: 先进先出；
* 栈: 先进后出；

#### 所有权规则

* rust 中的每一个值都有一个 `owner`；
* 值在任一时刻有且只有一个`owner`；
* 当`owner`离开作用域，这个值将被丢弃；

#### 变量作用域

```rust
{                      // s 在这里无效，它尚未声明
        let s = "hello";   // 从此处起，s 是有效的
        // 使用 s
 }                      // 此作用域已结束，s 不再有效
```





### String 类型

> 如果你在其他语言中听说过术语 **浅拷贝**（*shallow copy*）和 **深拷贝**（*deep copy*），那么拷贝指针、长度和容量而不拷贝数据可能听起来像浅拷贝。不过因为 Rust 同时使第一个变量无效了，这个操作被称为 **移动**（*move*），而不是叫做浅拷贝。上面的例子可以解读为 `s1` 被 **移动** 到了 `s2` 中。

```rust
let s1 = String::from("hello");
let s2 = s1;
  		//-- value moved here
println!("{s1}");
				//^^^^ value borrowed here after move
```

### `Copy`类型

- 所有整数类型，比如 `u32`。
- 布尔类型，`bool`，它的值是 `true` 和 `false`。
- 所有浮点数类型，比如 `f64`。
- 字符类型，`char`。
- 元组，当且仅当其包含的类型也都实现 `Copy` 的时候。比如，`(i32, i32)` 实现了 `Copy`，但 `(i32, String)` 就没有。



### 引用（References）与借用



`&`语法让我们创建一个指向的引用，但并不拥有。

```rust
fn main() {
    let s1 = String::from("hello");

    let len = calculate_length(&s1);

    println!("The length of '{}' is {}.", s1, len);
}

fn calculate_length(s: &String) -> usize {
    s.len()
}
```



`& mut` 可变引用，可修改应用的值；

限制: 

- 在任意给定时间，**要么** 只能有一个可变引用，**要么** 只能有多个不可变引用。
- 引用必须总是有效的。

**数据竞争**（*data race*）类似于竞态条件，它可由这三个行为造成：

- 两个或更多指针同时访问同一数据。
- 至少有一个指针被用来写入数据。
- 没有同步数据访问的机制。

```rust
fn main() {
    let mut s1 = String::from("hello");
    change(&mut s1);

    println!("The length of '{}' is {}.", s1, s1.len());
}

fn change(s: &mut String){
    s.push_str(", world!!!!");
}

```



### Slice类型

>  *slice* 允许你引用集合中一段连续的元素序列，而不用引用整个集合。slice 是一种引用，所以它没有所有权。

先看一个需求：写一个函数，接受由空格分隔的字符串，返回第一个单词。如果没有找到空格，整个字符串就是一个单词，要全部返回。

不用 slice 时的签名：

```rust
fn first_word(s: &String) -> ?
```

参数是 `&String`，不需要所有权，这没问题。但返回值该是什么？没没有办法表示「字符串的一部分」。只能返回空格所在的字节下标：

```rust
fn first_word(s: &String) -> usize {
    let bytes = s.as_bytes();

    for (i, &item) in bytes.iter().enumerate() {
        if item == b' ' {
            return i;
        }
    }

    s.len()
}
```

`as_bytes` 把 `String` 转成字节数组，`iter` 返回迭代器，`enumerate` 把每个元素包成「下标 + 元素引用」的元组 —— 用模式解构出来，比自己算下标方便。

但返回下标很别扭，调用方还得自己再切片一次。slice 直接返回「一部分」：

```rust
fn first_word(s: &str) -> &str {
    for (i, &item) in s.as_bytes().iter().enumerate() {
        if item == b' ' {
            return &s[0..i];
        }
    }

    s
}
```

注意返回值的生命周期是**省略**的。编译器根据规则推断：

1. 只有一个输入生命周期参数时（`&self` 除外），这个生命周期被赋给所有输出生命周期参数
2. 方法有 `&self` 时，输出生命周期等于 `self` 的生命周期

这里 `s: &str` 有唯一输入生命周期，所以 `-> &str` 的生命周期就是 `s` 的。

字符串切片和数组切片是同一套东西：

```rust
fn main() {
    let a = [1, 2, 3, 4, 5];
    let slice = &a[1..3];   // 包含 a[1] 和 a[2]，不含 a[3]

    println!("{:?}", slice);   // [2, 3]
}
```

范围语法 `&a[1..3]`：

- `..` 是 `0..`
- `..3` 是 `0..3`
- `1..` 是 `1..len`
- `1..3` 不含右端点

数组切片是编译期定长且连续存储，**越界会 panic**：

```rust
fn main() {
    let a = [1, 2, 3, 4, 5];
    let slice = &a[1..3];
    println!("{:?}", slice);
}
```

```rust
fn main() {
    let a = [1, 2, 3, 4, 5];
    let slice = &a[1..6];   // panic：range end index 6 out of range for slice of length 5
    println!("{:?}", slice);
}
```

字符串切片的边界要落在字符边界上，否则 panic：

```rust
fn main() {
    let s = String::from("hello");
    let slice = &s[0..2];   // 正常
    println!("{slice}");
}
```

```rust
fn main() {
    let s = String::from("你好");
    let slice = &s[0..1];   // panic：end byte index 1 is not a char boundary
    println!("{slice}");
}
```














