# 软件设计 PJ1 项目报告

## Phase 2 · 插件实践与插件式重构

### 六个开发阶段

| 阶段 | 交付节点 | 进度 |
| --- | --- | --- |
| 1 | VS Code 的文件标记、原生大纲、截图和复用分析 | 已完成 |
| 2 | CLI 四个扩展点、双装配与加载器、对照 `final` 的回归、首次生成指标 | 已完成 |
| 3 | 独立的 `stats`、`dir` 命令插件，目录访问适配器和测试 | 已完成 |
| 4 | `box` 及属性处理器，两种装配的独立接入差异证据 | 已完成 |
| 5 | `modified-star` 与 `(box)` 标签共存、保存点与撤销验证 | 待实施 |
| 6 | 三组会话对照、Git 指标、架构图、ADR、最终验收及 `p2` | 待实施 |

### 第一阶段 · 从 VS Code 原生大纲到 SVG 源码导航

实现之前，先在独立的 VS Code 窗口打开一个嵌套 JSON 文件。内置大纲把 `start` 和 `end` 显示为 `diagram` 的子节点。点击 `start` 后，编辑器跳到第 3 行第 5 列，面包屑也切换到对应属性。SVG 扩展沿用这套交互，把嵌套关系和源码位置交给宿主。扩展的构建、F5 启动和测试命令见[复现说明](../vscode-extension/README.md)，演示使用[示例 SVG](../vscode-extension/sample/example.svg)。

**文件标记。** 下图取自本机 VS Code 1.144.0 的 Extension Development Host。Explorer 中只有文件 `example.svg` 右侧显示 `[]`，目录 `assets.svg` 和普通文件 `notes.txt` 均没有标记。

![Explorer 中 example.svg 带有方括号标记，相邻目录和普通文件右侧为空](images/p2-explorer-badge.png)

**大纲定位。** 下图是在同一窗口点选 `rect#start` 后截取的。左侧显示两层分组和无 id 的 `text`，右侧面包屑指向同一个矩形，状态栏显示第 4 行第 8 列。

