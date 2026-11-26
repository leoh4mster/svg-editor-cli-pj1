# SVG 文件标记与原生大纲

本扩展为 SVG 文件提供 Explorer 标记和源码导航。运行环境为桌面版 VS Code 1.96 或更新的 1.x 版本。本次验证使用 macOS arm64、Node 24.18.0、npm 11.16.0 和 VS Code 1.144.0。

## 从源码启动

在仓库根目录执行以下命令。扩展有自己的依赖锁文件。

```sh
cd vscode-extension
npm ci
npm run build
code .
```

在打开的扩展工程中按 F5，选择「SVG 扩展与示例工作区」。开发宿主会打开 [sample](sample) 目录。也可以在同一终端、完成构建后直接启动开发宿主。

```sh
code --new-window --extensionDevelopmentPath="$PWD" "$PWD/sample"
```

1. 查看 Explorer。文件 `example.svg` 右侧应显示 `[]`，`notes.txt` 与目录 `assets.svg` 右侧均为空。若所有文件标记都隐藏，在设置中启用 **Explorer › Decorations: Badges**。
2. 打开 `example.svg`。如果窗口显示图像预览，在编辑器标签的菜单中选择 **Reopen Editor With… → Text Editor**。展开 Explorer 底部的 **Outline**，也可用命令面板中的 **View: Open View… → Outline** 打开。
3. 依次展开 `svg`、`g#flowchart`、`g#node`，点击 `rect#start`。光标跳到示例第 4 行第 8 列的标签名。相邻的 `text` 没有 id，在树中显示为 `text`。
4. 将 `id="start"` 改为 `id="begin"`，稍候可看到大纲更新为 `rect#begin`，无需保存。删去最后一个 `>` 可观察空大纲，补回后恢复。可用 **File: Revert File** 恢复磁盘示例。

## 运行验证

```sh
npm test
npm run test:host
```

第一条命令构建扩展并执行解析单元测试。第二条在独立 Extension Development Host 中打开示例的临时副本，验证文件类型、原生符号命令、导航范围、未保存编辑和 XML 出错后的恢复。默认由 `@vscode/test-electron` 下载测试用 VS Code；也可将环境变量 `VSCODE_EXECUTABLE_PATH` 设为本机桌面版的可执行文件。例如本次在 macOS 上使用以下命令。

```sh
VSCODE_EXECUTABLE_PATH="/Applications/Visual Studio Code.app/Contents/MacOS/Code" npm run test:host
```

[课程报告与运行截图](../doc/README.md)
