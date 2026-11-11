---
title: rust-if-let简洁控制流
toc: false
categories:
  - 学习
abbrlink: eec35d0e
date: 2024-03-14 08:41:12
tags:
  - if
  - let
  - rust
---



# if let 控制流

> `if let` 语法把 `if` 和 `let` 合并成一种更简洁的方式，用来处理只匹配一个模式、忽略其余情况的值。

## if let

`match` 处理 `Option<u8>` 时，如果只关心 `Some` 分支，还得补一个 `_ => ()` 来满足穷尽性检查，很啰嗦：

```rust
fn main() {
    let config_max = Some(3u8);
    match config_max {
        Some(max) => println!("The maximum is configured to be {max}"),
        _ => (),
    }
}
```

`if let` 写法更短，行为完全一样：

```rust
fn main() {
    let config_max = Some(3u8);
    if let Some(max) = config_max {
        println!("The maximum is configured to be {max}");
    }
}
```

`if let` 的语法是「模式 = 表达式」，跟 `match` 一样把表达式交给 `match`、模式作为第一个分支。这里模式是 `Some(max)`，`max` 绑定 `Some` 里的值。

代价是**丢掉了 `match` 的穷尽性检查** —— 用 `if let` 就没法保证你漏掉了某个分支。选择哪个取决于具体场景，以及这个简洁是否值得。

可以理解为：`if let` 是「匹配一个模式、其余全部忽略」的 `match` 语法糖。

## if let else

`if let` 可以配 `else`，`else` 分支对应等价 `match` 里的 `_` 分支：

```rust
#[derive(Debug)]
enum UsState {
    Alabama,
    Alaska,
}

#[allow(dead_code)]
enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter(UsState),
}

fn main() {
    let coin = Coin::Penny;
    let mut count = 0;
    if let Coin::Quarter(state) = coin {
        println!("State quarter from {state:?}!");
    } else {
        count += 1;
    }
    println!("count = {count}");
}
```

## let else

常见模式是「值存在就干活，否则返回默认值」。用 `if let` 会把逻辑塞进分支体里，主流程反而看不清：

```rust
#[derive(Debug)]
enum UsState {
    Alabama,
    Alaska,
}

impl UsState {
    fn existed_in(&self, year: u16) -> bool {
        match self {
            UsState::Alabama => year >= 1819,
            UsState::Alaska => year >= 1959,
        }
    }
}

#[allow(dead_code)]
enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter(UsState),
}

fn describe_state_quarter(coin: Coin) -> Option<String> {
    let Coin::Quarter(state) = coin else {
        return None;
    };

    if state.existed_in(1900) {
        Some(format!("{state:?} is pretty old, for America!"))
    } else {
        Some(format!("{state:?} is relatively new."))
    }
}

fn main() {
    if let Some(desc) = describe_state_quarter(Coin::Quarter(UsState::Alaska)) {
        println!("{desc}");
    }
    if let Some(desc) = describe_state_quarter(Coin::Quarter(UsState::Alabama)) {
        println!("{desc}");
    }
    if let Some(desc) = describe_state_quarter(Coin::Penny) {
        println!("{desc}");
    } else {
        println!("不是25美分硬币");
    }
}
```

`let...else` 左边是模式，右边是表达式，没有 `if` 分支，只有 `else` 分支。模式匹配就把值绑定到外层作用域，不匹配就走 `else`，而 `else` **必须从函数返回**。

这样主流程留在「happy path」上，不用为一个分支搞出明显不同的控制流。
