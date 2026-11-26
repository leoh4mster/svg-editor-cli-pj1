# CLI 重构指标

基线 `77112dc856b18290646351ea87e6ce1f87400f7a`，本次源码快照 `30499fa24a39c2974014708f7787e0c7c0622ef4`。

按 Git 中的运行源码统计物理行（含空行及注释）。内核包含领域、应用、CLI 与基础 I/O，装配处包含入口与加载器，插件按 plugins/ 归类。VS Code 单列。测试、依赖、构建结果和指标脚本均排除。

圈复杂度为有函数体的每个函数、方法或访问器各 1，含顶层执行语句的模块再计 1；每个 if、循环、非 default 的 case、catch、三元及短路逻辑运算各加 1。按 TypeScript AST 遍历，两端使用同一口径。

| 范围 | 原文件数 | 现文件数 | 原行数 | 现行数 | 原复杂度 | 现复杂度 | 复杂度增量 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 内核 | 48 | 32 | 2300 | 1982 | 519 | 483 | -36 |
| 装配处 | 1 | 7 | 64 | 340 | 2 | 118 | 116 |
| 插件 | 0 | 22 | 0 | 470 | 0 | 78 | 78 |
| VS Code | 0 | 4 | 0 | 111 | 0 | 25 | 25 |
| CLI 合计 | 49 | 61 | 2364 | 2792 | 521 | 679 | 158 |

## 文件清单

