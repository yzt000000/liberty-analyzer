# Liberty 库分析器（liberty-analyzer）

一个纯前端网页应用：解析标准单元库 / IO / 存储器 **Liberty (.lib)** 文件，
提取**库级通用属性**、**每个 cell 的完整信息**，并把**查找表（LUT）图表化**
（二维热力图 / 三维曲面 / 原始数据矩阵 / CSV 导出）。

## 快速开始

```bash
# 方式一: Python 一键启动（自动打开浏览器）
python serve.py            # 默认 8080 端口
python serve.py 9000       # 指定端口

# 方式二: 任意静态服务器
npx serve .                # 或 php -S localhost:8080 等
```

然后访问 `http://127.0.0.1:8080/index.html`。

> ⚠️ 不要直接用 file:// 方式打开 index.html：浏览器安全策略会阻止加载内置 .lib 文件，
> 届时只能使用「上传 .lib」功能。

## 功能

### 1. 加载库（三种方式）
- **内置开源库**（随应用分发，位于 `libs/`）：
  - Nangate45 — 45nm，135 cells（经典 OpenROAD 教学库）
  - ASAP7 SIMPLE/RVT/TT — 7nm FinFET 预测 PDK，56 cells
  - SkyWater sky130_fd_sc_hd (TT 1.8V/25C) — 130nm 开源 PDK，428 cells
- **下载开源库**：模态框内置目录，支持在线抓取（自动尝试 raw → ghproxy 镜像 → GitHub API，含 FakeRAM45 存储器宏与 sky130 IO）
- **上传本地 .lib**：支持多选
- **自定义 URL**：输入任意允许 CORS 的 .lib 地址直接抓取解析

> **下载/上传的库保存在哪里？** 只保存在当前网页的**内存**中（刷新即失效），
> 不会写入磁盘——浏览器网页没有写本地文件的权限。`libs/` 文件夹仅包含内置的 3 个库。
> 如需落盘：加载后点右上角 **「保存 .lib」**，浏览器会存到默认下载目录。

### 2. 库级通用属性（「库概览」标签页）
- 统计卡片：cell 数、pin 数、时序弧数、LUT 数、时序单元数、平均漏电
- 库级属性：technology、delay_model、revision、date、默认工作条件、标称 PVT、总线命名风格
- 单位定义：time / voltage / capacitive_load / leakage_power / pulling_resistance / current
- 工作条件表（operating_conditions，默认角高亮）
- LUT 模板表（lu_table_template 的 variable_1 / variable_2）
- 面积分布直方图（宽动态范围自动切换对数分箱）
- 静态漏电 Top 10 条形图
- 全部 `define(...)` 声明

### 3. 每个 cell 的信息（左侧列表 + 「单元详情」标签页）
- 列表：搜索（名称子串）、类型筛选（组合/时序）、排序（名称/面积/漏电/pin 数）、分页
- 详情：area、cell_leakage_power、cell_footprint、drive_strength、dont_use、pg_pin
- 每个 pin：方向、电容（含 fall/rise）、max_capacitance、max_transition、
  function 布尔表达式、three_state、nextstate、clock、最小脉宽
- 每个 pin 的 timing 弧：related_pin、timing_type、timing_sense、when 条件
- internal_power、条件 leakage_power
- FF / LATCH 组属性、statetable 状态表
- 原始 Liberty 源码片段（大括号配对提取）+ 解析结果 AST JSON 树

### 4. LUT 图表化（「LUT 图表」标签页）
- 选择器：cell → pin → 时序弧 → 查找表（cell_rise/cell_fall/rise_transition/
  fall_transition/rise_power/fall_power）
- **二维热力图**：x = 负载电容（index_2），y = 输入跳变（index_1），连续色标，
  ≤8×8 时直接标注数值，tooltip 显示坐标与数值
- **三维曲面**（echarts-gl）：自动旋转、可拖拽缩放，visualMap 着色
- **一维表**：折线图 + min/max 标注
- **原始数据矩阵**：完整数值表，min 绿 / max 红高亮
- **CSV 导出**：当前 LUT 矩阵 / 整个库的 cell 列表

## 目录结构

```
liberty-analyzer/
├── index.html                  # 应用入口（单页）
├── serve.py                    # Python 一键启动脚本
├── css/style.css               # 样式（浅色专业主题）
├── js/liberty-parser.js        # Liberty 解析器 + 分析模型（浏览器/Node/Worker 三端）
├── js/liberty-worker-src.js    # Worker 逻辑源码（Blob 自包含 Worker 用）
├── js/app.js                   # 应用逻辑与渲染
├── vendor/echarts.min.js       # ECharts 5.5（本地化，离线可用）
├── vendor/echarts-gl.min.js    # 3D 曲面扩展（按需懒加载，不拖慢首屏）
├── libs/                       # 内置开源 .lib 库（约 22 MB）
│   ├── NangateOpenCellLibrary_typical.lib
│   ├── asap7sc7p5t_SIMPLE_RVT_TT_nldm_211120.lib
│   └── sky130_fd_sc_hd__tt_025C_1v80.lib
├── test-parser.js              # 解析器 Node 测试（cell 数/LUT 数值抽检）
├── test-worker.js              # Worker 逻辑测试（vm 模拟 worker 全局）
├── test-browser.js             # 真实 Chrome 流程测试（puppeteer-core）
├── test-browser2.js            # 真实 Chrome 深度诊断
├── test-browser3.js            # 真实 Chrome 上传流程测试
└── test-smoke.js               # jsdom 全链路冒烟测试（50 项断言）
```

## 性能设计（大文件不卡界面）

