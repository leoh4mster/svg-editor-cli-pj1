# SVG CLI Editor

软件设计课程 PJ1 Phase 1：使用 TypeScript 和面向对象设计实现命令行 SVG 编辑器。

项目按 [六阶段开发计划](doc/DEVELOPMENT_PLAN.md) 逐步提交。当前为第 1 阶段，提供 CLI 基础、命令注册和画布管理；完整功能仍在开发中。

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
```

示例：

```text
svg> init
canvas 800x600 created
svg> canvas 400 300
canvas resized to 400x300
svg> canvas
canvas 400x300
```

`init 400` 使用默认高度 600；`canvas` 修改尺寸时必须同时给出宽和高。宽高必须为有限正数，允许小数。`#` 开头的整行是注释，双引号可以包裹带空格参数。

也可从标准输入回放脚本；管道模式不显示交互提示符：

```sh
printf 'init 400 300\ncanvas\n' | npm run cli
```

仓库中的 `examples/phase1.cli` 包含一次预期失败的尺寸修改，可用于检查报错后画布保持不变：

```sh
npm run cli --silent < examples/phase1.cli
```

## 检查

```sh
npm run check
```

该命令运行类型检查、构建与测试。测试包括领域约束、命令解析和真实 CLI 子进程行为；具体结果随每次阶段提交更新至 [项目文档](doc/README.md)。

## 当前范围

图形创建、显示、编辑、分组、撤销重做及 SVG 文件读写尚未实现。`help` 只列出当前可执行的命令。题目中的插件类型 `box` 不属于本次 PJ1 Phase 1 的实现范围。

- [课程要求](phase_cli_1.md)
- [架构、协作记录、一致性自查与质量保证](doc/README.md)
- [开发阶段和后续接续说明](doc/DEVELOPMENT_PLAN.md)
