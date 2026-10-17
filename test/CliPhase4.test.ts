import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const entryPoint = fileURLToPath(new URL("../src/main.js", import.meta.url));

test("CLI hierarchy replay recovers from errors, keeps redo through rejected edits and promotes nested children", () => {
  const result = spawnSync(process.execPath, [entryPoint], {
    input: [
      "group absent a b",
      "init",
      "undo",
      "create g root",
      "create rect a 1 2 3 4 #abcdef",
      "create circle b 5 6 7 red",
      'create text title 10 20 "课程作业"',
      "group markers b a",
      "tree markers",
      "addto root markers",
      "undo",
      "group bad markers a",
      "ungroup markers",
      "group duplicate a a",
      "group partial a b missing",
      "show partial",
      "front missing",
      "help",
      "tree",
      "show a",
      "canvas",
      "redo",
      "back b",
      "front b",
      "undo",
      "redo",
      "ungroup markers",
      "show a",
      "addto a b",
      "back title",
      "front title",
      "group tiny a",
      "tree",
    ].join("\n"),
    encoding: "utf8",
    timeout: 5000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.signal, null);
  assert.equal(result.stderr.trim().split("\n").length, 10);
  assert.match(result.stderr, /error: no document\. use 'init' or 'read' first/);
  assert.match(result.stderr, /error: undo not allowed after io command/);
  assert.match(result.stderr, /error: cannot group a container into its own descendant: markers/);
  assert.match(result.stderr, /error: cannot ungroup top-level container: markers/);
  assert.match(result.stderr, /error: no such shape: missing/);
  assert.match(result.stderr, /error: no such shape: partial/);
  assert.match(result.stderr, /error: not a container: a/);
  assert.doesNotMatch(result.stderr, /unknown command|nothing to redo/);
  assert.ok(result.stdout.includes("g#markers\n├── rect#a x=1 y=2 w=3 h=4 fill=#abcdef\n└── circle#b cx=5 cy=6 r=7 fill=red"));
  assert.match(result.stdout, /undone: g#markers moved into g#root/);
  assert.match(result.stdout, /redone: g#markers moved into g#root/);
  assert.match(result.stdout, /undone: circle#b brought to front/);
  assert.match(result.stdout, /redone: circle#b brought to front/);
  assert.ok(result.stdout.includes("rect#a  parent=g#root\n  x=1 y=2 width=3 height=4\n  fill=#abcdef"));
  for (const syntax of ["group <newGid>", "ungroup <gid>", "addto <gid> <id>", "front <id>", "back <id>"]) {
    assert.ok(result.stdout.includes(syntax), `help should include ${syntax}`);
  }
  assert.doesNotMatch(result.stdout, /(?:^|\n)svg>\s/);
});

test("phase-four example replays all hierarchy commands and history without errors", () => {
  const input = readFileSync(new URL("../../examples/phase4.cli", import.meta.url), "utf8");
  const result = spawnSync(process.execPath, [entryPoint], { input, encoding: "utf8", timeout: 5000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /g#markers created with 2 children/);
  assert.match(result.stdout, /g#markers moved into g#scene/);
  assert.match(result.stdout, /ellipse#halo sent to back/);
  assert.match(result.stdout, /g#markers brought to front/);
  assert.match(result.stdout, /undone: g#pair ungrouped/);
  assert.match(result.stdout, /redone: g#pair ungrouped/);
  assert.match(result.stdout, /g#markers ungrouped \(2 children promoted\)/);
  assert.ok(result.stdout.includes("rect#box  parent=g#scene\n  x=200 y=80 width=60 height=60\n  fill=#3366ff"));
  assert.match(result.stdout, /redone: circle#c1 brought to front/);
  assert.match(result.stdout, /canvas 800x600/);
});