- **Blob 自包含 Worker**：解析在后台线程执行，主线程只负责渲染。Worker 源码由
  `js/liberty-parser.js` + `js/liberty-worker-src.js`（逻辑字符串）拼接后经
  `Blob URL` 创建——**不发起任何子资源请求**。这规避了两类问题：
  ① 部分托管平台网关会挂起 Worker 的 `importScripts` 子资源请求（不报错也不返回，
  导致解析永远等待）；② file:// 下 Chrome 对 Worker 的限制。
- **20 秒超时保护**：Worker 无响应自动终止并回退主线程同步解析（toast 会说明），
  任何环境下都不会“一直解析”。
- **Tokenizer 平铺存储**：token 流存于 `Uint8Array/Int32Array` 类型化数组，
  避免百万级 token 对象分配（sky130 12.8MB ≈ 56 万 token）。
- **echarts-gl 懒加载**：仅在点击「3D 曲面」且浏览器支持 WebGL 时才注入
  640KB 脚本，首屏与二维分析完全不受影响。
- **多镜像下载链**：GitHub raw → ghproxy.net（国内镜像）→ GitHub API（base64），
  每级失败自动降级，错误信息精确到 HTTP 状态码与镜像来源。

## 测试

```bash
# 解析器测试（对比源文件校验 cell 数与 LUT 数值）
node test-parser.js

# Worker 端到端测试（vm 模拟 worker 全局环境）
node test-worker.js

# 冒烟测试（需先安装 jsdom 到 node workspace）
NODE_PATH=<node-workspace>/node_modules node test-smoke.js
```

实测数据（Node 22，本机）：

| 库 | 大小 | cells | tokens | 解析耗时 |
|---|---|---|---|---|
| ASAP7 SIMPLE/RVT/TT | 2.3 MB | 56 | ~14 万 | 0.14 s |
| Nangate45 | 6.7 MB | 135 | ~33 万 | 0.6 s |
| sky130_fd_sc_hd TT | 12.8 MB | 428 | 56 万 | 0.8 s |

## 解析器覆盖的 Liberty 语法

- 注释：`/* */`、`//`；行续接 `\`
- 字符串值（含换行与转义）、布尔值、负数、科学计数
- 组：`cell / pin / pg_pin / timing / internal_power / leakage_power / lu_table_template /
  operating_conditions / ff / latch / statetable / memory / bus / type` 等任意组
- 多参数组名：`ff (IQ, IQN)`、`statetable ("CK E SE","IQ")`
- 模板引用组名：`cell_fall(Timing_7_7) { index_1(...); index_2(...); values(...); }`
- 带括号属性值：`technology("cmos");`、`capacitive_load_unit(1.0, "pf");`
- `values` 的多字符串行列表形式（Nangate 风格）与单字符串换行形式
- `define(...)` 属性声明；NLDM / CCS / ECSM 结构均按通用组解析

## 部署 / 发布为网站

纯静态站点，无构建步骤，可发布到任意静态托管平台：

```bash
# 方式一: WorkBuddy 内置发布（生成分享链接）
#   在对话中要求发布即可，工具会自动处理

# 方式二: 任意静态托管（GitHub Pages / Vercel / Netlify / OSS 等）
#   把整个目录原样上传，入口为 index.html
```

**分享链接门禁兼容**：部分托管平台（如 WorkBuddy 应用托管）的分享链接要求
**每个请求都携带 `?sharecode=...`**，否则子资源返回 403「链接不完整」。
本应用通过 `<head>` 中的内联资源加载器把地址栏 query 自动传递给所有同源请求
（CSS/JS/库文件/Worker/懒加载的 echarts-gl），本地或无 query 访问时行为不变。
自建托管（无门禁）时 query 为空，同样正常工作。

**资源加载策略（稳健性）**：加载器**并行**获取 5 个资源（CSS / echarts / 解析器 /
Worker 逻辑 / 主程序），单个资源 12 秒超时并自动重试 2 次，全部到齐后**严格按依赖顺序**
注入执行。加载期间显示「正在加载组件 n/5」遮罩，组件就绪前点击不会落到未绑定事件的
按钮上；全部失败时给出明确错误提示与「重新加载」按钮。这样即使某个请求被网关迟滞，
也不会出现应用永久停在未初始化状态的情况。

> 早期版本采用串行加载（前一个 `onload` 才发起下一个），任一请求迟缓/静默挂起就会
> 导致主程序永远不初始化，页面表现为「点击无反应」——已由并行加载 + 超时重试解决。

**CDN 缓存与版本号**：托管平台的 CDN 边缘节点可能缓存旧版静态文件且各节点
不一致（表现为不同用户看到不同版本）。所有资源 URL 都带有 `?v=<CACHE_VERSION>`
版本号（在 `index.html` 内联加载器中定义，app.js 的 `shareQs()` 共用），
**每次发布新内容时必须递增该版本号**（如 `20261024b` → `20261024c`），
否则边缘节点会继续 serving 旧文件。

## 已知限制

- CCS 非线性模型（ecsm 组）仅做通用解析与展示，不计算电流波形
- 超大库（>30MB）会弹出耗时警告；极端情况下可能触发浏览器内存限制
- 在线下载依赖目标站点可达性：国内网络会自动尝试 ghproxy / GitHub API 镜像，
  全部失败时请手动下载后用「上传 .lib」加载
- file:// 直接打开时 Chrome 禁止 Worker 与 fetch 本地文件，将自动回退同步解析，
  但内置库加载不可用——请始终通过 HTTP 服务器启动

## 数据来源与许可

内置库文件来自公开开源项目，版权归原作者所有：

- Nangate45: Nangate Inc.（OpenROAD-flow-scripts 镜像分发）
- ASAP7: Arizona State University / Lawrence T. Clark（BSD-3）
- SkyWater 130nm: SkyWater Technology / Google（Apache-2.0）

本工具仅做本地解析与可视化，不修改原始文件。