| 路径 | 范围 | 职责 | 原行数 → 现行数 | 原复杂度 → 现复杂度 |
| --- | --- | --- | ---: | ---: |
| `plugins/builtin/BasicShapeProvider.ts` | 插件 | 基础图形的构造和 SVG 字段转换 | — → 29 | — → 11 |
| `plugins/builtin/BuiltinPlugin.ts` | 插件 | 注册内置图形和命令 | — → 11 | — → 4 |
| `plugins/builtin/BuiltinShapes.ts` | 插件 | 六种图形的参数及提供者 | — → 83 | — → 7 |
| `plugins/builtin/commands/AddToCommand.ts` | 插件 | addto 命令 | — → 15 | — → 2 |
| `plugins/builtin/commands/BackCommand.ts` | 插件 | back 命令 | — → 15 | — → 2 |
| `plugins/builtin/commands/CanvasCommand.ts` | 插件 | canvas 命令 | — → 22 | — → 3 |
| `plugins/builtin/commands/CreateCommand.ts` | 插件 | create 命令 | — → 29 | — → 7 |
| `plugins/builtin/commands/DeleteCommand.ts` | 插件 | delete 命令 | — → 15 | — → 2 |
| `plugins/builtin/commands/FrontCommand.ts` | 插件 | front 命令 | — → 15 | — → 2 |
| `plugins/builtin/commands/GroupCommand.ts` | 插件 | group 命令 | — → 17 | — → 3 |
| `plugins/builtin/commands/HelpCommand.ts` | 插件 | help 命令 | — → 25 | — → 4 |
| `plugins/builtin/commands/InitCommand.ts` | 插件 | init 命令 | — → 18 | — → 4 |
| `plugins/builtin/commands/MoveCommand.ts` | 插件 | move 命令 | — → 18 | — → 2 |
| `plugins/builtin/commands/ReadCommand.ts` | 插件 | read 命令 | — → 24 | — → 4 |
| `plugins/builtin/commands/RedoCommand.ts` | 插件 | redo 命令 | — → 15 | — → 2 |
| `plugins/builtin/commands/SaveCommand.ts` | 插件 | save 命令 | — → 27 | — → 6 |
| `plugins/builtin/commands/ScaleCommand.ts` | 插件 | scale 命令 | — → 17 | — → 2 |
| `plugins/builtin/commands/SetCommand.ts` | 插件 | set 命令 | — → 14 | — → 2 |
| `plugins/builtin/commands/ShowCommand.ts` | 插件 | show 命令 | — → 15 | — → 2 |
| `plugins/builtin/commands/TreeCommand.ts` | 插件 | tree 命令 | — → 15 | — → 3 |
| `plugins/builtin/commands/UndoCommand.ts` | 插件 | undo 命令 | — → 15 | — → 2 |
| `plugins/builtin/commands/UngroupCommand.ts` | 插件 | ungroup 命令 | — → 16 | — → 2 |
| `src/application/AttributeDispatcher.ts` | 内核 | 匹配属性处理器与缺省属性修改 | — → 21 | — → 6 |
| `src/application/CommandArguments.ts` | 内核 | 校验命令参数 | 19 → 19 | 4 → 4 |
| `src/application/EditorSession.ts` | 内核 | 画布、当前路径及编辑历史 | 76 → 83 | 10 → 11 |
| `src/application/ShapeFactory.ts` | 内核 | 构造图形并查找读回规则 | 134 → 31 | 20 → 11 |
| `src/application/SvgReadResult.ts` | 内核 | 导入结果与警告 | 19 → 19 | 3 → 3 |
| `src/application/commands/AddToCommand.ts` | 内核 | addto 命令 | 15 → — | 2 → — |
| `src/application/commands/BackCommand.ts` | 内核 | back 命令 | 15 → — | 2 → — |
| `src/application/commands/CanvasCommand.ts` | 内核 | canvas 命令 | 22 → — | 3 → — |
| `src/application/commands/Command.ts` | 内核 | 命令契约 | 18 → 18 | 3 → 3 |
| `src/application/commands/CreateCommand.ts` | 内核 | create 命令 | 30 → — | 7 → — |
| `src/application/commands/DeleteCommand.ts` | 内核 | delete 命令 | 15 → — | 2 → — |
| `src/application/commands/EditCommand.ts` | 内核 | 将编辑纳入会话事务 | 11 → 11 | 2 → 2 |
| `src/application/commands/FrontCommand.ts` | 内核 | front 命令 | 15 → — | 2 → — |
| `src/application/commands/GroupCommand.ts` | 内核 | group 命令 | 17 → — | 3 → — |
| `src/application/commands/HelpCommand.ts` | 内核 | help 命令 | 27 → — | 4 → — |
| `src/application/commands/InitCommand.ts` | 内核 | init 命令 | 18 → — | 4 → — |
| `src/application/commands/MoveCommand.ts` | 内核 | move 命令 | 18 → — | 2 → — |
| `src/application/commands/ReadCommand.ts` | 内核 | read 命令 | 27 → — | 4 → — |
| `src/application/commands/RedoCommand.ts` | 内核 | redo 命令 | 15 → — | 2 → — |
| `src/application/commands/SaveCommand.ts` | 内核 | save 命令 | 30 → — | 6 → — |
| `src/application/commands/ScaleCommand.ts` | 内核 | scale 命令 | 17 → — | 2 → — |
| `src/application/commands/SetCommand.ts` | 内核 | set 命令 | 17 → — | 2 → — |
| `src/application/commands/ShowCommand.ts` | 内核 | show 命令 | 16 → — | 2 → — |
| `src/application/commands/TreeCommand.ts` | 内核 | tree 命令 | 16 → — | 2 → — |
| `src/application/commands/UndoCommand.ts` | 内核 | undo 命令 | 15 → — | 2 → — |
| `src/application/commands/UngroupCommand.ts` | 内核 | ungroup 命令 | 16 → — | 2 → — |
| `src/application/formatters/ShowFormatter.ts` | 内核 | 格式化图形明细 | 12 → 12 | 3 → 3 |
| `src/application/formatters/TreeFormatter.ts` | 内核 | 生成结构树行 | 25 → 37 | 6 → 17 |
| `src/application/history/CommandHistory.ts` | 内核 | 撤销与重做栈 | 54 → 54 | 8 → 8 |
| `src/application/history/HistoryEntry.ts` | 内核 | 编辑前后快照 | 28 → 28 | 4 → 4 |
| `src/application/ports/CommandCatalog.ts` | 内核 | 命令目录端口 | 3 → 3 | 0 → 0 |
| `src/application/ports/SvgCodec.ts` | 内核 | SVG 编解码端口 | 7 → 7 | 0 → 0 |
| `src/application/ports/TextFileStore.ts` | 内核 | 文本读写端口 | 4 → 4 | 0 → 0 |
| `src/cli/Cli.ts` | 内核 | 逐行读取、分发和输出 | 52 → 52 | 8 → 8 |
| `src/cli/CommandLineParser.ts` | 内核 | 命令行分词 | 46 → 46 | 13 → 13 |
| `src/cli/CommandRegistry.ts` | 内核 | 命令分发与帮助目录 | 31 → 31 | 6 → 7 |
| `src/domain/EditorError.ts` | 内核 | 可报告的编辑器错误 | 6 → 6 | 1 → 1 |
| `src/domain/NumericValue.ts` | 内核 | 解析有限数值 | 15 → 15 | 5 → 5 |
| `src/domain/SvgDocument.ts` | 内核 | 画布、图形索引和层级操作 | 380 → 386 | 109 → 112 |
| `src/domain/shapes/Circle.ts` | 内核 | Circle 图形的几何与属性行为 | 54 → 54 | 10 → 10 |
| `src/domain/shapes/Ellipse.ts` | 内核 | Ellipse 图形的几何与属性行为 | 59 → 59 | 10 → 10 |
| `src/domain/shapes/Group.ts` | 内核 | Group 图形的几何与属性行为 | 142 → 146 | 36 → 37 |
| `src/domain/shapes/Line.ts` | 内核 | Line 图形的几何与属性行为 | 60 → 60 | 10 → 10 |
| `src/domain/shapes/Rect.ts` | 内核 | Rect 图形的几何与属性行为 | 60 → 60 | 10 → 10 |
| `src/domain/shapes/Shape.ts` | 内核 | 图形公共行为与所有权 | 185 → 197 | 51 → 54 |
| `src/domain/shapes/Text.ts` | 内核 | Text 图形的几何与属性行为 | 61 → 61 | 12 → 12 |
| `src/extensions/Contracts.ts` | 内核 | 插件契约与宿主能力类型 | — → 58 | — → 0 |
| `src/extensions/index.ts` | 内核 | 插件公开 API | — → 19 | — → 0 |
| `src/host/EditorHost.ts` | 装配处 | 会话启动依赖及内置能力装配 | — → 76 | — → 4 |
| `src/host/codePlugins.ts` | 装配处 | 代码装配的可选插件列表 | — → 4 | — → 1 |
| `src/host/loader/PluginLoader.ts` | 装配处 | 配置校验、插件加载与故障隔离 | — → 85 | — → 29 |
| `src/host/loader/PluginPackage.ts` | 装配处 | 定位包清单与 ESM 入口 | — → 66 | — → 29 |
| `src/host/loader/Registration.ts` | 装配处 | 暂存并原子发布注册 | — → 80 | — → 44 |
| `src/host/loader/RegistrationError.ts` | 装配处 | 注册冲突与清单差异诊断 | — → 11 | — → 2 |
| `src/infrastructure/NodeFileStore.ts` | 内核 | 本地文本文件适配器 | 57 → 57 | 14 → 14 |
| `src/infrastructure/svg/SvgElement.ts` | 内核 | XML 输入元素树 | 37 → 37 | 9 → 9 |
| `src/infrastructure/svg/SvgXmlCodec.ts` | 内核 | SVG 输入与输出 | 284 → 291 | 97 → 99 |
| `src/main.ts` | 装配处 | CLI 入口和启动装配 | 64 → 18 | 2 → 9 |
| `vscode-extension/src/SvgBadgeProvider.ts` | VS Code | Explorer 文件标记 | — → 16 | — → 5 |
| `vscode-extension/src/SvgOutlineParser.ts` | VS Code | 解析元素层级和源码偏移 | — → 52 | — → 10 |
| `vscode-extension/src/SvgOutlineProvider.ts` | VS Code | 转换为原生大纲节点 | — → 27 | — → 7 |
| `vscode-extension/src/extension.ts` | VS Code | 注册 VS Code 功能 | — → 16 | — → 3 |
