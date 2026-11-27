# Phase 2 验收记录

复核日期为 2026-11-27。运行源码为 cdbd319，远程仓库为 leoh4mster/svg-editor-cli-pj1。文档及指标已整理并经学生审阅，学生批准最终提交及 p2 交付。以下结果来自实际执行。

## 环境与汇总

本机为 macOS arm64，Node 24.18.0，npm 11.16.0，VS Code 1.144.0。CLI 锁定 TypeScript 5.9.3、saxes 6.0.0、xmlchars 2.2.0、import-meta-resolve 4.2.0。扩展独立锁定其依赖。

| 检查 | 结果 |
| --- | --- |
| 根目录 npm run check | 163 项通过，0 失败、0 跳过 |
| node scripts/verify-compat.mjs | 7 份会话，stdout、stderr、SVG 字节全部一致 |
| 扩展 npm test | 4 项通过 |
| 扩展真实宿主测试 | Exit code 0，标记、层级、范围、编辑、不完整 XML 及恢复均通过 |
| box 两种独立接入的提交差异 | 两端路径存在，内核、加载器、既有插件零改动，两个 box 包内容相同 |
| loader 阅读及依赖检查 | 无硬编码具体插件映射，运行内核不导入插件或宿主，插件只引用公开 API |
| 指标重现 | 从 final 与 cdbd319 的 Git 历史生成，文件职责、行数、复杂度齐全 |
| 最终交付状态 | 验收及学生文档审阅完成，最终版本标记为 p2 |

## 逐项对应课程验收

| 要求 | 检查依据与结果 |
| --- | --- |
| SVG 文件标记，文件内容与名字保持原样 | host 测试比较文件字节并验证 SVG 文件、普通文本、同后缀目录和缺失文件的装饰结果；真实 Explorer 截图可见仅 SVG 文件显示 [] |
| 原生 Outline 层级与定位 | host 调用原生 DocumentSymbol 查询，检查两层 g、无 id 的 text、rect 的选择范围；截图状态栏显示第 4 行第 8 列 |
| 编辑更新与异常 XML | 同一未保存文档依次输入有效、残缺、有效内容，符号清空后恢复，宿主退出码为 0 |
| 四个扩展点注册、调用、缺省 | Framework.test.ts 中 probe 同时注册四类能力；普通命令及六种基础图形通过 builtin 注册；未加载时返回原行为 |
| stats | 独立测试验证空画布、类型首次出现顺序、自定义容器及 redo；BoxCli 验证实际 box 内部叶子统计 |
| dir 的替身与真实适配器 | DirCommand.test.ts 覆盖隐藏项、混合项、稳定排序、空目录、读取失败、失效链接、非递归；已有 undo/redo、保存点、文件路径保持 |
| dir 当前目录与双装配 | CommandPluginsCli 在固定目录内启动两个 CLI，read/save 使用其他位置仍列原目录；同一输出文件逐字节匹配 |
| 属性行为及单次撤销 | BoxPlugin.test.ts 对 fill、label 分别 undo/redo；Framework 处理器一次改两个位置，整体撤销恢复 |
| 属性冲突与部分失败 | Framework 多匹配时拒绝执行；先写入再抛错不提交，旧 redo 分支仍可执行；普通未知属性按原约定报错 |
| box id、嵌套及结构保护 | BoxPlugin 测试三种派生 id 冲突、嵌套、移动、缩放、整棵删除、必要子部件禁止删除/移出/重组、禁止解组 |
| box 读回与降级 | BoxCli 验证双装配往返字节一致、无插件读成 g、标记与子节点保留；坏文件拒绝后仍能 redo 并写回原路径 |
| 两个标签互不感知 | TreeLabelsCli 验证 (box) *、交换顺序后的 * (box)、单独禁用星号 |
| 星号状态机 | ModifiedStar 独立验证编辑→保存→编辑→undo→redo，以及删除、重排、换父容器、尺寸变化、属性顺序和实例隔离 |
| 加载器四类失败 | PluginLoader.test.ts 对缺模块、缺默认导出、清单不符、激活异常分别断言错误文本；已有包的依赖缺失归入激活失败 |
| 重复注册与回滚 | 同批及跨批冲突、吞掉冲突异常、暂存多个项后抛错均验证无残留，既有插件及后续插件保留 |
| 配置无效与主程序恢复 | 错误 JSON 和结构在加载前整份拒绝；Framework 的真实 CLI 在错误配置后继续执行 init/create/tree |
| 代码/配置同一注册路径 | 同一 PluginLoader.activate/Registration.commit；测试 probe 验证 options，正式命令与 box 会话再验证相同实现 |
| ADR 与模块图 | 课程报告包括重构前后两张 PlantUML 和四条 ADR，明确属性、复合结构、dirty 及清单校验取舍 |
| 指标 | docs/metrics/phase-2.md 从 Git 源码生成，CLI 三类及 VS Code 分列；final/p2 对照使用相同运行源码，指标可复现 |

