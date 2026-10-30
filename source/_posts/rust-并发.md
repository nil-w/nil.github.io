---
title: rust-并发
description: thread、Arc、Mutex、通道，以及 Send 和 Sync 两个 trait
tags:
  - Rust
  - concurrency
abbrlink: 4f19e094
date: 2026-10-30 10:30:00
categories:
  - 学习
---

# 并发

Rust 的并发模型围绕两条线：**所有权**决定数据归谁，**`Send` 和 `Sync`** 决定数据能不能跨线程。编译器强制这两条，所以数据竞争在 Rust 里是编译错误，不是运行时惊喜。

## 起一个线程

`thread::spawn` 接受一个闭包，返回一个 `JoinHandle`：

```rust
use std::thread;

fn main() {
    let handle = thread::spawn(|| {
        println!("子线程里");
        42
    });

    let result = handle.join().unwrap();
    println!("子线程返回: {}", result);
}
```

输出：

```
子线程里
子线程返回: 42
```

`join()` 会等线程结束并拿到它的返回值，返回 `Result`，因为线程可能 panic。

注意打印顺序：`子线程里` 一定在 `子线程返回` 之前，因为 `join` 是同步点。但和主线程开头的输出谁先谁后就不一定了 —— 调度顺序不由程序决定。

主线程结束时，所有未 `join` 的线程会被强行终止。所以生产代码里每个 `spawn` 都要配一个 `join`。

## move 闭包

闭包默认借用外部变量，但跨线程时借用可能活不过线程，所以要用 `move` 把所有权搬进去：

```rust
use std::thread;

fn main() {
    let data = vec![1, 2, 3];

    let handle = thread::spawn(move || {
        println!("拿到: {:?}", data);
    });

    handle.join().unwrap();
    println!("主线程不能再用 data 了");
}
```

输出：

```
拿到: [1, 2, 3]
主线程不能再用 data 了
```

如果去掉 `move`，编译会报错：

```
error[E0373]: closure may outlive the current function, but it borrows `data`, which is owned by the current function
 --> e5.rs:6:32
  |
6 |     let handle = thread::spawn(|| {
  |                                ^^ may outlive borrowed value `data`
7 |         println!("拿到: {:?}", data);
  |                                ---- `data` is borrowed here
  |
note: function requires argument type to outlive `'static`
 --> e5.rs:6:18
  |
6 |     let handle = thread::spawn(|| {
  |  __________________^
7 | |         println!("拿到: {:?}", data);
8 | |     });
  | |______^
help: to force the closure to take ownership of `data` (and any other referenced variables), use the `move` keyword
  |
