/**
 * 第一课：复杂度分析 —— 一切的衡量标准
 *
 * 本文件做两件事：
 *   1. 用「操作计数」精确度量各复杂度（确定性，不受机器噪音影响）
 *   2. 用「墙钟计时」在真实机器上验证增长趋势（有噪音，只看量级）
 *
 * 运行：npx tsx src/01-complexity.ts
 */

// ---------------------------------------------------------------------------
// 0. 计数器：让「操作次数」变成可观测的事实
// ---------------------------------------------------------------------------

class Counter {
  private count = 0;

  tick(n = 1): void {
    this.count += n;
  }

  get value(): number {
    return this.count;
  }

  reset(): void {
    this.count = 0;
  }
}

const ops = new Counter();

// ---------------------------------------------------------------------------
// 1. 六个复杂度档位：同一个问题「求 1..n 的和」，六种写法
// ---------------------------------------------------------------------------

/** O(1)：公式法。无论 n 多大，都只做常数次运算。 */
function sumFormula(n: number): number {
  ops.tick(3); // 一次乘法、一次加法、一次除法
  return (n * (n + 1)) / 2;
}

/** O(log n)：每次把问题规模减半。 */
function sumHalving(n: number): number {
  let total = 0;
  let remaining = n;
  while (remaining > 0) {
    ops.tick(2); // 一次加法、一次比较
    total += remaining;
    remaining = Math.floor(remaining / 2); // 关键：规模减半
  }
  return total;
}

/** O(n)：逐个累加。 */
function sumLoop(n: number): number {
  let total = 0;
  for (let i = 1; i <= n; i++) {
    ops.tick(2);
    total += i;
  }
  return total;
}

/** O(n log n)：外层 n 次，内层每次 log n。 */
function sumNestedHalving(n: number): number {
  let total = 0;
  for (let i = 1; i <= n; i++) {
    ops.tick(1);
    let remaining = i;
    while (remaining > 0) {
      ops.tick(1);
      remaining = Math.floor(remaining / 2);
    }
    total += i;
  }
  return total;
}

/** O(n²)：嵌套全遍历。 */
function sumQuadratic(n: number): number {
  let total = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= n; j++) {
      ops.tick(1);
      if (i === j) total += i; // 刻意用嵌套做一件本可 O(n) 完成的事
    }
  }
  return total;
}

/**
 * O(2^n)：一棵深度为 n 的二叉递归树，节点总数是 2^(n+1) - 1。
 * 这不是某个实用算法，而是用来展示「指数级」长什么样：
 * n 每增加 1，工作量精确翻倍。
 */
function recursionTreeCount(n: number): number {
  ops.tick(1);
  if (n <= 0) return 0;
  return 1 + recursionTreeCount(n - 1) + recursionTreeCount(n - 1);
}

/**
 * 真实世界里的指数级失误：朴素递归斐波那契。
 * 它的调用树不是满二叉树，增长率是黄金比例 φ ≈ 1.618，不是 2，
 * 但依然是指数级——n=40 就要算将近 3 亿次。
 */
function fibNaive(n: number): number {
  ops.tick(1);
  if (n <= 1) return n;
  return fibNaive(n - 1) + fibNaive(n - 2);
}

// ---------------------------------------------------------------------------
// 2. 用操作计数度量：n 翻倍时，操作数怎么变？
// ---------------------------------------------------------------------------

interface Row {
  name: string;
  bigO: string;
  opsAtN: number;
  opsAtDoubleN: number;
  ratio: number;
}

function measure(fn: (n: number) => number, name: string, bigO: string, n: number): Row {
  ops.reset();
  fn(n);
  const opsAtN = ops.value;

  ops.reset();
  fn(n * 2);
  const opsAtDoubleN = ops.value;

  return { name, bigO, opsAtN, opsAtDoubleN, ratio: opsAtDoubleN / opsAtN };
}

function section(title: string): void {
  console.log(`\n${'─'.repeat(72)}\n${title}\n${'─'.repeat(72)}`);
}

function fmt(n: number): string {
  return n.toLocaleString('en-US').padStart(15);
}

section('2. 操作计数：n 翻倍后，操作数变成几倍？(n = 1024)');

