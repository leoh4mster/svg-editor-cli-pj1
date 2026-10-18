# 验收记录与复现步骤

本文记录 PJ1 Phase 1 最终版本的检查结果，并保留复现步骤。AI 辅助完成自动检查、脚本回放、真实终端操作和 Chrome 显示核对；学生查看结果、反馈导入示例说明问题并审阅文档及代码，于 2026-10-18 批准再次核对无误后完成最终 Git 交付。贡献与协作过程见 [项目文档](README.md)。

**最终功能检查通过，学生已批准交付。** 前五阶段保留独立提交，第六阶段包含最终验收和文档；最终版本以 [`final` 标签](https://github.com/leoh4mster/svg-editor-cli-pj1/tree/final) 定位，并与 `main` 指向同一最终提交。

## 1. 环境与自动检查

开发与验收实测环境为 macOS 26.5（arm64）、Node.js v24.18.0、npm 11.16.0。2026-10-17 执行 `npm run check`，并于 2026-10-18 最终交付前再次执行：类型检查、编译成功，**131 项测试通过，0 失败、0 跳过**。

在项目根目录打开终端，使用 Node.js 22 或更新版本：

```sh
node --version
npm ci
npm run check
```

类型检查、编译和测试应全部成功，进程正常退出。`npm ci` 按 lockfile 安装固定依赖，不需要全局安装 TypeScript。自动测试覆盖约束、失败原子性、历史隔离、SVG 往返、文件错误及真实 CLI 子进程。

本轮另回放了 `phase1.cli` 至 `phase5.cli`、`acceptance-session.cli`、`flowchart.cli` 共 7 个脚本。`phase1.cli` 有意触发 1 条错误，`acceptance-session.cli` 有意触发 2 条错误，其余脚本无错误输出，均符合预期。以下各节保留完整会话、流程图和真实终端检查方法。

## 2. 回放题目完整会话

检查结果：已通过。元素数量、层级、历史恢复、读写边界和缺失 ID 警告均符合下述预期。

```sh
npm run cli --silent < examples/acceptance-session.cli
```

脚本复现题目第 6 节，使用仓库已有的 `examples/imported.svg`，生成：

- `examples/output/demo.svg`：800×600，5 个图形元素，包括 `markers` 容器。
- `examples/output/imported-copy.svg`：400×300，7 个图形元素，缺失 ID 的矩形补为 `rect1`。

以下两条错误是脚本有意触发的，不能据此判为回放失败：

```text
error: cannot group a container into its own descendant: markers
error: undo not allowed after io command
```

预期缺 ID 警告仅出现一次：

```text
warning: assigned id rect1 to unnamed <rect>
```

核对 `tree` 中的层级和几何值、删除后 undo 恢复原位置，以及保存后 undo 被禁止。撤销反馈采用 `undone: <原编辑摘要>`，重做采用 `redone: <原编辑摘要>`；它们概括所恢复的操作，恢复后的状态由后续 `tree/show` 和测试核对。

## 3. 回放两节点流程图并查看 SVG

检查结果：脚本回放通过；三个输出文件均已在 Chrome 中打开并核对显示。学生随后提供了导入副本截图，促成对重叠图形说明的修订。浏览器核对范围为 Chrome，未进行 Edge 或 Firefox 的独立验收。

```sh
npm run cli --silent < examples/flowchart.cli
```

预期无错误输出，保存 `examples/output/flowchart.svg (8 elements)`。结构应为 `flowchart` 下两个节点容器和一条连接线，每个节点含矩形与文字。节点 2 下移 100 后执行 undo，最终矩形和文字回到原来的位置；最后文字为“处理数据 v2”。

将上述三个 SVG 文件拖入 Chrome、Edge 或 Firefox。macOS 也可以执行：

```sh
open examples/output/demo.svg
open examples/output/imported-copy.svg
open examples/output/flowchart.svg
```

逐项核对：

- `demo.svg`：白底、标题、红色圆和蓝色方块；圆心经过 move/undo/redo 后应为 `(130,100)`，标题撤销后为 `My Diagram`。
- `imported-copy.svg`：白底 400×300，底部是 `imported` 文字；独立黑圆的圆心为 `(50,50)`、半径为 `10`，左上角有一个 `10×10` 黑矩形。题目中的小圆 `c2` 完全落在该同色矩形中；椭圆 `e1` 的范围为 `x=-2…4、y=-2…6`，越界部分被裁剪，画布内部分又与黑矩形同色重叠。因此不能分别辨认小圆和椭圆，这符合原始示例的几何位置和默认填充。
- `flowchart.svg`：蓝色“开始”节点、橙色“处理数据 v2”节点和两者间的黑色线段；标签在各自矩形内，移动撤销后第二节点与第一节点处于同一高度。题目中的 `arrow1` 是 `line`，本阶段不添加箭头标记。

查看文件源码，确认文本写在 `<text>...</text>` 子内容中，根带 SVG 命名空间与画布尺寸，节点顺序与 `tree` 一致。生成文件位于 `examples/output/`，被 Git 忽略；重新回放会覆盖同名输出，不属于需提交的源文件。

导入副本的 7 个元素包括背景和容器，并不表示能在截图中辨认出 7 个独立图形。重叠的小图形应在 CLI 中核对结构与属性：

```text
read examples/output/imported-copy.svg
tree g1
show r2
show c2
show e1
```

预期 `r2` 为 `x=0 y=0 width=10 height=10`，`c2` 为 `cx=5 cy=5 r=2`，`e1` 为 `cx=1 cy=2 rx=3 ry=4`。导入副本与题目原文件的差异仅为背景矩形自动补上 `id="rect1"`。

## 4. 手动检查结构、历史与失败处理

检查结果：AI 已在真实交互终端执行本节命令，核对 `svg>` 提示符、各项结果和 `Ctrl+D` 退出，均符合预期。学生本轮概览结果；未记录学生逐条独立执行本节全部命令，开发侧检查按实际执行者记录。

运行 `npm run cli`，确认提示符为 `svg>`。下列内容可按块粘贴；`#` 开头为整行注释。

```text
init 400 300
create g scene
create g bucket in scene
create rect r 10 20 50 30 blue in scene
create circle c 100 80 10 red in scene
create ellipse e 160 80 20 10 green in scene
create line l 20 150 200 150 black in scene
create text t 20 200 "中文 text & <SVG>" in scene
group pair r c
show r
ungroup pair
addto bucket r
front e
tree scene
back e
tree scene
```

预期 `group` 后 `r` 的父级为 `g#pair`；解组后 `r/c` 回到 `scene`，移入后 `r` 的父级变为 `g#bucket`。`front e` 把它放到同级末尾，`back e` 放到开头，其余节点相对顺序不变。

继续执行：

```text
scale bucket 2
move bucket 10 5
show r
set r fill purple
delete bucket
tree
undo
show r
redo
undo
set t text "新分支"
redo
```

预期 `r` 的几何值变为 `x=30 y=45 width=100 height=60`。删除 `bucket` 时其子图形同时消失，undo 恢复容器、子图形及父级；redo 再次删除。最后一次 undo 后执行新的成功编辑，redo 报 `error: nothing to redo`。

再执行失败和文件路径检查：

```text
move r 5 0
undo
scale r 0
redo
read examples/this-file-does-not-exist.svg
show r
save "examples/output/manual check.svg"
undo
set t text "中文 & <tag>"
save
read "examples/output/manual check.svg"
show t
```

预期非法 scale 报 `error: scale factor must be positive`，但随后 redo 仍成功；不存在文件报 `error: cannot read file: examples/this-file-does-not-exist.svg`，原文档不变。显式保存后 undo 被禁止；下一次编辑重新允许历史，默认 `save` 使用刚才的路径。最后读回文字保留 `中文 & <tag>`，文件中相应字符正确转义。另可执行 `canvas` 查询，确认不改变历史；成功 `canvas 500 400` 后历史禁用。按 `Ctrl+D` 正常退出。

## 5. 审阅设计与支持边界

检查结果：AI 已完成依赖方向、按名分派位置、图形多态接口及一类一文件约定的代码复核，未发现与下述架构约定冲突；学生已在本记录中补充深入代码审阅结果。

按 [项目文档](README.md) 的架构图检查：`domain` 不依赖应用、CLI 或文件/XML 库；命令依赖应用端口，`main.ts` 注入具体实现。可抽样阅读 `EditCommand`、`EditorSession`、`Shape/Group`、`SvgDocument` 和 `SvgXmlCodec`，核对 Command、Composite、草稿事务及快照恢复。按名字分派只在 `CommandRegistry` 和 `ShapeFactory`，文档已标注未来重构方向。

本次支持六种内置图形和嵌套 `g`，可读写纯文本、显式样式、额外属性及根 `viewBox`。几何长度接受数字或 `px`；`set` 按题目白名单修改属性。根 ID 参与唯一性约束但不接受图形编辑命令。画布尺寸修改重置 `viewBox`。

这不是完整 SVG 解释器。`box` 插件、未知标签、`transform`、内联 `style`、`href`、事件属性、复杂文本子元素、百分比或其他几何单位、DOCTYPE 和处理指令会报错。注释、缩进、属性顺序及实体/CDATA 的原写法不按字节保留；所支持的图形语义、顺序和显式属性能够往返。结构调整只保留节点自身属性，继承样式随新父级改变；解组不把容器样式固化到子图形。快照历史随文档大小增长，没有大文档性能保证。

## 6. 评估结论与 Git 交付状态

以下根据开发侧检查、学生补充的审阅记录及最终交付授权填写：

| 项目 | 实际记录 |
| --- | --- |
| 评估日期与运行环境 | 开发侧验收：2026-10-17；学生接受现有测试结论并要求文档定稿：2026-10-18，此前已概览结果并反馈导入图说明问题。实测为 macOS 26.5 arm64、Node.js v24.18.0、npm 11.16.0。 |
| 自动检查 | `npm run check` 通过，131 项测试通过，0 失败、0 跳过；类型检查与构建成功。 |
| 命令与历史行为 | 7 个示例脚本回放符合预期；真实终端执行本记录第 4 节，结构、撤销重做、失败后状态保持、读写路径及 EOF 退出检查通过。上述检查由 AI 辅助执行，学生接受其结果。 |
| 浏览器及三个 SVG 的显示 | 开发侧使用 Chrome 核对 `demo.svg`、`imported-copy.svg`、`flowchart.svg`，显示符合实际 SVG 内容。学生亲自查看导入示例并提供截图。 |
| 架构和代码审阅意见 | 开发侧已核对分层依赖、Command、Composite、集中工厂、事务与历史恢复、一类一文件及支持边界；未发现相应约定冲突。学生本轮完成深入代码审阅。 |
| 发现的问题及修订复核 | 学生发现导入截图与原验收文字不一致。复核确认 `c2` 位于同色 `r2` 内，`e1` 部分越界且画布内部分同色重叠；导入副本相对源文件仅补上 `id="rect1"`。已修正文档，未发现图形丢失；学生随后接受测试结论并整理最终文档。 |
| 本地验收结论 | 自动检查、终端检查及 Chrome 预览通过；2026-10-18 最终复核仍为 131 项测试通过。学生接受测试结果并审阅最终文档。 |
| 最终 Git 交付授权 | 2026-10-18，学生明确要求按 `phase_cli_1.md` 再次核对，无误后提交推送并标记 `final`。最终交付以第六阶段提交为准，`main` 与 `final` 应指向同一版本。 |
