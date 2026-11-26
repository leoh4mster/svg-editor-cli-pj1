# 重构指标复现

在仓库根目录安装锁定依赖后执行以下命令。参数分别是基线和待测的 Git 提交或标签，工作区内尚未提交的文件不会参与统计。

```sh
node scripts/metrics.mjs final HEAD
```

脚本通过 `git ls-tree` 和 `git show` 读取两个版本的源码，用项目锁定版本的 TypeScript 解析 AST。输出包含两端的文件清单、文件职责、物理行数、圈复杂度及增量。内核、装配处、插件分别计数，VS Code 单列。纯类型接口也计入源码行数，圈复杂度为零。具体计数规则随报告输出。

第六阶段可用 `node scripts/metrics.mjs final p2` 验证最终两端。中间阶段报告引用实际源码提交的 SHA，以便提交报告本身后仍能重现相同字节。
