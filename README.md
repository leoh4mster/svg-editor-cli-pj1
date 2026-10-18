# SVG CLI Editor

软件设计课程 PJ1 Phase 1：使用 TypeScript 和面向对象设计实现命令行 SVG 编辑器。

程序支持六种内置图形、十九条命令，完成文档管理、嵌套图形编辑、分组与绘制顺序、撤销重做及 SVG 读写。架构方案、AI 协作过程、一致性自查和质量保证见 [项目报告](doc/README.md)，实际检查结果与复现方法见 [验收记录](doc/ACCEPTANCE.md)。开发增量保存在 [六阶段计划](doc/DEVELOPMENT_PLAN.md) 和 Git 历史中。

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
read <file.svg>
save [file.svg]
canvas [w h]
create <type> <id> [params…] [in <containerId>]
tree [id]
show <id>
move <id> <dx> <dy>
scale <id> <factor>
set <id> <attr> <value>
delete <id>
group <newGid> <id1> <id2>…
ungroup <gid>
addto <gid> <id>
front <id>
back <id>
undo
redo
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

`move` 使用增量，`scale` 的倍数必须为有限正数，同时缩放位置和尺寸；容器将变换递归应用到所有子孙。缩放不修改 `stroke-width` 或文本内容。`delete` 删除整个子树。

`set` 支持所有类型的 `fill`、`stroke`、`stroke-width`，以及该类型自身的几何属性；`text` 另支持 `text` 内容。`stroke-width`、尺寸与半径必须非负。`set g fill ...` 修改容器自身的样式，遵循 SVG 样式继承语义，保留子节点显式设置的样式。未知属性报错。

`group` 至少接收两个不同的已有 ID，拒绝同时选择容器和它的子孙。组内顺序采用操作前文档的前序遍历顺序，不采用参数顺序。新组放在所选节点原父级的最近公共祖先下；跨根节点时放在画布下，占据最早受影响的直属子节点位置。未选择节点的相对顺序保留，原父容器即使变空也保留。

`ungroup` 仅解散嵌套容器，子节点按原顺序占据原容器位置；根级容器按题目要求禁止解组。`addto` 将已有图形移到目标容器末尾，同父级时也会重新排到末尾；不允许自身归属或祖先移入后代。`front` 移到同级数组末尾，对应 SVG 中后绘制、显示在上层；`back` 移到同级开头。它们不改变父级。

结构调整保留节点自身的几何属性和显式样式；继承样式随新父级变化。解组移除容器自身的样式，不将继承结果写入子图形属性。已经位于目标顺序的合法命令仍算一次成功编辑。

每条成功编辑（包括 `create`）为一个撤销单元。`undo` 后成功执行新编辑会清空 redo；显示命令和失败命令不改变历史。成功执行 `init/read/save` 或修改画布尺寸后，`undo` / `redo` 均报 `undo not allowed after io command`，直到下一次成功编辑。画布查询不禁用历史。

`read` 无须先 `init`，读取成功后替换当前文档；`save` 需要当前文档。`save 文件.svg` 保存并记住路径，无参数 `save` 使用最近一次成功 `read/save` 的路径；新建文档后需要先显式指定保存路径。相对路径相对于启动程序时的工作目录，带空格的路径用双引号包裹。成功 `init` 清空路径；画布修改、编辑和撤销重做保留路径。读写失败保留当前文档、路径及 undo/redo 状态。

例如，在前面的交互中继续输入：

```text
save "diagram draft.svg"
read "diagram draft.svg"
move node 10 0
save
```

读取范围是 XML 1.0 的六种内置类型及嵌套 `g`，不是完整 SVG 标准。缺失或空 ID 的图形按类型和序号补全并输出警告；事先保留文件中的全部显式 ID，避免生成 ID 与后文节点冲突。根 `svg` 的非空 ID 也参与唯一性约束，但不作为图形接受编辑命令。