![原生大纲选中 rect#start，编辑器定位到第 4 行第 8 列](images/p2-outline-navigation.png)

### 注册、回调与设计模式

| 调用位置 | 插件负责 | VS Code 负责 |
| --- | --- | --- |
| 激活入口 | 将两个 provider 注册到宿主，将注册句柄、文件监听器和事件加入 `context.subscriptions` | 激活扩展，按需调用 provider，释放已登记的资源 |
| Explorer 请求文件装饰 | `SvgBadgeProvider` 检查 URI 后缀，再通过 `workspace.fs.stat` 区分文件和同后缀目录。对于 SVG 文件返回带 `[]` 的 `FileDecoration`；创建或移除条目时通知宿主刷新 | 渲染已有文件行，将装饰附加到该行；文件名及文件内容始终由文件系统维护 |
| 打开或编辑 SVG 源码 | `SvgOutlineParser` 解析当前内存文本并保留节点的 UTF-16 起止偏移。`SvgOutlineProvider` 把节点转换成宿主的 `DocumentSymbol`。每个节点的 `range` 覆盖整个元素，`selectionRange` 指向开始标签名 | 重新请求符号，显示层级、展开与选中状态，并按位置导航。编辑时 XML 暂不完整，宿主可以显示空大纲 |

经典 **Decorator** 包装实现同一接口的组件，转发原操作并附加行为。这里也通过组合给已有文件行增加显示信息，但 provider 持有的是文件查询能力和变化事件，由 Explorer 主动调用。插件没有包装文件对象；最终合并、绘制装饰的是宿主。源码可对照[激活与注册](../vscode-extension/src/extension.ts)和[文件标记实现](../vscode-extension/src/SvgBadgeProvider.ts)。

**Adapter** 的角色在大纲中更直接。宿主要求的目标接口是 `DocumentSymbolProvider`，被适配对象是输出 XML 名称、源码偏移和子节点的解析器。适配器 `SvgOutlineProvider` 组合这个解析器，再用 `TextDocument.positionAt` 转换坐标，组装宿主接受的符号树。文件标记一侧也会把文件状态转换为宿主要求的装饰结果。两个 provider 共享注册与回调方式，返回值各自解决不同问题。[大纲适配器](../vscode-extension/src/SvgOutlineProvider.ts) · [VS Code API](https://code.visualstudio.com/api/references/vscode-api)

### Phase 1 的复用范围

- **解析**沿用与 CLI 相同版本的 `saxes` 解析库，借助开闭标签事件处理自闭合元素、注释及带引号的属性。CLI 的 `SvgXmlCodec` 服务于可编辑图形导入，会验证支持范围、给无 id 的图形分配 id，转换后也没有保留原始标签的位置。大纲需要展示文件里实际存在的标签，因此使用独立的轻量解析器。[CLI 编解码器](../src/infrastructure/svg/SvgXmlCodec.ts) · [大纲解析器](../vscode-extension/src/SvgOutlineParser.ts)
- **模型与遍历**沿用父子关系和文档顺序的思路。CLI 的 `Shape` 带有移动、缩放和编辑约束，`TreeFormatter` 输出带连线和几何信息的终端字符串。VS Code 只需要层级、名称和位置，因此扩展使用小型节点结构，并保留根元素以及无 id 的元素。[Phase 1 树格式器](../src/application/formatters/TreeFormatter.ts)

### 验证及 AI 协作记录

学生确认六阶段方案并授权第一阶段。AI 辅助实现扩展、执行测试、操作真实界面并整理证据。本阶段一次具体修正来自宿主测试：最初的断言要求符号查询在无结果时严格返回空数组，实际版本的 `vscode.executeDocumentSymbolProvider` 返回了 `undefined`。测试改为验证没有符号，并继续对同一文档输入合法 XML，检查节点恢复。解析器本身返回空数组的契约仍由单元测试直接验证。

| 2026-11-26 的检查 | 实际结果 |
| --- | --- |
| 解析器单元测试 | 4 项通过。覆盖嵌套分组、匿名叶子、顺序、CRLF、多行标签、非 BMP 字符、无效 XML 及后续恢复 |
| 真实扩展宿主集成测试 | 通过。检查三类目录项、文件字节、符号层级、定位范围；在同一未保存文档连续输入有效、残缺、有效的 XML，验证符号随编辑变化 |
| 开发宿主界面 | 文件装饰和点击定位见上图。实测 XML 多写一个 `>` 时大纲提示无符号；移除后出现 `svg → g#live-demo`。最后恢复示例文件 |
| 原 CLI 回归 | 仓库根目录执行 `npm run check`，131 项通过，0 项失败 |


### 第二阶段 · 可扩展的 CLI 框架

Phase 1 的 `main.ts` 直接登记十九条命令，`ShapeFactory` 自带六种构造配方。现在启动入口创建宿主，由宿主先加载内置包，再加载所选的可选插件。十九个具体命令类和六种图形的提供者位于 `plugins/builtin/`。领域图形、文档和编辑事务继续由内核维护。公开接口集中在 `src/extensions/`。运行时代码的依赖方向如下。

```plantuml
@startuml
left to right direction
[main] --> [EditorHost]
[EditorHost] --> [内置插件]
[EditorHost] --> [插件加载器]
[插件加载器] --> [注册事务]
[注册事务] --> [扩展点接口]
[内置插件] --> [公开插件 API]
[可选插件] --> [公开插件 API]
[公开插件 API] --> [扩展点接口]
[公开插件 API] --> [领域模型]
[命令分发与应用服务] --> [扩展点接口]
[SVG 编解码器] --> [图形工厂]
[图形工厂] --> [扩展点接口]
@enduml
```

#### 扩展点清单

以下的 `probe` 是集成测试使用的插件，同时提供四种扩展；第二阶段提交的常规入口只启用内置包。正式的命令、复合图形和标签按后续阶段分别接入。[公开接口](../src/extensions/Contracts.ts) · [测试插件](../test/fixtures/probe/ProbePlugin.ts)

| 接口与职责 | 运行时调用点 | 本阶段实现及禁用行为 | 契约与错误 |
| --- | --- | --- | --- |
| `ShapeProvider` 提供创建参数说明、构造及 SVG 读回 | [ShapeFactory.create / svgProvider](../src/application/ShapeFactory.ts) 查注册名；[SvgXmlCodec.buildShape](../src/infrastructure/svg/SvgXmlCodec.ts) 调用 `read` | `BasicShapeProvider` 的六个实例；测试用 `ProbeProvider`。禁用可选扩展仍能使用全部 Phase 1 图形 | 未注册的创建类型报 `unknown shape type: … (is the plugin loaded?)`。创建和读回都核对返回 id。读回最先按匹配 SVG 标签的 `data-kind` 选提供者，无法匹配时用原标签的提供者，例如将带标识的分组读作普通 `g` |
| `Command` 提供语法、帮助及执行方法 | [CommandRegistry.execute / describeCommands](../src/cli/CommandRegistry.ts) | 十九个内置命令类、独立的 `StatsCommand`、`DirCommand` 及测试用 `ProbeCommand`。未安装的命令从帮助中消失，执行时报 `unknown command: <name>` | 由注册项提供用法、说明和执行方法，参数校验由命令负责。缺少方法时加载失败，同类重名报 `duplicate registration: commands/<name>` |
| `TreeDecorator` 返回按节点 id 索引的行尾标签 | [TreeFormatter.format](../src/application/formatters/TreeFormatter.ts) 在每次树渲染时调用各实例的 `labels` | `ProbeLabel` 验证根行、容器行、子树及保存点。关闭时沿用原树输出 | 每个标签为一段非空单行文字，根行的键是 `undefined`，多标签按注册顺序拼接。空标签或换行报 `invalid tree label: <name>`。提供给装饰器的当前文档和保存点为隔离副本 |
| `AttributeHandler` 定义属性在目标图形上的修改方式 | [AttributeDispatcher.apply](../src/application/AttributeDispatcher.ts) 由内置 `SetCommand` 在编辑草稿上调用 | `ProbeAttribute` 用一次 `set` 修改两个位置。没有匹配时执行原图形的 `withAttribute` 规则，未知属性报 `unknown attribute: <attr>` | `handles` 只判断，恰好一个命中时调用 `apply`，返回本次编辑的消息。多匹配报 `ambiguous attribute handler: <id>/<attr>`。处理失败丢弃草稿并保留原历史 |

#### 插件怎样装入

在仓库根目录构建后，下面三个入口分别使用代码装配、配置装配和仅内置能力。

```sh
npm ci
npm run build
node dist/src/main.js
node dist/src/main.js --config plugins.config.json
node dist/src/main.js --no-plugins
```

**代码装配**由 [codePlugins.ts](../src/host/codePlugins.ts) 提供有序项 `{ manifest, plugin, options? }`。插件包提供清单和带 `activate(context, options)` 的默认导出。**配置装配**从仓库根的 [plugins.config.json](../plugins.config.json) 读取 `plugins` 数组。每项有字符串 `module`，以及可选的布尔值 `enabled` 和对象 `options`。相对路径以配置所在目录为基准；包名使用该目录的 Node ESM 解析规则，支持 `exports.import`。相对目录可提供有名包的 `exports`，或以 `main` 指定入口，缺省为 `index.js`。配置按数组顺序加载，禁用项直接跳过，缺省 options 为空对象。

每个包通过 `package.json` 的 `contributes` 声明四类名称列表。插件在激活中调用 `context.register(类别, 名称, 实例)`。代码和配置装配共同进入 [PluginLoader.activate](../src/host/loader/PluginLoader.ts)，使用同一 [Registration.commit](../src/host/loader/Registration.ts)。例如，要试用测试包，可在仓库根新建临时配置并写入以下内容，然后把配置路径传给 `--config`。执行 `probe-info` 应输出「装配一致」。源码树下的测试清单随构建一起复制到 `dist`。

```json
{
  "plugins": [
    { "module": "./dist/test/fixtures/probe", "options": { "message": "装配一致" } }
  ]
}
```

#### 本阶段决策记录与验证

- **属性修改的事务边界。** 处理器取得公开的目标图形和本次 `executeEdit` 的草稿文档，通过文档方法修改子部件。多个处理器命中时拒绝整次修改，使新增插件不会静默改变已有行为。只有处理器成功返回且能复制完整草稿才写入历史。测试先制造一个可重做的操作，再让处理器修改子元素后抛错，核对文档和原 redo 均保留。
- **清单校验的时机。** 整份配置先校验结构，再依序解析插件。每个插件使用独立的临时注册表。激活成功后比较四类名称集合，全部相符后一次发布。重复注册、清单不符或抛错都会舍弃这一个插件的所有注册。加载结束后保留的注册上下文也不能追加能力。读取配置失败或格式错误时输出 `error: invalid plugin config` 并启动内置能力。
- **包定位与执行分开。** 找不到顶层模块输出 `error: plugin not found: <module>`，缺默认导出输出 `error: plugin has no default export: <module>`；已定位包的求值、依赖导入或激活出错则输出 `error: plugin failed to activate: <name> (<reason>)`。清单不符会列出 declared 与 registered 两组名称。这些诊断写入 stderr，随后继续处理配置中的下一项。[加载器独立测试](../test/PluginLoader.test.ts)
- **读回和树标签的准备。** 复合类型可指定实际的 SVG 标签，按需取得已读回的子元素，并声明是否支持解组。保存点取自成功的初始化、读取或保存；装饰器各自持有计算标签所需的状态。测试包的复合图形成功保存读回，禁用测试插件后，同一文件作为普通分组读入并保留子节点。[四扩展点集成测试](../test/Framework.test.ts)

**兼容性。** `npm run check` 的 142 项测试通过，其中 131 项来自 Phase 1，原断言保留，单元测试按新位置引用命令并显式装入内置图形。额外执行下面的两条命令，会从 Git 的 `final` 版本重新构建 CLI，分别使用三份隔离工作目录回放同一输入。7 份原会话的 stdout、stderr 和 SVG 文件内容均逐字节相同。题目 §6 的输入和两条输出流另存在 [doc/transcript](transcript/)。

```sh
npm run build
node scripts/verify-compat.mjs
```

**协作检查。** 本阶段 AI 辅助重构及编写故障测试。检查加载器时，专门写了一个入口存在、内部依赖缺失的测试包，核实错误归因；另一个测试包在激活时自行捕获重名错误，验证被污染的批次仍无法发布。架构指标从已提交的 Git 源码生成，按内核、装配处、插件分别计算，VS Code 单独列出。[首次指标报告](../docs/metrics/stage-2.md) · [指标复现方法](../docs/metrics/README.md)

### 第三阶段 · 统计与目录命令

两个包各自在清单中声明一条命令。代码入口和仓库的 JSON 配置均按 `stats`、`dir` 的顺序加载相同的实现。要单独关闭其中一个，可以将对应配置项设为 `"enabled": false`，再用 `--config plugins.config.json` 启动。被关闭的命令从帮助中消失，执行时由内核报告未知命令。[代码装配](../src/host/codePlugins.ts) · [配置装配](../plugins.config.json)

**统计语义。** `stats` 无参数，读取当前文档，依照画布子节点顺序做前序遍历。用 `isContainer` 区分容器与叶子，根画布不参与计数。叶子按类型首次出现的顺序输出，因此嵌套组中的文字可以排在顶层矩形之前。新建空画布输出 `(total 0, containers 0)`。独立测试用自定义复合容器验证其子节点参与统计，第四阶段再随实际 `box` 接入复验。[StatsCommand](../plugins/stats/StatsCommand.ts) · [独立测试](../test/StatsCommand.test.ts)

**目录访问适配器。** 客户端 `DirCommand` 依赖目标接口 `DirectoryReader`，调用 `currentPath()` 取得目录，再调用 `list(path)`。具体适配器 `NodeDirectoryReader` 组合 Node 的 `process.cwd()` 和 `fs.readdirSync`，将返回的 Dirent 转成名称及类型。插件激活时注入适配器，命令自行校验参数、稳定排序、格式化和转换错误。查询不需要打开画布，也不调用编辑会话。[目标接口](../plugins/dir/DirectoryReader.ts) · [Node 适配器](../plugins/dir/NodeDirectoryReader.ts) · [目录命令](../plugins/dir/DirCommand.ts)

目录排在前面，其余条目排在后面，每组均按名称的 UTF-16 码元升序排列。以点开头的名字照常显示。`[LINK]` 表示符号链接（含失效链接），`[OTHER]` 表示其他特殊条目。目录和链接均只列出本项。标记与名称之间有两个空格；名称内的反斜杠、回车及换行分别显示为转义文本，确保一个条目只占一行。空目录输出 `(empty directory)`。

**验收记录。** `npm run check` 共 150 项通过。固定临时目录中准备 `docs/source.svg`（复制自 `examples/imported.svg`）和空文件 `.settings`。两次真实 CLI 进程使用相同工作目录、相同输入、相同插件集合，stdout 分别逐字节匹配同一预期文件，stderr 均为空，日志由父进程捕获。另在只可进入、不可列举的临时目录运行 CLI，确认 `dir` 报出目标路径后，仍能成功执行原先待重做的操作。关闭可选插件后，七份 Phase 1 会话的两条输出流及 SVG 字节继续与 `final` 一致。[会话输入](transcript/command-plugins.txt) · [预期输出](transcript/command-plugins.stdout) · [双装配测试](../test/CommandPluginsCli.test.ts)

**协作检查与提交依据。** 本阶段 AI 辅助实现和运行测试，专门用 `read docs/source.svg` 后的 `dir` 检查是否误列了 SVG 所在目录，并用顺序相反的测试替身输入检查排序。提交 `0cf5728` 通过代码装配接入统计插件，`2757756` 通过配置接入目录插件。分别运行 `git show --name-status <提交>` 可检查接入边界；第三个阶段内提交对齐两种装配，补齐共同会话和报告。

复现本阶段的插件测试可在仓库根目录执行以下命令。

```sh
npm run build
node --test dist/test/StatsCommand.test.js dist/test/DirCommand.test.js dist/test/CommandPluginsCli.test.js
node scripts/verify-compat.mjs
```

### 第四阶段 · 复合图形 box

`create box n1 120 100 160 60 "开始"` 创建一个可嵌套的容器，直接子节点为蓝色矩形 `n1-rect` 和文字 `n1-label`。模板采用 `#4a90d9` 填充，标题基线放在 `(x + 20, y + h / 2 + 5)`，与题目示例坐标一致。整体移动、缩放、删除、分组与撤销使用既有文档操作。树行由独立的 `BoxTypeLabel` 装饰为 `g#n1 (box)`。第五阶段将检验它与保存状态星号的组合。[插件清单](../plugins/box/package.json) · [树标签](../plugins/box/BoxTypeLabel.ts)

**ADR · 子部件与读回。** 两个派生 id 与容器 id 一起参与全局唯一性检查，任一冲突都会取消整个创建。必要子部件必须是指定 id 和类型的直接子节点。可以编辑其几何或调整绘制顺序；尝试删除、移到别处、重新分组导致必要子部件脱离时，插件在替换子节点或重建容器时拒绝修改。整个 box 可以移动或删除，`ungroup` 对 box 报错。保存写出标准 SVG 分组及 `data-kind="box"`。安装插件时从实际子树恢复，保留子节点顺序、坐标、样式及附加内容。遇到缺件、类型错或重复 id 时整次读取失败，原文档、保存路径与历史保留。禁用插件后同一文件降级为普通分组，保留标记和子节点，再保存仍可恢复。[复合模型](../plugins/box/Box.ts) · [创建与读回](../plugins/box/BoxProvider.ts)

**属性与撤销。** `set n1 fill red` 在编辑草稿上更新内部矩形的填充色，`set n1 label "处理数据 v2"` 更新内部文字内容。两条命令各为一个 undo 单元，重做分别恢复各自的修改。读入文件时，分组元素原有的 SVG 样式保存在分组上，避免导入阶段把它错误转发到内部矩形。撤销提示沿用 Phase 1 的 `undone: …` 格式。[属性处理器](../plugins/box/BoxAttributes.ts)

**两种装配的 Git 证据。** 两条演示提交有共同父提交 `b132c27`，插件目录内容一致。A 在运行代码中只新增插件并改动顶层代码装配；B 只新增插件并改动配置。二者均附插件测试、版本 B 会话输入及预期输出。旧会话中明确期望“未加载 box”的测试，启动时显式传入 `--no-plugins`，原断言保留。合并提交 `26e1b46` 保留两条接入历史。可在仓库根目录执行：

```sh
git diff --name-status f41daf2^ f41daf2
git diff --name-status 601da5a^ 601da5a
git diff f41daf2 601da5a -- plugins/box
```

**验收与协作记录。** AI 辅助实现后，对照题目中的坐标和绘制顺序核查了 §6.1 版本 B 的树。两种装配的 stdout 逐字节匹配同一预期，stderr 为空，生成的 SVG 逐字节一致，读回后统计为 5 个叶子和 3 个容器。另用含损坏 box 的文件尝试覆盖正在编辑的文档，检查失败后可执行原 redo，随后无参数保存仍写回原路径。CLI 全套 157 项测试通过，禁用可选插件重放 7 份 Phase 1 会话继续与 `final` 一致。[输入](transcript/box-flowchart.txt) · [实际输出基线](transcript/box-flowchart.stdout) · [插件独立测试](../test/BoxPlugin.test.ts) · [CLI 验收](../test/BoxCli.test.ts)

```sh
npm run build
node --test dist/test/BoxPlugin.test.js
node --test dist/test/BoxCli.test.js
```

---

## Phase 1 · SVG CLI 编辑器项目报告

作者：周乐涵。课程：软件设计，PJ1 Phase 1。文档整理日期：2026-10-18。

本项目根据 [`phase_cli_1.md`](../phase_cli_1.md) 实现 TypeScript 命令行 SVG 编辑器，支持六种内置图形、十九条命令、嵌套分组、撤销重做及 SVG 文件读写。[根 README](../README.md) 提供运行方法和命令说明，[验收记录](ACCEPTANCE.md) 保存已执行的检查、学生反馈和复现步骤。

功能检查和文档审阅已完成。2026-10-18，学生批准再次按课程要求核对，无误后提交、推送并创建 `final` 标签。前五阶段保留独立提交，第六阶段包含完整题目会话、验收材料及本报告；最终版本以 [`final` 标签](https://github.com/leoh4mster/svg-editor-cli-pj1/tree/final) 标识。

## 1. 架构方案

### 1.1 模块划分与职责

项目将终端交互、用例组织、图形业务和外部格式分开。领域对象持有约束和行为，命令组织操作，文件系统和 XML 库通过应用端口接入。

| 模块 | 职责与主要类 |
| --- | --- |
| `src/cli/` | `Cli` 处理逐行输入、提示符及统一错误；`CommandLineParser` 处理引号、转义和整行注释；`CommandRegistry` 保存命令目录并分发命令 |
| `src/application/` | `EditorSession` 管理当前文档、保存路径和编辑事务；`CommandArguments` 转换参数；`ShapeFactory` 将 CLI 参数或 SVG 属性转换成图形；`SvgReadResult` 封装导入结果和警告 |
| `src/application/commands/` | 每条命令一个类，提供语法、说明和统一执行入口；可撤销编辑继承 `EditCommand` |
| `src/application/history/` | `HistoryEntry` 私有保存编辑前后快照；`CommandHistory` 管理 undo/redo 两栈及文档命令后的历史禁用状态 |
| `src/application/formatters/` | `TreeFormatter`、`ShowFormatter` 从领域接口生成结构树和属性文本，不执行终端 IO |
| `src/application/ports/` | `CommandCatalog`、`TextFileStore`、`SvgCodec` 定义应用需要的命令目录、文本文件及 SVG 转换能力 |
| `src/domain/` | `SvgDocument` 管理画布、全局 ID、父级索引、有序结构和受控修改；`NumericValue` 统一数值约束；`EditorError` 表达可报告的错误 |
| `src/domain/shapes/` | `Shape` 与 `Rect/Circle/Ellipse/Line/Text/Group` 封装图形状态、几何校验、属性白名单、克隆、变换和容器行为 |
| `src/infrastructure/` | `NodeFileStore` 实现文件读写；`svg/SvgXmlCodec` 实现 XML 解析和序列化；`SvgElement` 封装基础设施内部的 XML 过渡树 |
| `src/main.ts` | 创建会话、命令、工厂与适配器，集中注册命令并注入依赖 |
| `test/`、`examples/` | 保存领域、应用、文件系统与真实 CLI 测试，以及各阶段和完整题目会话脚本 |

以下 PlantUML 包图中的箭头表示允许的依赖方向；具体类和端口的约束见第 1.3 节。

```plantuml
@startuml
skinparam packageStyle rectangle
component "src/main.ts" as Main
package "src/cli" as CLI
package "src/application" as Application {
  package "commands" as Commands
  package "ports" as Ports
  component "EditorSession / history" as Session
  component "ShapeFactory" as Factory
  component "formatters" as Formatters
}
package "src/domain\nSvgDocument / Shape hierarchy" as Domain
package "src/infrastructure\nNodeFileStore / SvgXmlCodec" as Infrastructure

Main --> CLI
Main --> Application
Main --> Infrastructure
CLI --> Commands
CLI --> Session
CLI ..> Ports : CommandCatalog
CLI ..> Domain : EditorError only
Commands --> Session
Commands --> Factory
Commands --> Formatters
Commands ..> Ports
Commands --> Domain
Session --> Domain
Factory --> Domain
Formatters --> Domain
Infrastructure ..> Ports : implements
Infrastructure --> Factory
Infrastructure --> Application : SvgReadResult
Infrastructure --> Domain
@enduml
```

### 1.2 设计模式及实现

#### Command：统一命令入口

[`Command`](../src/application/commands/Command.ts) 定义 `execute(args, session)`、语法和说明。CLI 只负责解析、查找和调用命令对象；十九条命令的业务行为分别封装在命令类中，不写入 REPL 的条件分支。

十条编辑命令，即 `create/delete/move/scale/set/group/ungroup/addto/front/back`，继承 [`EditCommand`](../src/application/commands/EditCommand.ts)。统一入口调用 `EditorSession.executeEdit`，一次成功执行就是一个撤销单元。文档类命令、显示命令及 undo/redo 使用各自会话入口，遵守题目规定的历史规则。`HelpCommand` 依赖 `CommandCatalog`，无须反向依赖 CLI 的具体注册表。

#### Composite：统一叶子与容器

[`Shape`](../src/domain/shapes/Shape.ts) 提供统一的 `children/walk/summary/details`、`clone/moved/scaled/withAttribute/withChildren` 及 SVG 属性接口。五种叶子和 [`Group`](../src/domain/shapes/Group.ts) 通过多态实现这些行为：容器递归移动、缩放子孙，删除容器删除整棵子树；格式化器和 SVG 编码器递归消费统一接口，不逐个判断类型。

图形几何和显式属性由对象封装，编辑返回独立副本。`SvgDocument` 统一管理挂接、替换、删除及索引，已归属图形的结构修改必须持有文档私有令牌，防止绕过文档直接改子节点。数组和属性映射对外提供防御性副本，避免外部引用改坏内部结构。

#### 快照历史：先验证，再提交

[`EditorSession`](../src/application/EditorSession.ts) 先克隆当前文档，在草稿上执行编辑；成功后复制提交结果并准备历史快照，最后切换当前文档和更新历史。递归编辑即使在后续子孙处溢出，也不会只移动前几个节点。历史恢复使用独立副本，保留的旧文档或草稿引用不能污染当前状态及快照。

结构调整还在领域层构造完整的局部文档，验证层级、唯一 ID、父级索引和归属后才接管，因此直接调用领域结构 API 失败也保持原状态。快照优先保证层级、顺序和删除内容准确恢复；每个历史项保存编辑前后两份完整文档，空间随文档大小增长。本次未实现差量历史或大文档性能优化。

#### 工厂与适配器：集中构造，隔离 IO

[`ShapeFactory`](../src/application/ShapeFactory.ts) 的同一注册表保存六类型的构造配方、参数语法和 SVG 几何字段。`create` 与 `fromSvg` 共用类型查找；具体图形负责最终几何约束。SVG 适配器不增加第二套标签到图形类的分支。

`ReadCommand`、`SaveCommand` 依赖 `TextFileStore` 和 `SvgCodec`，由 `main.ts` 注入实现。读取完成 UTF-8 解码、XML 解析、ID 检查及领域构造后才替换当前文档，补 ID 警告也在成功后输出；保存先生成和验证完整 XML，文件写入成功后才更新路径及历史。`NodeFileStore` 在目标同目录完整写入临时文件后重命名替换，保留已有普通文件权限和符号链接引用，失败时清理临时文件，避免半份输出覆盖原文件。

按题目要求，允许的两处名字分派均标为后续重构点：

| 分派位置 | 当前实现 | 待重构方向 |
| --- | --- | --- |
| [`CommandRegistry.execute`](../src/cli/CommandRegistry.ts)：命令名 → 命令对象 | 唯一命令名分派，**待重构** | 将来可由命令提供者注册，复用现有 `Command` 接口 |
| `ShapeFactory.requireRecipe`：类型名 → 构造配方 | CLI/SVG 共用的唯一类型名分派，**待重构** | 将来引入 `ShapeProvider`，扩展复合图形及插件 |

本次集中注册即可满足范围，不预先实现插件发现、动态加载或服务定位器。

### 1.3 依赖方向规则

| 模块 | 允许依赖 | 约束和理由 |
| --- | --- | --- |
| `domain` | 领域内部类型及语言标准能力 | 不导入应用层、CLI、文件系统和 XML 库，使业务规则可独立验证 |
| `application` | 自身模块、`domain` 和应用端口 | 不导入 `cli/infrastructure` 的具体实现；命令组织用例，领域维护约束 |
| `cli` | 应用会话、命令接口及 `CommandCatalog`；共享 `domain/EditorError`；Node.js 终端和流接口 | 不依赖具体图形或直接修改文档，终端交互留在外层 |
| `infrastructure` | 应用端口、`ShapeFactory`、`SvgReadResult` 和领域模型；Node.js 文件/路径/加密库、`saxes/xmlchars` | 负责格式与 IO 适配，应用和领域不得反向导入它 |
| `main.ts` | 上述全部模块 | 仅承担对象装配和注册，不放图形业务规则 |
| `test` | 被测模块及测试所需标准库 | 通过测试替身验证文件错误，并以真实 CLI 子进程验证整体行为 |

这些规则使更换终端入口、文件后端或 XML 解析库时，图形行为和历史规则仍可复用。实际 import 的核对结果见第 3 节。

### 1.4 变化点假设与取舍

| 可能变化的地方 | 预留方式或暂不实现的原因 |
| --- | --- |
| 新增命令或 GUI/agent 入口 | 命令与 CLI 分离，语法和说明由目录统一提供；未来入口可复用应用用例 |
| 新增图形、复合图形或插件 | `Shape` 多态、Composite 和集中工厂提供扩展边界；题目的 `box` 属后续阶段，本次不实现 |
| 扩大 SVG 支持范围 | `SvgCodec` 隔离 XML，额外属性随图形保留；当前不能解释的语义明确拒绝，避免静默丢失 |
| 更换文件存储 | `TextFileStore` 隔离本地文件系统，不让命令依赖 `node:fs` |
| 改变撤销存储策略 | 历史集中在 `application/history`；有性能需求时可替换为差量，当前先保证恢复正确性 |
| 扩展属性与数值规则 | 几何和白名单由图形类负责，数值解析统一委托 `NumericValue`；避免将规则复制到各条命令 |

## 2. 过程记录与 AI 协作

### 2.1 分工与分阶段推进

学生负责提供和确认课程要求、控制六阶段推进、决定仓库及交付方式，并查看运行结果、反馈问题和审阅最终文档。AI 按阶段辅助提出设计方案、实现代码、补充测试、调试、检查依赖和整理文档。以下记录对应实际发生的协作，不将 AI 执行的测试记为学生逐条手工操作。

| 阶段 | 实现增量 | 检查结果与提交 |
| --- | --- | --- |
| 1 | TypeScript 工程、OOP CLI、`help/init/canvas` 和基础架构 | 23 项测试；`a005124` 已推送 |
| 2 | 六种图形、`create ... in`、全局 ID、`tree/show` | 49 项测试；`6a007af` 已推送 |
| 3 | 几何与属性编辑、删除、草稿事务、撤销重做 | 73 项测试；`1ba0382` 已推送 |
| 4 | 分组、解组、归属和绘制顺序 | 97 项测试；`8f0439a` 已推送 |
| 5 | SVG 读写、ID 补全、XML 转义和文件失败处理 | 128 项测试；`1feb871` 已推送 |
| 6 | 完整题目会话、流程图、端到端验收和最终报告 | 最终复核 131 项测试通过；学生已批准最终提交、推送及 `final` 标签 |

每阶段完成后回归此前行为，形成可运行的独立增量；详细接续记录见 [开发计划](DEVELOPMENT_PLAN.md)。

### 2.2 代表性讨论、问题与修订

| 问题或反馈 | 确认方式 | 处理及结果 |
| --- | --- | --- |
| 帮助功能若直接读取 CLI 注册表，会造成应用层反向依赖 | 检查 `HelpCommand` 与注册表的 import | 引入 `CommandCatalog`，由注册表实现、帮助命令依赖接口 |
| 外部直接挂接已归属容器会绕过 ID 和父级索引 | 第二阶段代码自查复现，并检查原树及索引 | 增加文档归属令牌，拒绝直接修改和跨文档共享；补充回归测试 |
| 递归移动或缩放在后续节点处数值溢出，可能留下半次编辑 | 构造前面子节点合法、后面子节点溢出的测试 | 采用草稿执行、完整复制及历史准备后提交，失败保留当前文档和 redo |
| 跨父级分组的放置位置在需求中未完全规定 | 对照“保持相对顺序”及现有树结构讨论 | 明确原文档前序顺序、原父级最近公共祖先和最早受影响位置，写入接口约定与测试 |
| 外部 SVG 即时补 ID 可能撞上后文的显式 ID | 构造前面缺 ID、后面已有 `rect1` 的输入 | 先预扫描全文件的显式 ID，再按类型和序号避碰；根 ID 也预留 |
| 图形移出原容器或解组后，前缀属性可能失去祖先上的命名空间绑定 | SVG 编解码复查及跨父级回归用例 | 在使用前缀属性的节点保存所需绑定，保证保存和读回保持原 URI |
| `saxes` 的第三方类型声明与当前严格配置不兼容 | 第五阶段 `tsc` 报错定位到第三方 `.d.ts` | 开启 `skipLibCheck` 跳过声明内部检查；项目源码、测试仍严格检查，并用实际编解码测试验证行为 |
| 学生指出 imported 截图与验收描述不一致 | 比较原 SVG 与副本，并核对截图及图形坐标 | 确认副本只增加背景 ID；小圆在同色矩形内、椭圆越界且同色重叠。修正文档的可见性描述和 `tree/show` 核对步骤，保留题目原始示例 |

2026-10-18，学生接受既有测试结论，要求填写验收记录和整理最终文档；完成文档审阅后，进一步明确批准核对无误即提交、推送并标记 `final`。学生在验收记录中补充了代码审阅情况，本版保留其自述；开发侧执行的自动测试和终端操作仍按实际执行者记录。

## 3. 实现后的一致性自查

### 3.1 模块划分是否与方案一致

实际目录与第 1.1 节一致。终端只在 `cli`，命令和历史在 `application`，图形行为和索引在 `domain`，文件与 XML 在 `infrastructure`。`SvgElement` 仅为 XML 适配器的封装过渡对象，没有替代具有行为的领域图形。

实施中有以下架构细化，已纳入当前方案与过程记录：

| 细化 | 原因与落实 |
| --- | --- |
| 应用层增加 `ports/CommandCatalog` | 隔离帮助目录与 CLI 注册表，避免反向依赖 |
| `ShapeFactory` 放在应用层 | CLI 参数及 SVG 属性转换属于输入组织；几何校验仍在领域类 |
| 增加 `EditCommand` 和 `history` 子模块 | 将编辑事务及快照规则集中，所有编辑命令复用同一路径 |
| 结构重写在局部文档完成后接管 | 保证直接领域 API 和应用命令两层的失败原子性 |
| 增加 `TextFileStore/SvgCodec/SvgReadResult` | 落实文件和 XML 的隔离，明确导入警告与路径的提交时点 |

### 3.2 依赖方向是否被违反

已检查全部 49 个源码文件的 import，并复核关键调用关系，未发现违反第 1.3 节的依赖。

| 抽样位置 | 实际依赖与结论 |
| --- | --- |
| `domain/SvgDocument.ts`、`domain/shapes/*` | 仅依赖领域内部类型，无终端、XML、文件系统及应用层依赖 |
| `application/commands/ReadCommand.ts`、`SaveCommand.ts` | 通过 `TextFileStore/SvgCodec` 使用 IO，无 `node:fs` 或具体 XML 适配器导入 |
| `application/commands/HelpCommand.ts` | 使用 `CommandCatalog`，不依赖 `cli/CommandRegistry` |
| `cli/Cli.ts`、`CommandRegistry.ts` | 使用应用会话、命令及目录；共享错误类型的依赖已在规则中明确 |
| `infrastructure/svg/SvgXmlCodec.ts` | 依赖端口、工厂、结果对象、领域及 XML 库，符合外层适配规则 |
| `main.ts` | 负责注入文件存储和编解码器，不让应用层查找具体基础设施 |

源码共 45 个类，均满足一类一文件及类名与文件名一致；业务状态由类封装，无顶层过程式业务函数。图形的递归编辑、显示、克隆和序列化依赖多态，按命令名和图形类型名分派仅保留第 1.2 节列出的两处。

## 4. 功能完整性与质量保证

### 4.1 需求覆盖

| 需求组 | 实现及检查依据 |
| --- | --- |
| 文档管理：`init/read/save/canvas` | 默认及自定义画布、文件导入导出、保存路径、修改 `viewBox` 与文档命令历史规则均有测试 |
| 创建与定位：`rect/circle/ellipse/line/text/g`、`in`、唯一 ID | 六类型工厂、参数数量、大小写与中文 ID、全局冲突及无效父容器测试 |
| 统一编辑：`move/scale/set/delete` | 叶子和嵌套容器编辑、白名单、数值约束、子树删除及递归失败原子性测试 |
| 结构编辑：`group/ungroup/addto/front/back` | 原顺序、跨父级、循环拒绝、同级绘制顺序、子孙索引和撤销恢复测试 |
| 显示：`help/tree/show` | 十九条命令目录、属性及父级、树形缩进和顺序检查 |
| 历史：`undo/redo` | 一条成功编辑一个单元；新编辑清空 redo；失败和显示命令保留历史；成功文档命令后禁用 |
| CLI 约定 | `svg>`、整行注释、双引号、中文及转义、统一 `error:`、失败后继续及 EOF 均经测试或真实终端检查 |
| SVG 往返 | 六类型、嵌套结构、文本子内容、XML 转义、附加属性、前缀绑定、缺 ID 警告及错误输入测试 |
| 提交与文档 | 前五阶段独立提交并推送；本报告包含架构、过程、自查和质量依据；学生已授权第六阶段最终提交及 `final` 标签，交付按同一提交定位 |

### 4.2 检查方法和实测结果

运行环境要求 Node.js 22 或更新版本。实测开发环境为 macOS 26.5（arm64）、Node.js 24.18.0、npm 11.16.0，TypeScript 5.9.3。依赖版本及完整解析结果由 `package.json` 和 lockfile 固定。

```sh
npm ci
npm run check
npm run cli --silent < examples/acceptance-session.cli
npm run cli --silent < examples/flowchart.cli
```

`npm run check` 执行严格类型检查、构建和 Node.js 测试。配置保留 `strict/exactOptionalPropertyTypes/noUncheckedIndexedAccess` 等检查；`skipLibCheck` 只跳过 `.d.ts` 内部检查，没有关闭源码和测试的严格检查。运行时 XML 依赖为 `saxes 6.0.0`、`xmlchars 2.2.0`。

| 检查 | 已执行的结果 |
| --- | --- |
| 类型、构建及测试 | 2026-10-17 检查及 2026-10-18 最终复核均为全套 131 项通过，0 失败、0 跳过；包含领域、会话、参数、命令、文件系统、SVG 编解码及真实 CLI 子进程 |
| 七份示例脚本 | `phase1` 恰有 1 条预期尺寸错误；完整会话恰有 2 条预期错误；`phase2–5` 与流程图脚本无错误输出 |
| 题目完整会话 | `demo.svg` 为 5 元素，导入补 ID 后副本为 7 元素；完整层级、坐标、标题撤销和删除恢复由端到端测试核对 |
| 两节点流程图 | 保存 8 元素；容器移动及 undo 恢复矩形和文字位置；中文标签为“开始”和“处理数据 v2” |
| 浏览器显示 | AI 操作 Chrome 检查三份 SVG 的界面和截图；标题、颜色、连线、中文和位置符合输出；imported 的同色重叠及裁剪已依据学生反馈修正文档 |
| 真实终端 | 已执行验收记录中的结构、历史、失败处理、带空格路径、中文转义及画布命令，`Ctrl+D` 正常退出 |
| 架构检查 | 49 个源码文件、45 个类的依赖、类文件命名、字段封装及两处名字分派符合方案 |
| 学生反馈复核 | 学生发来 imported 截图并指出说明不符；逐字比较确认保存副本只补背景 ID，无几何、样式或顺序丢失；已修正说明 |

质量保证既比较反馈文本，也检查领域状态、父级索引、节点顺序、输出文件和重新读取后的语义。文件系统测试覆盖不可写目标、无效 UTF-8、目录、符号链接及失败清理；历史测试覆盖被删除子树、外部旧引用、后续节点溢出和失败后 redo 保留。测试位置及详细操作见 [验收记录](ACCEPTANCE.md) 和 `test/`。

### 4.3 关键行为与支持边界

- `init` 默认 800×600，只给宽度时高度仍为 600；`canvas` 查询不影响历史，修改要求同时提供两个有限正尺寸。
- `move` 使用增量；`scale` 以原点为中心缩放内置几何字段，倍数必须为有限正数。描边宽度、额外 `font-size` 和文本内容不随缩放改变。
- `set` 仅支持通用样式及对应类型的几何属性，文本另支持 `text`。附加属性可在 SVG 往返中保留，不扩大编辑白名单。
- 分组使用原文档前序顺序；新组放在原父级最近公共祖先下的最早受影响位置。根级容器禁止解组；`front` 对应同级末尾、`back` 对应同级开头。
- 结构操作保留节点自身属性，继承外观随新父级改变；解组不把原容器的样式固化到子节点。
- 一条成功编辑对应一个历史单元，合法无变化编辑也记录。成功 `init/read/save` 或画布修改清空并禁用两栈，直到下一次成功编辑；失败命令不改变文档、保存路径或历史。
- 无参数 `save` 使用最近成功 `read/save` 的路径，首次保存可显式指定路径；成功 `init` 清空路径，编辑、画布调整和 undo/redo 保留路径。撤销反馈为 `undone: <原编辑摘要>`，重做为 `redone: <原编辑摘要>`，状态由快照恢复。

SVG 读写范围如下；本次实现课程六种内置类型的可编辑子集，不宣称支持完整 SVG 标准。

| 内容 | 支持范围与处理 |
| --- | --- |
| XML 与结构 | XML 1.0，根 `svg`，六种内置类型及嵌套 `g`；支持未声明命名空间的输入或正确 SVG 命名空间及前缀 |
| 尺寸与坐标 | 几何字段接受数字或可选 `px`，图形缺省为零；根尺寸缺省时取 `viewBox` 对应尺寸，否则取 800×600 |
| ID | 先预留全部显式 ID，再按类型和序号补缺失或空图形 ID 并警告；包括根 ID 在内全局唯一、大小写敏感，根不接受图形编辑命令 |
| 属性与文本 | 保留显式样式、根元数据和字体、对齐、`data-*`、合法前缀属性；支持纯文本、实体及 CDATA，保存文本为子内容并转义 XML 字符 |
| 坐标系 | 导入 `viewBox` 经验证后保留；画布尺寸修改将其重置为 `0 0 宽 高` |
| 明确拒绝 | 未知标签、外来元素命名空间、`transform/style/href/on*`、复杂文本子元素、坐标列表、百分比及其他几何单位、DOCTYPE 和处理指令 |
| 非逐字保留 | 注释、缩进、属性顺序、前缀化元素写法及实体/CDATA 原写法不按字节保留，保证所支持模型、顺序和显式属性往返 |

另外，`box` 及动态插件属于后续课程阶段；快照和递归处理未针对超大文档优化。文件临时写入与重命名用于避免写入失败留下半份文件，本次未实现并发编辑冲突检测，也不作掉电持久性保证。

### 4.4 验收结论与交付状态

现有功能检查、示例回放和浏览器预览支持本次实现满足上述课程范围。学生反馈的导入图说明问题已修正，验收记录已填写；2026-10-18，学生批准按题目要求完成最终交付。

提交前再次核对了文档四部分、分层与 OOP 约束、两处分派标记、完整会话及 131 项测试。最终交付使用第六阶段提交，`main` 与 `final` 应指向同一版本。仓库为 [leoh4mster/svg-editor-cli-pj1](https://github.com/leoh4mster/svg-editor-cli-pj1)，最终版本通过 [`final`](https://github.com/leoh4mster/svg-editor-cli-pj1/tree/final) 定位，验收细节见 [验收记录](ACCEPTANCE.md)。
