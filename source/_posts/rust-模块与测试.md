---
title: rust-模块与测试
description: mod 声明、可见性规则，以及用 #[cfg(test)] 组织单元测试
tags:
  - Rust
  - module
  - test
abbrlink: 2d9a7d08
date: 2026-10-30 11:00:00
categories:
  - 学习
---

# 模块与测试

## mod 声明

模块用 `mod` 声明，块内的内容默认私有：

```rust
mod geometry {
    pub fn area(w: f64, h: f64) -> f64 {
        w * h
    }

    fn helper() -> i32 {
        42
    }
}

fn main() {
    println!("面积: {}", geometry::area(3.0, 4.0));
}
```

输出：

```
面积: 12
```

`helper` 没有 `pub`，所以模块外部调不到。编译器会拦住：

```rust
mod geometry {
    fn secret() -> i32 { 42 }
    pub fn open() -> i32 { secret() }
}

fn main() {
    println!("{}", geometry::secret());
}
```

编译输出：

```
error[E0603]: function `secret` is private
 --> e3.rs:7:27
  |
7 |     println!("{}", geometry::secret());
  |                           ^^^^^^ private function
  |
note: the function `secret` is defined here
 --> e3.rs:2:5
  |
2 |     fn secret() -> i32 { 42 }
  |     ^^^^^^^^^^^^^^^^^^^^^

error: aborting due to 1 previous error
```

私有性是**逐层**的，一个模块里的 `pub` 不代表外面能直接访问它内部的私有子模块：

```rust
mod outer {
    mod private_mod {
        pub fn hello() -> &'static str { "hi" }
    }
    pub fn call() -> &'static str { private_mod::hello() }
}

fn main() {
    println!("{}", outer::private_mod::hello());
}
```

编译输出：

```
error[E0603]: module `private_mod` is private
 --> e4.rs:9:27
  |
9 |     println!("{}", outer::private_mod::hello());
  |                           ^^^^^^^^^^^  ----- function `hello` is not publicly re-exported
  |                           |
  |                           private module
  |
note: the module `private_mod` is defined here
 --> e4.rs:2:5
  |
2 |     mod private_mod {
  |     ^^^^^^^^^^^^^^^
```

注意错误信息里那句 `function hello is not publicly re-exported` —— `pub fn` 只让 `hello` 在 `private_mod` 内部可见，`private_mod` 本身私有，所以外面拿不到。

## pub(crate) 和可见性等级

可见性有三档：

- `pub`：完全公开，外部 crate 也能用
- `pub(crate)`：只在当前 crate 内可见
- 不写：只在当前模块及其子模块内可见

`pub(crate)` 用来暴露「crate 内部可用但不承诺对外」的 API，避免把实现细节固化成公开接口：

```rust
mod config {
    pub(crate) const TIMEOUT: u32 = 30;
    pub const VERSION: &str = "1.0";

    mod internal {
        pub fn helper() -> &'static str { "helper" }
    }

    pub fn call() -> &'static str {
        internal::helper()
    }
}

use config::{TIMEOUT as T, VERSION};
use crate::config::call;

fn main() {
    println!("超时: {}s", T);
    println!("版本: {}", VERSION);
    println!("调用: {}", call());
}
```

输出：

```
超时: 30s
版本: 1.0
调用: helper
```

`use` 有三个细节：

- `use config::{TIMEOUT as T, VERSION}` 可以一次导入多个，`as` 起别名
- `use crate::config::call` 里的 `crate` 指当前 crate 根
- `use` 写在哪个作用域，就只能在该作用域用。写在 `main` 里的 `use` 只对 `main` 有效

## 单元测试

Rust 的测试写在被测模块内部的一个 `#[cfg(test)]` 子模块里：

```rust
mod geometry {
    pub fn area(w: f64, h: f64) -> f64 {
        w * h
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn test_area() {
            assert_eq!(area(3.0, 4.0), 12.0);
        }

        #[test]
        fn test_area_zero() {
            assert_eq!(area(0.0, 5.0), 0.0);
        }
    }
}

fn main() {
    println!("面积: {}", geometry::area(3.0, 4.0));
}
```

用 `rustc --test` 编译后运行：

```
running 2 tests
test geometry::tests::test_area ... ok
test geometry::tests::test_area_zero ... ok

test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```

`#[cfg(test)]` 的意思是「只在编译测试版本时包含这段代码」。正常编译成可执行文件时，整个 `mod tests` 被跳过，所以测试代码不占产物体积，也不会引入测试专用的依赖。

`use super::*;` 把父模块的东西全导入，这样测试函数能直接调 `area`。`super` 指父模块，测试在 `geometry::tests` 里，所以 `super` 就是 `geometry`。

`cargo test` 会自动带上 `--test` 和测试 harness，不需要手动加。用 `rustc` 直接编译时必须自己加 `--test`，否则测试函数会被当成死代码丢掉。

## 断言宏

常用四个：

- `assert!(cond)` —— 条件为假就 panic
- `assert_eq!(a, b)` —— 相等才通过
- `assert_ne!(a, b)` —— 不等才通过
- `assert!(cond, "格式 {}", 变量)` —— 失败时带自定义信息

预期 panic 用 `#[should_panic]`：

```rust
fn divide(a: i32, b: i32) -> i32 {
    if b == 0 {
        panic!("除数不能为 0");
    }
    a / b
}

#[cfg(test)]
mod tests {
    use super::divide;

    #[test]
    fn test_divide() {
        assert_eq!(divide(10, 2), 5);
    }

    #[test]
    #[should_panic(expected = "除数不能为 0")]
    fn test_divide_by_zero() {
        divide(1, 0);
    }
}
```

输出：

```
running 2 tests
test tests::test_divide ... ok
test tests::test_divide_by_zero - should panic ... ok

test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```

`expected` 参数是子串匹配，只写 panic 消息里的一段就行。

`#[should_panic]` 有个坑：它只看「有没有 panic」，不检查是不是 panic 在了预期的地方。所以 `expected` 一定要写，能避免测试因为别的原因 panic 也算通过。

## 集成测试

单元测试能访问模块内部实现，集成测试只能访问公开 API。放在 `tests/` 目录下，每个 `.rs` 文件是一个独立 crate：

```
src/
  lib.rs
tests/
  api.rs
```

```rust
// src/lib.rs
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

```rust
// tests/api.rs
use my_crate::add;

#[test]
fn test_add() {
    assert_eq!(add(2, 3), 5);
}
```

集成测试的价值在于**验证公开 API 好不好用**。如果一个功能只能从内部调用，那它对使用者来说就不存在。

单元测试和集成测试的取舍：逻辑分支多、边界条件多，写单元测试；对外接口的行为契约，写集成测试。

## 测试的组织

一个常见的错误是把测试都堆在文件末尾。更好的做法是测试跟着被测模块走，模块改名时测试一起改，改不到的地方编译就报错。

`#[cfg(test)]` 的另一个用途是隔离平台相关的代码：

```rust
#[cfg(unix)]
fn 获取权限() -> u32 {
    0o755
}

#[cfg(windows)]
fn 获取权限() -> u32 {
    0o755
}
```

两个版本互斥编译，测试时按平台选一个。

最后一条实践：**测试名要能说明意图**。`test_area` 只能看出测了什么，`test_area_of_zero_width_is_zero` 能看出测的是哪个场景。测试失败时，名字就是第一手线索。
