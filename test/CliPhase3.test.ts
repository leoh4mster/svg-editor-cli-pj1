import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const entryPoint = fileURLToPath(new URL("../src/main.js", import.meta.url));

test("CLI editing replay recovers after errors and preserves history across help and display commands", () => {
  const result = spawnSync(process.execPath, [entryPoint], {
    input: [
      "move r 1 2",
      "undo",
      "init",
      "undo",
      "redo",
      "create g root",
      "create rect r 1 2 3 4 #abcdef in root",
      "move root 5 -2",
      "undo",
      "help",
      "tree",
      "show r",
      "canvas",
      "set r id renamed",
      "move r Infinity 0",
      "scale root 0",
      "redo",
      "set r width -1",
      "set r stroke-width .5",
      "scale r 2",
      "delete root",
      "undo",
      "tree",
      "show r",
    ].join("\n"),
    encoding: "utf8",
    timeout: 5000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.signal, null);
  assert.equal(result.stderr.trim().split("\n").length, 8);
  assert.equal(result.stderr.match(/error: no document\. use 'init' or 'read' first/g)?.length, 2);
  assert.equal(result.stderr.match(/error: undo not allowed after io command/g)?.length, 2);
  assert.match(result.stderr, /error: unknown attribute: id/);
  assert.match(result.stderr, /error: invalid number for dx: Infinity/);
  assert.match(result.stderr, /error: scale factor must be positive/);
  assert.match(result.stderr, /error: rect width must be a finite nonnegative number/);
  assert.match(result.stdout, /undone: g#root moved/);
  assert.match(result.stdout, /redone: g#root moved/);
  assert.match(result.stdout, /move <id> <dx> <dy>/);
  assert.match(result.stdout, /scale <id> <factor>/);
  assert.match(result.stdout, /set <id> <attr> <value>/);
  assert.ok(result.stdout.includes("rect#r  parent=g#root\n  x=12 y=0 width=6 height=8\n  fill=#abcdef"));
  assert.match(result.stdout, /stroke-width=0.5/);
  assert.doesNotMatch(result.stdout, /svg>/);
});

test("phase-three example replays nested edits, restores deleted trees and starts a new history branch", () => {
  const input = readFileSync(new URL("../../examples/phase3.cli", import.meta.url), "utf8");
  const result = spawnSync(process.execPath, [entryPoint], { input, encoding: "utf8", timeout: 5000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /undone: g#node moved/);
  assert.match(result.stdout, /redone: g#node moved/);
  assert.match(result.stdout, /undone: g#node deleted/);
  assert.match(result.stdout, /rect#body x=70 y=55 w=80 h=30 fill=#4a90d9/);
  assert.ok(result.stdout.includes('text#label (87.5,72.5) "新的处理分支"'));
  assert.match(result.stdout, /line#arrow \(280,130\) -> \(520,130\) stroke=black/);
  assert.match(result.stdout, /canvas 800x600/);
});
