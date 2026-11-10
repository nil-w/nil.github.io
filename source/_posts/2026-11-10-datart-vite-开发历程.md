---
title: datart-vite 开发历程：把 CRA 时代的 BI 前端搬到 Vite
description: 一个 17 万行的 React BI 前端，从 CRA 4 + craco 迁到 Vite，顺手升完 React 18、antd 5、Router 6，并补上地图下钻与 UMD 任务产物的二次构建
categories:
  - 技术
tags:
  - datart
  - vite
  - React
  - 前端工程化
  - BI
  - antd
toc: true
comments: true
abbrlink: datart-vite
date: 2026-11-10 15:00:00
---

# datart-vite 开发历程：把 CRA 时代的 BI 前端搬到 Vite

> 上游仓库停在了 Create React App 4，而 CRA 已经停止维护。这件事本身没有争议，有争议的是——17 万行代码里的每一行，凭什么相信它能活着搬过去。

项目地址：[nil-w/datart-vite](https://github.com/nil-w/datart-vite)
上游仓库：[running-elephant/datart](https://github.com/running-elephant/datart)

---

## 一、缘起：为什么要 fork 一个 BI 项目的前端

datart 是一套数据可视化开放平台，按上游自己的话说是「支持报表、仪表板、大屏、分析和可视化数据应用的敏捷构建」，由原 davinci 主创团队出品。它把可视化拆成 `Source > View > Chart > Visualization` 四层，交互上支持筛选、钻取、联动、跳转、分享等一整套标准化能力。

平台本身是 Java 多模块工程（core / server / data-providers / security / frontend），前端单独放在 `frontend/` 目录，用的是 **Create React App 4.0.3 + craco 6**。

我 fork 它的理由很朴素，一共三条：

1. **构建链路已经是死路。** CRA 4 捆绑 webpack 4，官方早已停止维护；craco 这种「在 CRA 内部打补丁」的方案，本质是在别人封装好的配置树上做外科手术，每一次依赖升级都可能把补丁打穿。
2. **分包策略靠人力硬撑。** 上游在 `craco.config.js` 里手写了十来组 `splitChunks.cacheGroups`，把 ChartGraph、antd、echarts、quill、lodash、react-dnd、video-react 一个个点名拆出来——这是在跟打包器打一场永远打不完的消耗战。
3. **antd 4 的样式链是编译期产物。** 主题靠 `antd-theme-generator` + less 变量在构建时生成一份 CSS，运行期想换主题就得再来一遍。这条路在 antd 5 之后彻底走不通。

所以目标定得很明确：**基线保持在上游 `1.0.0-rc.3`，把构建换成 Vite，顺手把那批被我视为负债的依赖升上去，同时补上业务真正需要的两个能力——地图下钻、可嵌入的任务脚本产物。**

先说结论：整件事一共 10 个 commit，横跨 2023-10 到 2024-03。数量少得反常，因为绝大部分工作量在**一次大提交**里，之后全是收口。

---

## 二、体检：先看清要搬的东西有多大

动手之前先量了一遍：

| 项目 | 数值 |
| --- | --- |
| TS / TSX 源码行数 | 171,908 行 |
| 源文件数（.ts + .tsx） | 1,149 个（494 + 655） |
| 仓库总体积 | 约 125 MB（含已入库的构建产物与地图数据） |
| 入口数量 | 4 个：主应用 + 分享图表 + 分享仪表板 + 分享故事板 |
| 地图数据 | 1 个全国 + 34 个省级 + 335 个区县级 GeoJSON，约 45 MB |

这张表里最要命的是最后两行。**多入口**意味着 CRA 里那套「复制一份 HtmlWebpackPlugin、强行改 `output.filename` 塞 `[name]`」的骚操作要整套重写；**45 MB 地图数据**意味着不能一把梭塞进主 bundle，否则首屏就废了。

上游为多入口写的那段代码，我至今记得：

```js
// 上游 craco.config.js 片段
const defaultEntryHTMLPlugin = webpackConfig.plugins.filter(
  plugin => plugin.constructor.name === 'HtmlWebpackPlugin',
)[0];
defaultEntryHTMLPlugin.options.chunks = [defaultEntryName];

rewireEntries.forEach(entry => {
  multipleEntry[entry.name] = necessaryEntry.concat(entry.entry);
  webpackConfig.plugins.unshift(
    new defaultEntryHTMLPlugin.constructor(
      Object.assign({}, defaultEntryHTMLPlugin.options, {
        filename: entry.outPath,
        chunks: [entry.name],
      }),
    ),
  );
});
```

这段代码读起来像在跟构建器博弈。而 Vite 的答案简单到近乎无礼：**入口就是 HTML 文件本身**。

```ts
// vite.config.ts
input: entryPoints(
  'index.html',
  'shareChart.html',
  'shareDashboard.html',
  'shareStoryPlayer.html',
),
```

四个 HTML 摆在根目录，各自 `<script type="module" src="/src/xxx.tsx">`，剩下的交给 Rollup。上游那 40 行手术代码，变成了一个函数调用的参数列表。

---

## 三、第一战：把 CRA 的行为一条条捞回来

迁移真正的难点不是「跑起来」，而是「跑起来之后行为一致」。CRA 帮你隐式做了很多事，Vite 全都不做。逐条对账：

### 1. `process.env` 垫片

整个代码库到处是 `process.env.NODE_ENV`、`process.env.PUBLIC_URL`。Vite 里这些是未定义标识符，直接运行就是 `ReferenceError`。所以第一件事是补垫片：

```ts
define: {
  'process.env': {},
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  'process.env.PUBLIC_URL': JSON.stringify(process.env.PUBLIC_URL),
},
```

注意 `'process.env': {}` 这一行不能省——有些依赖会整体读取 `process.env` 做判断，只定义叶子属性会让它们炸在别的地方。

### 2. 多入口的 history 回退

datart 的分享页走的是 `/shareChart/:id` 这种前端路由。CRA 的 devServer 通过 `historyApiFallback.rewrites` 搞定，Vite 默认只会把 404 回退到 `index.html`——也就是说访问 `/shareChart/abc` 会返回主应用，然后路由报错。

Vite 的 `configureServer` 允许挂自定义中间件，于是直接把 CRA 那套 rewrites 原样搬过来：

```ts
{
  name: 'historyApiFallback',
  configureServer(server) {
    server.middlewares.use(
      history({
        htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
        disableDotRule: false,
        rewrites: [
          { from: /^\/$/, to: '/index.html' },
          { from: /^\/shareChart\/\w/, to: '/shareChart.html' },
          { from: /^\/shareDashboard\/\w/, to: '/shareDashboard.html' },
          { from: /^\/shareStoryPlayer\/\w/, to: '/shareStoryPlayer.html' },
        ],
      }),
    );
  },
},
```

**注意这只是 dev 行为。** 生产环境靠的是后端（Nginx / Spring Boot）配同样的 rewrite 规则，前端配置在 dev 阶段只是让开发体验对齐，不具备部署效力。这一点很容易被误以为「配了就不用改后端」，实际是两回事。

### 3. 自定义图表插件的 mock 接口

datart 支持插件化的自定义图表，dev 时会请求 `/api/v1/plugins/custom/charts` 拿插件列表。上游在 craco 的 `devServer.before` 里用 Express 风格写了一小段：

```js
app.get('/api/v1/plugins/custom/charts', (req, res) => {
  const dir = fs.readdirSync(`./public/${pluginPath}`);
  res.json({ data: dir.filter(f => path.extname(f) === '.js').map(...), ... });
});
```

Vite 没有 Express，得写成 Connect 中间件，手动 `setHeader` + `end`：

```ts
{
  name: 'custom-chart-plugins',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/api/v1/plugins/custom/charts') {
        const dir = fs.readdirSync(`./public/custom-chart-plugins`);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ data: dir.filter(f => extname(f) === '.js').map(...), errCode: 0, success: true }));
        return;
      }
      next();
    });
  },
},
```

顺手把代理目标从 `localhost:8080`（本地起 Java 后端）改成上游的公开 demo `http://datart-demo.retech.cc/`——这样纯前端开发不用先跑整个后端。

### 4. Monaco 编辑器

上游用 `monaco-editor-webpack-plugin` + `react-monaco-editor`，编辑器 worker 由 webpack 插件调度。Vite 里换成 `@monaco-editor/react`，并且**直接关掉 CDN loader**，改成打包本地 monaco：

```tsx
// src/index.tsx
import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
loader.config({ monaco });
```

这行 `loader.config({ monaco })` 很关键。不写它，`@monaco-editor/react` 会默认去 jsdelivr 拉一个版本可能不匹配的 monaco——内网环境直接白屏，公网环境下则会出现「编辑器能开但 SQL 高亮偶尔失灵」这类极难复现的问题。

### 5. SVG、路径别名、CSS

三个小件，各一行：

- `vite-plugin-svgr`：保留 `import { ReactComponent as Icon } from './x.svg'` 的写法（CRA 内建能力）。
- `vite-tsconfig-paths`：`baseUrl: "./src"` 那套 `import 'app/utils/...'` 的裸路径，不装这个插件全都要改成相对路径。
- `postcss.config.cjs`：CRA 内部帮你挂的 `postcss-preset-env`（内含 autoprefixer），Vite 需要显式配置，否则 `browserslist` 直接失效，产物里前缀全丢。

### 6. 分包：从「点名」到「交给算法」

上游那十组 `cacheGroups` 我全部删了。Vite 生产构建走 Rollup，代码分割基于动态 import 的真实边界和稳定的 chunk 算法，人工干预的收益远小于维护成本。

但有两件事必须人工对齐，否则产物结构会跟后端/部署脚本对不上：

```ts
build: {
  outDir: './build',      // 不是默认的 dist
  assetsDir: 'static',
  chunkFileNames: 'static/js/[name].[hash].js',
  entryFileNames: 'static/js/[name].[hash].js',
  assetFileNames: assetInfo => {
    let subDir = 'media';
    if (extname(assetInfo?.name) === '.css') subDir = 'css';
    return `static/${subDir}/[name].[hash].[ext]`;
  },
},
```

`build/static/js|css|media` 这套目录结构是 datart 部署脚本和 Java 打包逻辑所依赖的约定，**产物路径是接口，不是审美问题。**

### 7. 一个容易被忽略的细节：生产环境剔掉调试代码

```ts
esbuild: {
  drop: mode === 'production' ? ['console', 'debugger'] : [],
},
```

CRA 时代靠 terser 的 `drop_console`，Vite 的 esbuild 转换阶段就能做，而且比 terser 快一个数量级。

---

## 四、第二战：React 17 → 18，入口那一小段代码全是雷

依赖升级是这次改造的主线，React 17.0.2 → 18.2.0 是最基础的一步。改动集中在 `entryPointFactory.tsx` 这 30 行里，但每一行都有说法：

```tsx
// 迁移前（CRA + React 17）
import 'antd/dist/antd.min.css';
import ReactDOM from 'react-dom';
if (module.hot) {
  module.hot.accept(['./locales/i18n'], () => {});
}
ReactDOM.render(<React.StrictMode><EntryPointComponent /></React.StrictMode>, MOUNT_NODE);

// 迁移后（Vite + React 18）
import { createRoot } from 'react-dom/client';
const IS_DEVELOPMENT = import.meta.env.DEV;
const root = createRoot(MOUNT_NODE);
root.render(<InspectorWrapper>...</InspectorWrapper>);
```

四件事：

1. **`antd/dist/antd.min.css` 删掉。** antd 5 走 CSS-in-JS，这份全量样式表不再需要，留着反而会和新样式打架。
2. **`ReactDOM.render` → `createRoot`。** React 18 的并发根，不改会被警告刷屏。
3. **`module.hot` 那段删掉。** 那是给 webpack 手写 HMR 的，Vite 的 HMR 走原生 ESM，`module.hot` 在 Vite 里根本不存在。
4. **`React.StrictMode` 去掉了。** 这条是妥协：StrictMode 在开发环境会刻意双调用 render / effect，datart 里若干图表组件在 `useEffect` 里去 `echarts.init` 一个容器，双调用直接导致「图表实例泄漏 + 控制台一片 `There is a chart instance already initialized`」。我没有精力在这个阶段逐个把它改写成幂等，于是选择先摘掉——**这是技术债，不是最佳实践**，记在这里免得日后自己误以为是有意设计。

顺带说一句：`process.env.NODE_ENV === 'development'` 换成了 `import.meta.env.DEV`。全库有几百处这种判断散落各处，好在大部分集中在少数配置文件里，逐处替换实际只有几十个点。

---

## 五、第三战：antd 4 → 5，主题体系重写

这是投入产出比最高、也最容易被低估的一块。上游 antd 是 **4.16.13**，主题链路是：less 变量 → `antd-theme-generator` 在构建期生成 CSS → 运行期换主题时再算一遍。

antd 5 把这套东西整个拿掉了，换成 CSS-in-JS + Design Token，运行期就能算。于是：

- 依赖里删掉 `antd-theme-generator`；
- 删掉 `styles/antd/variables.less`；
- 新增两个 Provider，把主题配置集中起来。

```tsx
// src/app/RootConfigProvider.tsx
const RootConfigProvider = ({ children }) => {
  const themeKey = useSelector(selectThemeKey);
  return (
    <ConfigProvider
      locale={antdLocales[i18n.language]}
      theme={{
        algorithm: themeKey === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: '#0d61a0', colorLink: '#0e558b' },
      }}
    >
      {children}
    </ConfigProvider>
  );
};
```

为什么是两个 Provider 而不是一个？因为 datart 的分享页（`shareChart` / `shareDashboard` / `shareStoryPlayer`）是**脱离主应用 Redux store 的独立入口**，它拿不到 `selectThemeKey`。所以 `BaseConfigProvider` 只给固定浅色主题 + 品牌色，给分享页用；`RootConfigProvider` 挂在 `AppRouter` 上，读 Redux 里的主题状态，管主应用。

`#0d61a0` 这个主色来自 datart 原有视觉，升级过程中必须逐像素守住——BI 工具的用户对颜色极其敏感，图表配色和 UI 主题是同一套语汇。

升级 antd 5 的连带伤害还有一堆组件级 API 变化。挑一个最有代表性的：

```tsx
// 迁移前：key 是数组，取最后一个元素算字段名
return { title: v, key: [...tableName, v] };
// ...
getValueFromEvent={e => (e ? e.slice(-1) : '')}
value={joinTable.conditions?.[conditionsIndex]?.left.slice(-1)}

// 迁移后：key 拍平成 "table.field" 字符串
return { title: v, key: [...tableName, v].join('.') };
// ...
fieldNames={{ label: 'title', value: 'key', children: 'children' }}
value={joinTable.conditions?.[conditionsIndex]?.left}
onChange={columnName => onChange(columnName?.split('.') || [], 'left', conditionsIndex)}
```

这段在 `SelectJoinColumns.tsx`（视图层关联条件选择器）。**原来的写法是个隐藏 bug**：用 `slice(-1)` 只取数组最后一个元素，意味着 `a.user_id` 和 `b.user_id` 被压成同一个值——两表关联时选了不同表的同名字段，条件会静默错位。上游能忍，是因为它那个版本里 antd 的 TreeSelect 不强制要求标量 value；antd 5 的 `fieldNames.value` 必须是原始类型，逼着我把 key 拍平成字符串，反而顺手把这个坑填了。

这类「版本升级逼出正确实现」的例子，是重构里少有的正收益。commit 时间 2024-03-27，是整个仓库最后一次提交——说明这块是长期在用的、慢慢磨出来的。

---

## 六、第四战：地图下钻，一个只有 Vite 能给的答案

业务侧最实在的新功能是**地图下钻**：全国 → 省 → 市 → 区县，四级联动。

难点在数据。要支持全国任意区县的下钻，就得有全国地域的 GeoJSON。我从阿里 DataV 的地图工具（`datav.aliyun.com/tools/atlas`）扒了全套：

- `china.json`：全国；
- `cities/{adcode}.json`：34 个省级；
- `areas/{adcode}.json`：335 个区县级；

合计约 45 MB。这个体量坚决不能进主 bundle。

**CRA 时代的做法**是 `require.context` 或全量 JSON 静态 `import`——无论哪种，webpack 都得在构建期把它们全部纳入依赖图。而 Vite 提供了一行 API：

```tsx
const areas = import.meta.glob('../../../assets/geojson/areas/**.json');
const cities = import.meta.glob('../../../assets/geojson/cities/**.json');

registerMap('china', geoChina as any);

provinces.forEach(async province => {
  const loadFile = cities[`../../../assets/geojson/cities/${province}.json`];
  if (loadFile) {
    const res = await loadFile();
    const json = { UTF8Encoding: true, type: 'FeatureCollection', features: res?.features };
    res?.features?.forEach(f => { provinceCodeMap[f.properties.name] = String(f.properties.adcode); });
    registerMap(String(province), json as any);
  }
});
```

`import.meta.glob` 返回的是 `{ 路径: () => Promise }` 的映射——**每个 JSON 文件都是一个独立的动态 chunk，编译期不加载，只有 `await loadFile()` 时才请求**。这是 webpack 的 `require.context` 做不到的（后者拿到的是同步模块引用）。

几个数据侧的坑：

1. **DataV 导出的 json 不是标准 `FeatureCollection`**，`features` 在顶层，但 echarts 的 `registerMap` 还需要 `type` 字段，所以得手动包一层 `{ UTF8Encoding: true, type: 'FeatureCollection', features }`。
2. **adcode 必须用字符串。** 数字类型会丢前导零，`110000` 和 `110000` 看着一样，但 `010000` 就废了——所以全程 `String(adcode)`。
3. **省名和 code 要双向映射。** 用户点击地图拿到的是 `properties.name`（中文省名），而文件是按 code 存的，所以 `provinceCodeMap` 在建图时把 name → code 一并记下。

但这里有个**我必须诚实记录的隐患**：上面这段 `registerMap` 逻辑写在模块顶层，`provinces.forEach` / `citites.forEach` 在模块加载瞬间就全部执行了。也就是说——代码层面是「按需拆包」，运行层面却是「打开任意一个地图页面，立刻并发 369 个 JS chunk 请求」。

正确做法是把这两段挪进 `getData` / `onMount`，用懒加载 + 已加载集合去重：

```tsx
// 应该是这样，但当时没做
if (!loadedMaps.has(code)) {
  await areas[`.../${code}.json`]();
  loadedMaps.add(code);
}
```

在本地开发环境（HTTP/2 + 无网络延迟）完全感知不到，一上线到真实网络，首屏就是一串瀑布流。这个坑我留在 README 里，也留在文章里。

---

## 七、第五战：一个产物、两套构建

datart 有个容易被忽略的产物：`src/task.ts`。它被编译成 UMD 脚本挂到 `public/task/index.js`，用途是**嵌入到第三方页面里做数据查询**——也就是说，这段代码要跑在别人的浏览器、别人的 DOM 环境里，甚至可能是很老的浏览器。

上游用 `rollup.config.js` 单独打：`@rollup/plugin-babel` + `preset-env` + `@rollup/plugin-typescript`，输出 UMD。迁到 Vite 之后，主构建不能管它（环境、格式、目标全都不同），所以新开一份配置 `vite.task-config.ts`，用 Vite 的 **library mode** 复刻：

```ts
export default defineConfig({
  resolve: { browserField: false, conditions: ['node'], extensions: ['.js', '.ts'] },
  build: {
    emptyOutDir: false,        // 关键！不能清掉主构建的产物
    copyPublicDir: false,
    minify: false,
    lib: { entry: 'src/task.ts', formats: ['umd'], name: 'getQueryData' },
    outDir: 'public/task',
    rollupOptions: {
      input: 'src/task.ts',
      output: {
        format: 'umd',
        entryFileNames: 'index.js',
        generatedCode: { preset: 'es5', arrowFunctions: false },
      },
      treeshake: { preset: 'smallest' },
      plugins: [ babel({ babelHelpers: 'runtime', presets: [['@babel/preset-env', { modules: false }]] }),
                 replace({ 'console.log': '//console.log' }) ],
    },
  },
  esbuild: false,   // 关键！必须关掉 esbuild，让 babel 全权接管降级
});
```

这里面有四个「不知道就会踩」的点：

| 配置 | 为什么必须有 |
| --- | --- |
| `emptyOutDir: false` | 默认会清空输出目录，这份配置跑起来会把 `public/task/` 以外的内容一起删 |
| `esbuild: false` | Vite 默认用 esbuild 转译，它**不会**产出完整 ES5；不关掉，babel 根本没有机会介入 |
| `generatedCode: { preset: 'es5', arrowFunctions: false }` | Rollup 自己生成的包装代码里也有箭头函数，光靠 babel 转不过去 |
| `resolve.conditions: ['node']` | 这个产物走 Node 风格解析，不能套浏览器条件导出 |

所以打包顺序是不能反的：

```json
"build:task": "vite build -c vite.task-config.ts",
"build:all": "npm run build:task && npm run build"
```

**先 task 后主应用**。反过来的话，主构建的 `emptyOutDir: true` 会把刚生成的 `public/task/index.js` 一起清掉——症状是「本地打出来能跑，CI 上跑出来分享页白屏」，查一天都查不出来。

上游还有个 `build:theme`（`node scripts/extractAntdTheme`，抽 antd less 主题变量）。antd 5 之后这个脚本失去意义，直接从 `build:all` 里摘掉了。

---

## 八、第六战：合上游 #2249 的紧急修复

2023-12-18 那个 commit 的标题是「合并 #2249 特性」。上游 #2249 是个 issue：**1.0.0-rc.3 新建 Dashboard 保存后不显示数据，再次编辑报 `Cannot create property 'computedFields' on string '{"aggregation":true,...}'`**。

看一眼报错就能猜到根因：`config` 字段本该是对象，实际拿到的是一个 JSON 字符串，然后代码往这个字符串上挂 `computedFields` 属性——`chartConfig` 被序列化了两次。

上游的修法是在数据迁移层加一段防御：

```ts
// src/app/migration/BoardConfig/migrateWidgetChartConfig.ts
// FIXME 1.0.0-rc.3 hotfix, will remove in next version.
if (typeof widget?.config?.content?.dataChart?.config === 'string') {
  widget.config.content.dataChart.config = JSON.parse(
    widget.config.content.dataChart.config,
  );
}
```

同一批还捎带了：

- **图片组件重构**：新增 `HiddenUploader.tsx` / `Picture.tsx`，把「上传」和「渲染」彻底拆开，`ImageWidget.tsx` 改动 66 行。原因是旧实现把 `input[type=file]` 直接挂在展示组件里，大屏里一屏几十个图片组件就是几十个隐藏 file input。
- **大屏自由布局的默认主题**：`WidgetOfFreeEdit.tsx` 改了 127 行，把组件主题兜底成 `default`，避免没配主题的组件渲染成透明。
- **`slice/thunk.ts` 改动 258 行**：这部分是异步数据编排，跟着 #2249 的修法一起收口。

这次提交还把 `build/` 目录整个提交进了仓库——包括 4 MB 的 `stats.html`（Rollup Visualizer 产物）和全套 `build/static/**`。坦白讲这是权宜之计：为了让没有前端环境的部署方直接拿产物用。代价是仓库 125 MB、每次改动 diff 巨大。**它解决了交付问题，制造了工程问题**，两边都得记账。

---

## 九、迁移结果盘点

### 依赖对照

| 依赖 | 上游 rc.3 | datart-vite |
| --- | --- | --- |
| 构建 | Create React App 4.0.3 + craco 6 | Vite 4.3.9 + Rollup 3 |
| React | 17.0.2 | 18.2.0 |
| antd | 4.16.13（less + antd-theme-generator） | 5.6.4（CSS-in-JS Token） |
| react-router-dom | 5.2.0 | 6.14.2 |
| react-redux | 7.2.6 | 8.1.2 |
| TypeScript | 4.5.4 | 5.0.2 |
| Monaco | react-monaco-editor + webpack 插件 | @monaco-editor/react + 本地打包 |
| 富文本 | react-quill 1.3.5 | react-quill 2.0.0 |
| 样式方案 | styled-components + antd less | styled-components（保留） + antd Token |

removed：`react-color`、`react-beautiful-dnd`、`react-draggable`、`react-resize-detector`、`invariant`、`antd-theme-generator`。
added：`@ant-design/charts`、`@antv/x6-react-*`（拓扑/关系图）、`highcharts`、`echarts-gl` / `echarts-liquidfill` / `echarts-extension-amap`（3D、水球、高德地图扩展）、`exceljs` + `read-excel-file`（Excel 导入导出）、`dompurify`（HTML 净化）、`redux-persist`、`react-countup`、`react-fast-marquee`。

styled-components 5.3.3 是**刻意保留**的：全库大量组件依赖它的动态样式能力，换 Emotion 或 CSS Modules 就是重写 UI 层，不在这次范围内。它和 antd 5 的 CSS-in-JS 并不冲突——只是两套样式注入顺序需要小心，`babel-plugin-styled-components` 挂在 Vite 的 react 插件下继续生效：

```ts
react({
  babel: {
    plugins: [
      'babel-plugin-styled-components',
      ['@babel/plugin-proposal-decorators', { legacy: true }],
    ],
  },
}),
```

`legacy: true` 这个装饰器配置是必须的——datart 里用装饰器注册图表元信息，不配就编译不过。

### 结构性收益

- **`craco.config.js` 删除**，3 个额外入口的 HtmlWebpackPlugin 复制、10 组 cacheGroups、MonacoWebpackPlugin、WebpackBar 全部消失，配置文件从「补丁集合」变成一份声明式配置。
- **构建目标同源**：开发和生产的模块解析、CSS 处理、别名解析走同一套插件链，不会再出现「dev 正常、build 挂掉」。
- **地图下钻落地**：369 份 GeoJSON 通过 `import.meta.glob` 接入，补齐了上游没有的区县级下钻。

---

## 十、留下的债，比做完的事更值得写

一篇开发历程只写好话就没意义了。这个仓库当前的状态，我知道的问题至少这四个：

1. **`jest.config.cjs` 是死链。**

   ```js
   const { createJestConfig } = require('@craco/craco');
   const cracoConfig = require('./craco.config.js');  // 这个文件已经被我删了
   module.exports = createJestConfig(cracoConfig, {});
   ```

   craco 已经不装、`craco.config.js` 已经不存在，所以 `yarn test` 必然起不来。测试本身（`jest-canvas-mock` + 那批 `__tests__`）是资产，但执行链断了——要么迁到 Vitest（有 `vite-jest` 或直接换 API 兼容层），要么把 jest 配置独立出来。**这是最该优先补的一块。**

2. **地图数据全量预加载。** 上一节说过，拆包做了，懒加载的执行时机没做对，等于白拆。

3. **`React.StrictMode` 缺席。** 副作用幂等性没修，等于放弃了 React 给我们的一项免费检查。

4. **构建产物入库。** `build/` 和 `stats.html` 都在版本控制里，每次构建 diff 出几千行，code review 等于失效。

还有一个不算债但值得说明的：`react-app-polyfill` 从 3.0.0 退到了 2.0.0。这一处我没有严谨的技术理由，更像某次调依赖冲突时的随手一笔，写在这里标记为「待确认」。

---

## 十一、回头看，这次迁移教会我什么

**第一，构建迁移的难点从来不是构建器。**
Vite 的配置我只写了 100 来行，真正花时间的是：把 CRA 隐式提供的行为一条条列出来、逐条在新体系里找到等价物、然后验证行为一致。`process.env` 垫片、history rewrites、postcss 链、SVG 导入、路径别名——每一条都是「CRA 免费给的，Vite 要你自己声明」。**迁移的本质是显式化，不是换工具。**

**第二，版本升级会替你还技术债。**
antd 5 逼我把 `slice(-1)` 那种靠「数组最后一个元素」偷懒的写法改成拍平字符串，顺手修掉了两表同名字段冲突的静默 bug。这种事你不能指望排期，只能指望升级。

**第三，能删的配置才是好配置。**
上游那十组 `cacheGroups` 是「我对打包结果有精确预期」的产物。删掉之后我发现，Rollup 的默认分包并不比人工差，而人工维护的那份预期，早就跟不上依赖树的演化了。**凡是需要持续维护才能保持正确的配置，最终都会变成错误的配置。**

**第四，也是最重要的一条：把没做的事写下来。**
这个仓库 10 个 commit 就完成了主体迁移，看起来效率很高。但那四个债摆在那里——测试跑不了、地图全量拉、StrictMode 摘了、产物入库。如果不写下来，半年后的我会以为这是一个干净的完成品，然后在上面继续加东西。

---

## 附：完整提交时间线

| 时间 | 内容 |
| --- | --- |
| 2023-10-10 | CRA → Vite 主体迁移；地图下钻；大屏组件主题默认值修复 |
| 2023-12-18 | 合并上游 #2249 特性：chartConfig 双重序列化热修、图片组件重构、大屏 thunk 收口、构建产物入库 |
| 2024-03-27 | 修复视图关联字段选择器（TreeSelect key 拍平，antd 5 后置修复） |

仓库：[nil-w/datart-vite](https://github.com/nil-w/datart-vite)
上游：[running-elephant/datart](https://github.com/running-elephant/datart)（基线 `1.0.0-rc.3`）

如果有人也在迁 CRA 老项目，希望上面那几个「不知道就会踩」的表格能省你一天。
