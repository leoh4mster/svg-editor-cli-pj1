import { execFileSync } from "node:child_process";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
const base = process.argv[2] ?? "final";
const target = process.argv[3] ?? "HEAD";
const scopes = ["内核", "装配处", "插件", "VS Code"];
function scope(path) {
  if (path.startsWith("vscode-extension/src/")) return "VS Code";
  if (path.startsWith("plugins/")) return "插件";
  if (path === "src/main.ts" || path.startsWith("src/host/")) return "装配处";
  if (path.startsWith("src/")) return "内核";
}

const roles = {
  main: "CLI 入口和启动装配", Cli: "逐行读取、分发和输出", CommandLineParser: "命令行分词",
  CommandRegistry: "命令分发与帮助目录", Command: "命令契约", EditCommand: "将编辑纳入会话事务",
  CommandArguments: "校验命令参数", CommandCatalog: "命令目录端口", ShapeFactory: "构造图形并查找读回规则",
  EditorSession: "画布、当前路径及编辑历史", SvgReadResult: "导入结果与警告", TreeFormatter: "生成结构树行",
  ShowFormatter: "格式化图形明细", CommandHistory: "撤销与重做栈", HistoryEntry: "编辑前后快照",
  TextFileStore: "文本读写端口", SvgCodec: "SVG 编解码端口", NodeFileStore: "本地文本文件适配器",
  SvgElement: "XML 输入元素树", SvgXmlCodec: "SVG 输入与输出", SvgDocument: "画布、图形索引和层级操作",
  EditorError: "可报告的编辑器错误", NumericValue: "解析有限数值", Shape: "图形公共行为与所有权",
  Contracts: "插件契约与宿主能力类型", AttributeDispatcher: "匹配属性处理器与缺省属性修改",
  EditorHost: "会话启动依赖及内置能力装配", codePlugins: "代码装配的可选插件列表",
  PluginLoader: "配置校验、插件加载与故障隔离", PluginPackage: "定位包清单与 ESM 入口",
  Registration: "暂存并原子发布注册", RegistrationError: "注册冲突与清单差异诊断",
  BasicShapeProvider: "基础图形的构造和 SVG 字段转换", BuiltinShapes: "六种图形的参数及提供者",
  BuiltinPlugin: "注册内置图形和命令", SvgBadgeProvider: "Explorer 文件标记",
  SvgOutlineParser: "解析元素层级和源码偏移", SvgOutlineProvider: "转换为原生大纲节点", extension: "注册 VS Code 功能",
};
function role(path, source) {
  const name = basename(path).replace(/\.[^.]+$/, "");
  if (roles[name]) return roles[name];
  if (path.startsWith("src/domain/shapes/")) return name + " 图形的几何与属性行为";
  if (name.endsWith("Command")) return name.slice(0, -7).toLowerCase() + " 命令";
  if (path === "src/extensions/index.ts") return "插件公开 API";
  const summary = /^\/\*\*\s*([^*\n][^\n]*?)\s*\*\//mu.exec(source);
  if (summary) return summary[1].trim().replaceAll("|", "／");
  throw new Error("请给新源码添加一行 /** 文件职责 */ 注释：" + path);
}

// Count each executable function once, then count decision nodes once in the whole AST.
function complexity(source, path) {
  const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  const branches = new Set([ts.SyntaxKind.IfStatement, ts.SyntaxKind.CaseClause, ts.SyntaxKind.ForStatement,
    ts.SyntaxKind.ForOfStatement, ts.SyntaxKind.ForInStatement, ts.SyntaxKind.WhileStatement,
    ts.SyntaxKind.DoStatement, ts.SyntaxKind.CatchClause, ts.SyntaxKind.ConditionalExpression]);
  const logical = new Set([ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken,
    ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.AmpersandAmpersandEqualsToken,
    ts.SyntaxKind.BarBarEqualsToken, ts.SyntaxKind.QuestionQuestionEqualsToken]);
  let count = Number(tree.statements.some(s => ts.isExpressionStatement(s) || ts.isVariableStatement(s)
    || branches.has(s.kind) || ts.isTryStatement(s) || ts.isSwitchStatement(s)));
  function visit(node) {
    if (ts.isTypeNode(node)) return;
    if (ts.isFunctionLike(node) && node.body) count++;
    if (branches.has(node.kind) || (ts.isBinaryExpression(node) && logical.has(node.operatorToken.kind))) count++;
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return count;
}

function measure(ref) {
  const sha = git("rev-parse", "--verify", ref + "^{commit}").trim();
  const files = new Map();
  const totals = Object.fromEntries(scopes.map(key => [key, [0, 0, 0]]));
  for (const path of git("ls-tree", "-rz", "--name-only", sha).split("\0").filter(Boolean)) {
    const group = scope(path);
    if (!group || !/\.(?:[cm]?[tj]s)$/u.test(path) || path.endsWith(".d.ts")
      || /(?:^|\/)(?:dist|node_modules|test|tests|fixtures)(?:\/|$)/u.test(path)) continue;
    const source = git("show", sha + ":" + path);
    const lines = source ? source.replace(/\n$/u, "").split("\n").length : 0;
    const cc = complexity(source, path);
    files.set(path, { group, lines, cc, role: role(path, source) });
    const total = totals[group];
    total[0]++; total[1] += lines; total[2] += cc;
  }
  return { sha, files, totals };
}

const before = measure(base);
const after = measure(target);
console.log("# CLI 重构指标\n");
console.log("基线 `" + before.sha + "`，本次源码快照 `" + after.sha + "`。\n");
console.log("按 Git 中的运行源码统计物理行（含空行及注释）。内核包含领域、应用、CLI 与基础 I/O，装配处包含入口与加载器，插件按 plugins/ 归类。VS Code 单列。测试、依赖、构建结果和指标脚本均排除。\n");
console.log("圈复杂度为有函数体的每个函数、方法或访问器各 1，含顶层执行语句的模块再计 1；每个 if、循环、非 default 的 case、catch、三元及短路逻辑运算各加 1。按 TypeScript AST 遍历，两端使用同一口径。\n");
console.log("| 范围 | 原文件数 | 现文件数 | 原行数 | 现行数 | 原复杂度 | 现复杂度 | 复杂度增量 |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
function row(label, old, now) {
  console.log("| " + [label, old[0], now[0], old[1], now[1], old[2], now[2], now[2]-old[2]].join(" | ") + " |");
}
for (const key of scopes) row(key, before.totals[key], after.totals[key]);
const sum = totals => [0, 1, 2].map(i => scopes.slice(0, 3).reduce((n, key) => n + totals[key][i], 0));
row("CLI 合计", sum(before.totals), sum(after.totals));
console.log("\n## 文件清单\n\n| 路径 | 范围 | 职责 | 原行数 → 现行数 | 原复杂度 → 现复杂度 |\n| --- | --- | --- | ---: | ---: |");
for (const path of [...new Set([...before.files.keys(), ...after.files.keys()])].sort()) {
  const a = before.files.get(path), b = after.files.get(path);
  const entry = b ?? a;
  console.log(`| \`${path}\` | ${entry.group} | ${entry.role} | ${a?.lines ?? "—"} → ${b?.lines ?? "—"} | ${a?.cc ?? "—"} → ${b?.cc ?? "—"} |`);
}
