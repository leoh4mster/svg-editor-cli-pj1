# SVG CLI Editor · PJ1 Phase 2

软件设计课程项目。包含 TypeScript CLI SVG 编辑器和 VS Code 的 SVG 文件标记、大纲扩展。CLI 保留 Phase 1 的编辑功能，并通过独立插件增加统计、目录查询、复合图形和树标签。

[课程报告](doc/README.md) · [Phase 2 验收记录](doc/PHASE2_ACCEPTANCE.md) · [VS Code 启动说明](vscode-extension/README.md) · [重构指标](docs/metrics/phase-2.md)

## CLI 运行

需要 Node.js 22 或更新版本。本机验证使用 Node 24.18.0 和 npm 11.16.0。在仓库根目录执行：

```sh
npm ci
npm run build
node dist/src/main.js
```

交互提示符为 `svg>`。可用 Ctrl+D 结束输入，也可通过管道输入纯命令文件。双引号保留空格和中文，行首 `#` 表示注释。

| 入口 | 能力 |
| --- | --- |
| `node dist/src/main.js` | 按 `src/host/codePlugins.ts` 做代码装配 |
| `node dist/src/main.js --config plugins.config.json` | 按指定 JSON 配置做动态装配 |
| `node dist/src/main.js --no-plugins` | 仅装入 Phase 1 的十九条命令和六种图形 |

默认两种装配均按 stats、dir、box、tree-star 顺序加载。配置路径中的相对模块以配置文件所在目录为基准。修改某项的 `enabled` 为 false 可以单独禁用它。

## 试用

```text
init 800 600
create box n1 120 100 160 60 "开始"
set n1 fill #f5a623
set n1 label "处理数据"
tree
undo
redo
stats
dir
save diagram.svg
tree
```

`tree` 中的 `(box)` 标明复合图形，`*` 表示当前内容与保存点有差异，保存后或撤销回保存点后消失。`dir` 查询 CLI 当前工作目录，目录在前，文件在后。符号链接显示为 `[LINK]`，其他特殊条目显示为 `[OTHER]`，每组按名称稳定排序。

## 命令与图形

| 命令 | 语法 |
| --- | --- |
| 帮助与文件 | `help`、`init [w] [h]`、`read <file.svg>`、`save [file.svg]`、`canvas [w h]` |
| 创建与编辑 | `create <type> <id> [params...] [in <containerId>]`、`delete <id>`、`move <id> <dx> <dy>`、`scale <id> <factor>`、`set <id> <attr> <value>` |
| 层级与顺序 | `group <newGid> <id1> <id2>...`、`ungroup <id>`、`addto <containerId> <id>`、`front <id>`、`back <id>` |
| 查看与历史 | `tree [id]`、`show <id>`、`undo`、`redo` |
| 可选查询插件 | `stats`、`dir` |

六种基础图形为 rect、circle、ellipse、line、text、g。具体创建参数见 `help`，另有插件提供的 `create box <id> <x> <y> <w> <h> "标题"`。box 的两个必要子部件按 `<id>-rect`、`<id>-label` 派生 id，不能被单独删除或移出容器，整个 box 可以删除、移动、缩放和嵌套。

每条成功编辑为一个撤销单元。成功的 init、read、save、canvas 尺寸修改保留 Phase 1 的历史屏障；其后 undo/redo 报 `undo not allowed after io command`，直到下一条成功编辑。查询命令保持历史。save 省略路径时使用上一次成功 read/save 的路径。

SVG 读取支持六种基础元素、嵌套分组和带标记的 box，自动给无 id 的元素分配全局唯一 id。保存输出 UTF-8 SVG，保留支持范围内的附加属性。transform、style、href、事件属性、复杂文本及未知元素按既有约定拒绝。无 box 插件时，带标记的复合图形降级为普通 g。[完整兼容性约定](phase_cli_1.md)

## VS Code 扩展

在 `vscode-extension/` 执行 `npm ci`、`npm run build`，用 VS Code 打开该目录并按 F5。开发宿主会打开示例工作区。Explorer 给 SVG 文件显示 `[]`；打开源码后，原生 Outline 显示层级，点击可导航，编辑后自动更新。[操作步骤与测试](vscode-extension/README.md)

## 验证

```sh
npm run check
node scripts/verify-compat.mjs
npm --prefix vscode-extension ci
npm --prefix vscode-extension test
npm --prefix vscode-extension run test:host
```

CLI 163 项与扩展解析 4 项通过，真实扩展宿主测试通过。兼容性脚本从 Git 的 `final` 重新构建旧版本，逐字节比较 7 份会话的 stdout、stderr 和 SVG。新增命令、box 和标签会话在两种装配下使用相同输入与预期输出。[会话材料](doc/transcript/) · [验收细节](doc/PHASE2_ACCEPTANCE.md)

## 交付状态

Phase 2 已完成验收和文档审阅，最终版本通过 `p2` 标签定位。最终交付的运行源码与已验收的 `cdbd319` 一致。Phase 1 的 `final` 指向 `77112dc`。

[代码仓库](https://github.com/leoh4mster/svg-editor-cli-pj1) · [Phase 1 历史报告](https://github.com/leoh4mster/svg-editor-cli-pj1/blob/final/doc/README.md) · [Phase 1 验收记录](doc/ACCEPTANCE.md)
