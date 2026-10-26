# Liberty 库分析器（liberty-analyzer）

一个纯前端网页应用：解析标准单元库 / IO / 存储器 **Liberty (.lib)** 文件，
提取**库级通用属性**、**每个 cell 的完整信息**，并把**查找表（LUT）图表化**
（二维热力图 / 三维曲面 / 原始数据矩阵 / CSV 导出），同时支持**多库多 cell 对比**。

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
- **下载开源库**：模态框内置 21 个库条目，按工艺/节点分组，支持在线抓取
  （自动尝试 raw → ghproxy 镜像 → GitHub API）。涵盖多 corner / 多 VT PDK，
  可直接用于对比分析（见下方「单元对比」）。`.lib.gz` 压缩格式自动解压。
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

### 5. 单元对比（「对比」标签页）
支持**库内对比**与**跨库对比**（多 corner / 多 VT 库），最多 8 项：

- **加入对比**：在「单元详情」头部点击「加入对比」按钮，或在对比面板手动选库 + cell 添加
- **属性对比表**：面积、漏电、引脚数、时序弧数、drive_strength、PVT 等横向对比，
  相同值绿色高亮、差异红色高亮
- **引脚对比表**：合并所有 cell 的引脚，逐列显示方向 / 功能 / 电容，缺失标灰
- **时序弧对比表**：按 `pin ← related_pin` 对齐，显示 timing_type / timing_sense / 表数量
- **LUT 曲线叠加**：选定 pin / related_pin / 查找表后，在指定负载电容处对二维 LUT
  做线性插值切片，把多个 cell 的 `transition → value` 曲线叠加绘制（每项一色），
  直观对比不同 corner / VT 的延迟差异

### 6. 可下载的开源库目录（21 个，按工艺分组）

| 分组 | 库 | 说明 |
|------|----|------|
| **Nangate45 (45nm)** | NangateOpenCellLibrary typical | 135 cells，经典教学库（本地内置） |
| **ASAP7 (7nm FinFET)** | SIMPLE/RVT/TT | 56 cells，预测性 7nm PDK（本地内置） |
| **SkyWater 130nm** | sky130_fd_sc_hd TT 025C 1v80 | 428 cells，高密度（本地内置） |
| | sky130_fd_sc_hs TT 100C 1v80 | 高速库，35 MB，可与 hd 对比速度等级与温度 |
| | sky130 dummy_io | IO 占位单元库，inout 方向示例 |
| **IHP 130nm (sg13g2)** | stdcell typ / fast / slow | 3 个 PVT corner，1.6 MB，可对比 PVT |
| | IO typ | IO 单元，190 KB |
| **GF 2nm 教学库 (gt2n)** | ELVT / LVT / SVT / HVT / ULVT | 5 种阈值电压，1.1 MB，**多 VT 直接对比** |
| **GF 180nm (gf180mcu)** | 7t5v0 TT / SS / FF | 3 个 PVT corner，3 MB gz 压缩 |
| **存储器宏 (fakeram45)** | 512x64 / 1024x32 / 128x64 / 256x64 / 64x64 | memory 组结构，blackbox 时序 |

> 同组内的多 corner / 多 VT 库加载后，可在「对比」标签页直接对比属性与 LUT 曲线。

## 目录结构

```
liberty-analyzer/
├── .gitignore
├── index.html                  # 应用入口（单页）
├── serve.py                    # Python 一键启动脚本
├── README.md
├── css/
│   └── style.css               # 样式（浅色专业主题）
├── js/
│   ├── liberty-parser.js       # Liberty 解析器 + 分析模型（浏览器/Node/Worker 三端）
│   ├── liberty-worker-src.js   # Worker 逻辑源码（Blob 自包含 Worker 用）
│   └── app.js                  # 应用逻辑与渲染
├── libs/                       # 内置开源 .lib 库（约 22 MB）
│   ├── NangateOpenCellLibrary_typical.lib
│   ├── asap7sc7p5t_SIMPLE_RVT_TT_nldm_211120.lib
│   └── sky130_fd_sc_hd__tt_025C_1v80.lib
└── vendor/
    ├── echarts.min.js          # ECharts 5.5（本地化，离线可用）
    └── echarts-gl.min.js       # 3D 曲面扩展（按需懒加载，不拖慢首屏）
```

## 性能设计（大文件不卡界面）

- **Blob 自包含 Worker**：解析在后台线程执行，主线程只负责渲染。Worker 源码由
  `js/liberty-parser.js` + `js/liberty-worker-src.js`（逻辑字符串）拼接后经
  `Blob URL` 创建——**不发起任何子资源请求**。这规避了两类问题：
  ① 部分托管平台网关会挂起 Worker 的 `importScripts` 子资源请求（不报错也不返回，
  导致解析永远等待）；② file:// 下 Chrome 对 Worker 的限制。
- **20 秒超时保护**：Worker 无响应自动终止并回退主线程同步解析（toast 会说明），
  任何环境下都不会"一直解析"。
- **Tokenizer 平铺存储**：token 流存于 `Uint8Array/Int32Array` 类型化数组，
  避免百万级 token 对象分配（sky130 12.8MB ≈ 56 万 token）。
- **echarts-gl 懒加载**：仅在点击「3D 曲面」且浏览器支持 WebGL 时才注入
  640KB 脚本，首屏与二维分析完全不受影响。
- **多镜像下载链**：GitHub raw → ghproxy.net（国内镜像）→ GitHub API（base64），
  每级失败自动降级，错误信息精确到 HTTP 状态码与镜像来源。
- **gzip 自动解压**：`.lib.gz` 库通过浏览器原生 `DecompressionStream` 解压
  （Chrome 80+ / Firefox 65+ / Safari 16.4+），不支持时给出明确提示。

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

## 已知限制

- CCS 非线性模型（ecsm 组）仅做通用解析与展示，不计算电流波形
- 超大库（>30MB）会弹出耗时警告；极端情况下可能触发浏览器内存限制
- 在线下载依赖目标站点可达性：国内网络会自动尝试 ghproxy / GitHub API 镜像，
  全部失败时请手动下载后用「上传 .lib」加载
- `.lib.gz` 解压需浏览器支持 `DecompressionStream`，不支持时请手动解压后上传
- file:// 直接打开时 Chrome 禁止 Worker 与 fetch 本地文件，将自动回退同步解析，
  但内置库加载不可用——请始终通过 HTTP 服务器启动

## 数据来源与许可

内置库文件来自公开开源项目，版权归原作者所有：

- Nangate45: Nangate Inc.（OpenROAD-flow-scripts 镜像分发）
- ASAP7: Arizona State University / Lawrence T. Clark（BSD-3）
- SkyWater 130nm: SkyWater Technology / Google（Apache-2.0）

可下载的开源库均来自 [OpenROAD-flow-scripts](https://github.com/The-OpenROAD-Project/OpenROAD-flow-scripts)
平台目录，包括 IHP 130nm (sg13g2)、GF 2nm 教学库 (gt2n)、GF 180nm (gf180mcu) 等。

本工具仅做本地解析与可视化，不修改原始文件。