源码入口分别是 [Framework](../test/Framework.test.ts)、[加载器测试](../test/PluginLoader.test.ts)、[stats](../test/StatsCommand.test.ts)、[dir](../test/DirCommand.test.ts)、[box](../test/BoxPlugin.test.ts)、[box CLI](../test/BoxCli.test.ts)、[标签状态机](../test/ModifiedStar.test.ts)和[标签 CLI](../test/TreeLabelsCli.test.ts)。

## 会话与文件

| 会话 | 输入 | 预期与初始文件 |
| --- | --- | --- |
| Phase 1 §6 基础会话 | transcript/cli-1.txt | cli-1.stdout 和 cli-1.stderr；初始 examples/imported.svg。测试建立 examples/output 并使用三份独立工作目录 |
| Phase 1 §6.1 B | transcript/box-flowchart.txt | 当前默认插件集合使用 box-flowchart-star.stdout；第四阶段原输出为 box-flowchart.stdout |
| stats 与 dir | transcript/command-plugins.txt | command-plugins.stdout；固定目录只有 docs/source.svg 和 .settings，source.svg 复制自 examples/imported.svg |
| 标签保存点 | transcript/tree-labels.txt | tree-labels.stdout；空临时目录，运行生成 state.svg |

会话输入仅含命令和注释。预期输出单独保存，所需 SVG 位于 examples/imported.svg。dir 一致性测试的目录内容在两次运行间固定，输出由父进程捕获。全套测试包含上述实际 CLI 子进程调用。[会话文件](transcript/)

## 复现命令

在仓库根目录执行：

```sh
npm ci
npm run check
node scripts/verify-compat.mjs
npm --prefix vscode-extension ci
npm --prefix vscode-extension test
VSCODE_EXECUTABLE_PATH="/Applications/Visual Studio Code.app/Contents/MacOS/Code" npm --prefix vscode-extension run test:host
node scripts/metrics.mjs final cdbd319 | diff - docs/metrics/phase-2.md
```

最后的宿主路径对应本机 macOS。其他平台可使用自己的 VS Code 可执行文件路径，或不设置环境变量，由测试工具下载 VS Code。扩展截图在第一阶段由真实开发宿主截取，本轮复用原图，并重新运行宿主测试。[文件标记截图](images/p2-explorer-badge.png) · [大纲定位截图](images/p2-outline-navigation.png) · [手工操作步骤](../vscode-extension/README.md)

## Git 交付

已核对远程地址、过程提交以及现有 final 的目标 77112dc856b18290646351ea87e6ce1f87400f7a。box 的 A/B 接入提交 f41daf2 和 601da5a 都以 b132c27 为父提交，合并进入 main，老师可直接按提交差异验收。

学生已批准最终文档提交、p2 标签和推送。最终提交的运行源码与 cdbd319 一致，final/p2 的指标对照使用相同统计口径。远程 main 与 p2 对应同一最终版本。
