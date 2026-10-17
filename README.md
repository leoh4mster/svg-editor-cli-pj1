# SVG CLI Editor

软件设计课程 PJ1 Phase 1：使用 TypeScript 和面向对象设计实现命令行 SVG 编辑器。

项目按 [六阶段开发计划](doc/DEVELOPMENT_PLAN.md) 逐步提交。第 2 阶段已完成：在 CLI 与画布管理基础上增加六种图形、嵌套创建和结构查看；完整功能仍在开发中。

## 运行

需要 Node.js 22 或更新版本，以及 npm。

```sh
npm ci
npm run cli
```

交互终端显示 `svg>` 提示符。输入结束时退出：macOS / Linux 使用 `Ctrl+D`，也可以使用 `Ctrl+C`。当前支持：

```text
help
init [w] [h]
canvas [w h]
create <type> <id> [params…] [in <containerId>]
tree [id]
show <id>
```

示例：

```text
svg> init
canvas 800x600 created
svg> canvas 400 300
canvas resized to 400x300
svg> canvas
canvas 400x300
svg> create g node
g#node created
svg> create rect panel 10 20 100 50 #4a90d9 in node
rect#panel created in g#node
svg> create text title 20 45 "软件设计 PJ1" in node
text#title created in g#node
svg> tree
svg (400x300)
└── g#node
    ├── rect#panel x=10 y=20 w=100 h=50 fill=#4a90d9
    └── text#title (20,45) "软件设计 PJ1"
```

`init 400` 使用默认高度 600；`canvas` 修改尺寸时必须同时给出宽和高。宽高必须为有限正数，允许小数。`#` 开头的整行是注释，双引号可以包裹带空格参数。

六种图形的创建语法如下，尾部均可增加 `in <containerId>`；目标必须是已经存在的 `g`：

```text
create rect <id> <x> <y> <w> <h> [fill]
create circle <id> <cx> <cy> <r> [fill]
create ellipse <id> <cx> <cy> <rx> <ry> [fill]
create line <id> <x1> <y1> <x2> <y2> [stroke]
create text <id> <x> <y> "content"
create g <id>
```

坐标允许负数，所有几何数值必须有限；图形尺寸、半径允许零但不允许负数。省略 `fill` / `stroke` 时不写入该属性，保留 SVG 默认语义。ID 全文档唯一、大小写敏感，允许中文，不允许空值、空白或控制字符。`tree <id>` 查看子树；`show <id>` 显示完整属性和父级。

也可从标准输入回放脚本；管道模式不显示交互提示符：

```sh
printf 'init 400 300\ncanvas\n' | npm run cli
```

仓库中的 `examples/phase1.cli` 包含一次预期失败的尺寸修改，可用于检查报错后画布保持不变：

```sh
npm run cli --silent < examples/phase1.cli
```

`examples/phase2.cli` 使用嵌套容器和中文文本构建题目中的两节点流程图，并查看结构与属性：

```sh
npm run cli --silent < examples/phase2.cli
```

## 检查

```sh
npm run check
```

该命令运行类型检查、构建与测试。测试包括领域约束、命令解析和真实 CLI 子进程行为；具体结果随每次阶段提交更新至 [项目文档](doc/README.md)。

## 当前范围

当前范围为画布管理、六种图形创建、创建时指定父容器和结构查看。移动、缩放、属性修改、删除、事后分组、撤销重做及 SVG 文件读写尚未实现；本阶段流程图示例只检查 CLI 输出。`help` 只列出当前可执行的命令。题目中的插件类型 `box` 不属于本次 PJ1 Phase 1 的实现范围。

- [GitHub 私有仓库](https://github.com/leoh4mster/svg-editor-cli-pj1)
- [课程要求](phase_cli_1.md)
- [架构、协作记录、一致性自查与质量保证](doc/README.md)
- [开发阶段和后续接续说明](doc/DEVELOPMENT_PLAN.md)