保存输出 UTF-8 SVG，按节点原顺序写出，转义属性和文本中的 XML 特殊字符。保留导入的根 `viewBox`、显式样式，以及 `font-size`、`text-anchor`、`data-*`、命名空间声明等额外属性；这些额外属性可随图形编辑和撤销重做保留，但不扩展 `set` 白名单。画布尺寸修改会把 `viewBox` 重设为 `0 0 宽 高`。

导入的长度接受纯数字或 `px`，缺省几何值为零；根尺寸缺省时取 `viewBox` 尺寸，仍缺省时取 800×600。百分比和其他长度单位、坐标列表、`transform`、`style`、`href`、事件属性、DOCTYPE、处理指令、外部实体、未知标签和含子元素的复杂文本不在支持范围，报错后保留当前状态。标准 XML 声明、注释和纯文本 CDATA 可读取；注释及原始缩进、属性顺序、实体写法不会按原文件逐字保留。

文件写入使用目标同目录的临时文件和原子重命名；覆盖普通文件时保留其权限，符号链接仍指向原目标。文件读取严格校验 UTF-8，编码或 XML 内容错误不会替换当前文档。

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

`examples/phase3.cli` 在嵌套结构上演示移动、缩放、修改文本、删除、撤销重做及历史分支切换：

```sh
npm run cli --silent < examples/phase3.cli
```

`examples/phase4.cli` 演示分组、解组、移动归属和同级顺序调整，并通过撤销重做观察完整结构恢复：

```sh
npm run cli --silent < examples/phase4.cli
```

`examples/phase5.cli` 从 `examples/imported.svg` 读入外部 SVG，演示补 ID、编辑、保存、读回及默认路径保存；在工作目录生成 `phase5-output.svg`：

```sh
npm run cli --silent < examples/phase5.cli
```

最终验收脚本回放题目完整会话和两节点流程图，在 `examples/output/` 生成 SVG：

```sh
npm run cli --silent < examples/acceptance-session.cli
npm run cli --silent < examples/flowchart.cli
```

完整会话有两条有意触发的预期错误；流程图脚本无错误。输出文件、浏览器检查要点和终端操作步骤见 [验收记录](doc/ACCEPTANCE.md)。

## 检查

```sh
npm run check
```

该命令运行类型检查、构建与测试。已执行的全套 131 项测试通过，0 失败、0 跳过，覆盖领域约束、命令解析、历史与文件错误、SVG 往返和真实 CLI 子进程。七份示例脚本、真实终端操作及三份 SVG 的 Chrome 预览均已检查；学生已概览结果、反馈导入图说明问题并接受既有测试结论。具体依据见 [项目报告](doc/README.md) 与 [验收记录](doc/ACCEPTANCE.md)。

## 当前范围

当前范围为画布管理、六种图形创建、结构查看、基础编辑、分组与层级调整、撤销重做，以及上述 SVG 子集的读取与保存。`help` 列出十九条可执行命令。题目中的插件类型 `box` 不属于本次 PJ1 Phase 1 的实现范围。

`imported-copy.svg` 中的小圆位于同色矩形内，椭圆部分越界、其余同色重叠，截图中无法分别辨认。验收记录说明了坐标和 `tree/show` 核对方法；这份副本与题目源文件的差异仅为背景矩形补上 ID。

## 交付状态

项目按六阶段推进，前五阶段分别保留独立提交，第六阶段完成最终验收和项目报告。2026-10-18，学生批准核对无误后提交、推送并标记 `final`；本轮最终检查的 131 项测试全部通过。

最终版本使用 [`final` 标签](https://github.com/leoh4mster/svg-editor-cli-pj1/tree/final) 定位，主分支为 `main`；分支与标签应指向同一个最终提交。

- [GitHub 私有仓库](https://github.com/leoh4mster/svg-editor-cli-pj1)
- [课程要求](phase_cli_1.md)
- [架构、协作记录、一致性自查与质量保证](doc/README.md)
- [已填写的验收记录与复现步骤](doc/ACCEPTANCE.md)
- [开发阶段和后续接续说明](doc/DEVELOPMENT_PLAN.md)