6 |     let handle = thread::spawn(move || {
  |                                ++++
```

关键在 `may outlive borrowed value`：`data` 借给闭包，闭包可能被移到另一个线程上，而 `data` 属于主线程的栈帧，主线程可能先退出。编译器无法证明借用能活到闭包用完，所以直接拒绝。

## Arc 和 Mutex

多个线程要改同一份数据，需要共享所有权。`Rc` 是单线程的引用计数，跨线程要用 `Arc`（原子引用计数）：

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let c = Arc::clone(&counter);
        handles.push(thread::spawn(move || {
            for _ in 0..1000 {
                let mut guard = c.lock().unwrap();
                *guard += 1;
            }
        }));
    }

    for h in handles {
        h.join().unwrap();
    }

    println!("最终计数: {}", *counter.lock().unwrap());
}
```

输出：

```
最终计数: 10000
```

`Arc::clone` 只增加引用计数，不复制数据。`Mutex::lock` 返回一个 guard，guard 存在期间锁被持有，guard 析构时锁释放。所以 `*guard += 1` 是在锁的保护下完成的。

这里的 `lock().unwrap()` 也是一种 `unwrap`，锁中毒（某个线程 panic 时持锁）才会触发。

## 通道

线程间传数据，通道比共享内存更安全，因为数据的所有权真的转移了：

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    for i in 1..=3 {
        let tx = tx.clone();
        thread::spawn(move || {
            tx.send(i * 10).unwrap();
        });
    }

    drop(tx);

    let mut got = vec![];
    for v in rx {
        got.push(v);
    }
    got.sort();
    println!("收到: {:?}", got);
}
```

输出：

```
收到: [10, 20, 30]
```

`mpsc::channel()` 返回发送端和接收端。`tx.clone()` 给每个线程一份发送端。

`drop(tx)` 这行不能省。原始的 `tx` 还在主线程手里，只要它活着，`rx` 的迭代就不会结束 —— `for v in rx` 会一直等下去。克隆出去的发送端在 `move` 闭包里，线程结束时自动 drop，所以 `drop(tx)` 之后只剩最后一个可能的发送者。

接收顺序不保证是发送顺序，所以最后 `sort` 一下。

## Send 和 Sync

`Rc` 不能跨线程，编译器会拦：

```rust
use std::rc::Rc;
use std::thread;

fn main() {
    let data = Rc::new(5);
    thread::spawn(move || {
        println!("{}", data);
    });
}
```

编译输出：

```
error[E0277]: `Rc<i32>` cannot be sent between threads safely
 --> e2.rs:6:19
  |
6 |       thread::spawn(move || {
  |       ------------- ^------             |
  |  _____|_____________within this `{closure@e2.rs:6:19: 6:26}`
  | |     |
  | |  ____|_____required by a bound introduced by this call
7 | |         println!("{}", data);
8 | |     });
  | |_____^ `Rc<i32>` cannot be sent between threads safely
  | = help: within `{closure@e2.rs:6:19: 6:26}`, the trait `Send` is not implemented for `Rc<i32>`
note: required because it's used within this closure
 --> e2.rs:6:19
  |
6 |     thread::spawn(move || {
  |                   ^^^^^^^
note: required by a bound in `spawn`
 --> /rustc/31fca3adb283cc9dfd56b49cdee9a96eb9c96ffd/library/std/src/thread/functions.rs:125:0
```

这两个 trait 的含义：

- `Send`：这个类型的所有权可以转移到另一个线程
- `Sync`：`&T` 可以安全地在多个线程间共享

`Arc<Mutex<i32>>` 之所以能共享，正是因为 `Arc<T>` 在 `T: Send + Sync` 时是 `Send + Sync`，而 `Mutex<T>` 在 `T: Send` 时是 `Send + Sync`。

## 死锁

Mutex 最经典的问题是锁顺序不一致导致死锁：

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let m = Arc::new(Mutex::new(1));
    let a = Arc::clone(&m);
    let b = Arc::clone(&m);
    let a2 = Arc::clone(&m);
    let b2 = Arc::clone(&m);

    let t1 = thread::spawn(move || {
        let mut g = a.lock().unwrap();
        println!("线程1 拿到锁");
        let mut g2 = a2.lock().unwrap();
        println!("线程1 拿到第二个锁");
        *g += 1;
        *g2 += 1;
    });

    let t2 = thread::spawn(move || {
        let mut g = b.lock().unwrap();
        println!("线程2 拿到锁");
        let mut g2 = b2.lock().unwrap();
        println!("线程2 拿到第二个锁");
        *g += 1;
        *g2 += 1;
    });

    t1.join().unwrap();
    t2.join().unwrap();
}
```

输出：

```
线程1 拿到锁
```

然后就卡死了。线程 1 拿着锁等第二个锁，线程 2 拿着另一个线程的锁等第一个锁，谁也不放。上面这份代码跑起来会一直挂着，退出码 124（超时强杀）。

三个应对办法：

- **全局固定加锁顺序**。给每个锁编号，任何地方都按编号升序加锁。这是 Rust 标准库内部用的办法。
- **用 `try_lock` 拿不到就退出**。`try_lock()` 返回 `Result`，失败时能走别的路。
- **一次只锁一个**。上面的代码其实只需要一个锁，四个 `Arc::clone` 是多余的。

死锁是逻辑错误，编译器查不出来。能做的是让锁的粒度尽量小、顺序尽量一致。