const n0 = 1024;
const rows: Row[] = [
  measure(sumFormula, '公式法', 'O(1)', n0),
  measure(sumHalving, '折半累加', 'O(log n)', n0),
  measure(sumLoop, '单层循环', 'O(n)', n0),
  measure(sumNestedHalving, '嵌套折半', 'O(n log n)', n0),
  measure(sumQuadratic, '嵌套全遍历', 'O(n²)', n0),
];

console.log(
  ['算法'.padEnd(14), '大 O'.padEnd(11), 'ops(n)'.padStart(15), 'ops(2n)'.padStart(15), '倍数'.padStart(10)].join(''),
);

for (const r of rows) {
  console.log(
    [r.name.padEnd(14), r.bigO.padEnd(11), fmt(r.opsAtN), fmt(r.opsAtDoubleN), r.ratio.toFixed(2).padStart(10)].join(''),
  );
}

console.log('\n理论倍数：O(1)→1，O(log n)→≈1，O(n)→2，O(n log n)→≈2.1，O(n²)→4');

// O(2^n) 单独跑：n 稍大就爆，不能放进上面的表
section('2b. O(2^n)：n 每 +1，操作数精确翻倍');

console.log(['n'.padStart(5), 'ops(2^n)'.padStart(15), '相对上一行的倍数'.padStart(20)].join(''));
let prevTree = 0;
for (const n of [20, 21, 22, 23, 24, 25]) {
  ops.reset();
  recursionTreeCount(n);
  const cur = ops.value;
  const ratio = prevTree === 0 ? Number.NaN : cur / prevTree;
  console.log(
    [
      String(n).padStart(5),
      fmt(cur),
      (Number.isNaN(ratio) ? '—' : ratio.toFixed(2)).padStart(20),
    ].join(''),
  );
  prevTree = cur;
}

section('2c. 朴素递归斐波那契：增长是 φ≈1.618，不是 2，但依然是指数级');

console.log(['n'.padStart(5), '调用次数'.padStart(15), '相对上一行的倍数'.padStart(20)].join(''));
let prevFib = 0;
for (const n of [20, 22, 24, 26, 28, 30]) {
  ops.reset();
  fibNaive(n);
  const cur = ops.value;
  const ratio = prevFib === 0 ? Number.NaN : cur / prevFib;
  console.log(
    [
      String(n).padStart(5),
      fmt(cur),
      (Number.isNaN(ratio) ? '—' : ratio.toFixed(2)).padStart(20),
    ].join(''),
  );
  prevFib = cur;
}
console.log('\nΔn=2，所以倍数约 φ² ≈ 2.62。n=30 已经 270 万次调用；n=40 约 3.3 亿次。');

// ---------------------------------------------------------------------------
// 3. 墙钟计时：真实机器上的感受（有噪音，只看量级）
// ---------------------------------------------------------------------------

section('3. 墙钟计时：真实机器上跑一次要多久？');

/**
 * 计时要取多次的最小值。
 * 单次计时会被 JIT 预热、GC、其他进程干扰；最小值最接近「代码本身的成本」。
 */
function timeIt(fn: (n: number) => number, n: number, runs = 3): number {
  let best = Number.POSITIVE_INFINITY;
  for (let r = 0; r < runs; r++) {
    const start = process.hrtime.bigint();
    fn(n);
    const end = process.hrtime.bigint();
    best = Math.min(best, Number(end - start) / 1e6); // 毫秒
  }
  return best;
}

const benchN = 200_000;
console.log(`n = ${benchN.toLocaleString('en-US')}，取 ${3} 次最小值\n`);
console.log(['算法'.padEnd(14), '大 O'.padEnd(11), '耗时(ms)'.padStart(14)].join(''));

for (const [name, bigO, fn] of [
  ['公式法', 'O(1)', sumFormula],
  ['折半累加', 'O(log n)', sumHalving],
  ['单层循环', 'O(n)', sumLoop],
  ['嵌套折半', 'O(n log n)', sumNestedHalving],
] as const) {
  const ms = timeIt(fn, benchN);
  console.log([name.padEnd(14), bigO.padEnd(11), ms.toFixed(3).padStart(14)].join(''));
}

