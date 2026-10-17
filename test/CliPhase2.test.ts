import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const entryPoint = fileURLToPath(new URL("../src/main.js", import.meta.url));

test("CLI replays quoted Chinese text, colors, and nesting and recovers after shape errors", () => {
  const result = spawnSync(process.execPath, [entryPoint], {
    input: [
      "# shape creation and recovery",
      "create g early",
      "init",
      "create g node",
      "create rect start 1 2 3 4 #4a90d9 in node",
      'create text label 5 6 "开始 处理数据" in node',
      "create rect start 0 0 1 1",
      "create g bad in missing",
      "create g bad in start",
      "create box unsupported",
      "create g bad in node",
      "tree node",
      "show start",
      "help",
    ].join("\n"),
    encoding: "utf8",
    timeout: 5000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.signal, null);
  assert.equal(result.stderr, [
    "error: no document. use 'init' or 'read' first",
    "error: id already exists: start",
    "error: no such container: missing",
    "error: not a container: start",
    "error: unknown shape type: box (is the plugin loaded?)",
    "",
  ].join("\n"));
  assert.match(result.stdout, /rect#start created in g#node/);
  assert.ok(result.stdout.includes([
    "g#node",
    "├── rect#start x=1 y=2 w=3 h=4 fill=#4a90d9",
    '├── text#label (5,6) "开始 处理数据"',
    "└── g#bad",
  ].join("\n")));
  assert.ok(result.stdout.includes("rect#start  parent=g#node\n  x=1 y=2 width=3 height=4\n  fill=#4a90d9"));
  assert.match(result.stdout, /create <type> <id>/);
  assert.match(result.stdout, /tree \[id\]/);
  assert.match(result.stdout, /show <id>/);
  assert.doesNotMatch(result.stdout, /svg>/);
});

test("the phase-two replay builds the assignment's eight-element flowchart without errors", () => {
  const input = readFileSync(new URL("../../examples/phase2.cli", import.meta.url), "utf8");
  const result = spawnSync(process.execPath, [entryPoint], { input, encoding: "utf8", timeout: 5000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout.match(/ created(?: in g#\S+)?$/gm)?.length, 9);
  assert.match(result.stdout, /svg \(800x600\)\n└── g#flowchart/);
  assert.ok(result.stdout.includes('    │   └── text#start-label (155,135) "开始"'));
  assert.ok(result.stdout.includes('    │   └── text#process-label (545,135) "处理数据"'));
  assert.ok(result.stdout.includes("    └── line#arrow1 (280,130) -> (520,130) stroke=black"));
  assert.match(result.stdout, /rect#start  parent=g#node1\n  x=120 y=100 width=160 height=60\n  fill=#4a90d9/);
});