console.log('\n注意：O(n log n) 与 O(n) 在 n=2e5 时只差 2~3 倍，');
console.log('但 n 再大一个数量级，差距会按比例继续拉开——大 O 承诺的是趋势，不是这一点。');

// O(n²) 用更小的 n，否则跑不完
section('3b. 同一段 O(n²) 代码，n 从 5k 到 20k');

console.log(['n'.padStart(9), '耗时(ms)'.padStart(14), '相对上一次的倍数'.padStart(20)].join(''));
let lastMs = 0;
for (const n of [5_000, 10_000, 20_000]) {
  const ms = timeIt(sumQuadratic, n);
  const ratio = lastMs === 0 ? Number.NaN : ms / lastMs;
  console.log(
    [
      n.toLocaleString('en-US').padStart(9),
      ms.toFixed(2).padStart(14),
      (Number.isNaN(ratio) ? '—' : `${ratio.toFixed(2)}x`).padStart(20),
    ].join(''),
  );
  lastMs = ms;
}

console.log('\nn 翻倍 → 耗时约 4 倍。这就是 O(n²) 的含义。');

// ---------------------------------------------------------------------------
// 4. 均摊分析：动态数组的 push 为什么是 O(1)
// ---------------------------------------------------------------------------

section('4. 均摊分析：为什么动态数组 push 是 O(1)');

/**
 * 自己实现一个动态数组。
 * 关键：用独立的 length 跟踪元素个数，不要用 JS 数组的 .length 当容量——
 * JS 数组自己会长，.length 会跳过我们设定的容量，容量跟踪就全错了。
 */
class DynamicArray {
  private buffer: (number | undefined)[];
  private length = 0;
  private copies = 0; // 累计「搬移元素」的次数

  constructor(initialCapacity = 1) {
    this.buffer = new Array<number | undefined>(initialCapacity);
  }

  get size(): number {
    return this.length;
  }

  get totalCopies(): number {
    return this.copies;
  }

  push(value: number): void {
    if (this.length === this.buffer.length) {
      // 扩容：容量翻倍，把旧元素全部搬过去
      const next = new Array<number | undefined>(this.buffer.length * 2);
      for (let i = 0; i < this.length; i++) {
        next[i] = this.buffer[i];
        this.copies++;
      }
      this.buffer = next;
    }
    this.buffer[this.length] = value;
    this.length++;
  }
}

for (const total of [1_000, 10_000, 100_000, 1_000_000]) {
  const arr = new DynamicArray();
  for (let i = 0; i < total; i++) arr.push(i);
  console.log(
    `push ${total.toLocaleString('en-US').padStart(11)} 次 → 搬运 ${arr.totalCopies
      .toLocaleString('en-US')
      .padStart(11)} 次，平均每次 push 搬运 ${(arr.totalCopies / total).toFixed(2)} 次`,
  );
}

console.log('\n单次 push 可能触发 O(n) 的扩容搬运，但 n 次 push 合计只搬运 O(n) 次。');
console.log('所以均摊到每次是 O(1)——这叫「均摊分析」。');
console.log('扩容倍率取 2 时，n 次 push 的总搬运次数落在 n ~ 2n 之间');
console.log('（取决于 n 恰好落在哪个容量区间），上界 2n，均摊 O(1)。');

// ---------------------------------------------------------------------------
// 5. 三个常见误区
// ---------------------------------------------------------------------------

section('5. 常见误区');

console.log(`
误区 1：「O(n) 一定比 O(n²) 快」
  → 错。大 O 描述的是增长趋势，不是固定速度。
    n=100 时，一个常数极大的 O(n) 可能慢过一个 O(n²)。
    但 n 足够大时，O(n²) 一定被 O(n) 甩开——这是大 O 真正的承诺。

误区 2：「n 小所以不用管复杂度」
  → 半对。先保证正确，再管复杂度。但要知道拐点在哪：
    O(n²) 在 n=1e4 时通常还能跑，n=1e5 就开始疼，n=1e6 基本没戏。

误区 3：「benchmark 测出来快就是快」
  → 错。单次计时受 JIT 预热、GC、机器负载影响极大。
    要看趋势（n 翻倍时耗时的倍数），并取多次最小值，不要看点值。
`);

section('第一课完');
