import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ShapeFactory } from "../src/application/ShapeFactory.js";
import { SvgXmlCodec } from "../src/infrastructure/svg/SvgXmlCodec.js";

const entryPoint = fileURLToPath(new URL("../src/main.js", import.meta.url));
const imported = fileURLToPath(new URL("../../examples/imported.svg", import.meta.url));
const codec = new SvgXmlCodec(new ShapeFactory());

function replay(directory: string, input: string) {
  const result = spawnSync(process.execPath, [entryPoint], {
    cwd: directory, input, encoding: "utf8", timeout: 5000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.signal, null);
  return result;
}

test("CLI reads quoted paths, reports imports atomically and follows the latest successful save path", () => {
  const directory = mkdtempSync(join(tmpdir(), "svg-cli-import-"));
  try {
    copyFileSync(imported, join(directory, "source diagram.svg"));
    writeFileSync(join(directory, "bad.svg"), '<svg><rect/><path id="unsupported"/></svg>');
    const result = replay(directory, [
      'read "source diagram.svg"',
      "undo",
      "move g1 1 2",
      "undo",
      "read missing.svg",
      "redo",
      'save "saved drawing.svg"',
      "undo",
      'set t1 text "中文 & <saved>"',
      "save",
      "read bad.svg",
      "save",
      "init",
      "save",
      "save fresh.svg",
    ].join("\n"));
    assert.equal(result.stderr.trim().split("\n").length, 5);
    assert.equal((result.stderr.match(/error: undo not allowed after io command/g) ?? []).length, 2);
    assert.match(result.stderr, /error: cannot read file: missing.svg/);
    assert.match(result.stderr, /error: no file path\. use 'save <file.svg>' first/);
    assert.doesNotMatch(result.stderr, /unknown command|nothing to redo/);
    assert.equal((result.stdout.match(/warning: assigned id/g) ?? []).length, 1);
    assert.match(result.stdout, /warning: assigned id rect1 to unnamed <rect>\nread source diagram.svg \(7 elements\)/);
    assert.match(result.stdout, /redone: g#g1 moved by \(1,2\)/);
    assert.equal((result.stdout.match(/saved to saved drawing.svg \(7 elements\)/g) ?? []).length, 3);
    assert.match(result.stdout, /saved to fresh.svg \(0 elements\)/);
    const saved = codec.decode(readFileSync(join(directory, "saved drawing.svg"), "utf8")).copyDocument();
    assert.equal(saved.findShape("t1").textContent, "中文 & <saved>");
    assert.equal(saved.findShape("r2").svgAttributes.get("x"), "1");
    assert.equal(saved.findShape("r2").svgAttributes.get("y"), "2");
    assert.equal(codec.decode(readFileSync(join(directory, "fresh.svg"), "utf8")).copyDocument().children.length, 0);
    assert.equal(codec.decode(readFileSync(join(directory, "source diagram.svg"), "utf8")).copyDocument().findShape("t1").textContent, "imported");
    assert.doesNotMatch(result.stdout, /(?:^|\n)svg>\s/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("CLI failed directory writes preserve redo, the default target and the original filesystem", () => {
  const directory = mkdtempSync(join(tmpdir(), "svg-cli-save-failure-"));
  try {
    copyFileSync(imported, join(directory, "source.svg"));
    mkdirSync(join(directory, "unwritable.svg"));
    const result = replay(directory, [
      "read source.svg", "move g1 7 8", "undo", "save unwritable.svg", "redo", "save", "read unwritable.svg",
    ].join("\n"));
    assert.equal(result.stderr, "error: cannot write file: unwritable.svg\nerror: cannot read file: unwritable.svg\n");
    assert.match(result.stdout, /redone: g#g1 moved by \(7,8\)/);
    assert.match(result.stdout, /saved to source.svg \(7 elements\)/);
    const saved = codec.decode(readFileSync(join(directory, "source.svg"), "utf8")).copyDocument();
    assert.equal(saved.findShape("r2").svgAttributes.get("x"), "7");
    assert.equal(saved.findShape("r2").svgAttributes.get("y"), "8");
    assert.deepEqual(readdirSync(directory).sort(), ["source.svg", "unwritable.svg"]);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("phase-five example edits a real imported file and rereads saved SVG without warnings or content loss", () => {
  const directory = mkdtempSync(join(tmpdir(), "svg-cli-phase5-"));
  try {
    mkdirSync(join(directory, "examples"));
    copyFileSync(imported, join(directory, "examples", "imported.svg"));
    const result = replay(directory, readFileSync(new URL("../../examples/phase5.cli", import.meta.url), "utf8"));
    assert.equal(result.stderr, "");
    assert.equal((result.stdout.match(/warning: assigned id/g) ?? []).length, 1);
    assert.equal((result.stdout.match(/saved to phase5-output.svg \(7 elements\)/g) ?? []).length, 2);
    assert.match(result.stdout, /read phase5-output.svg \(7 elements\)/);
    assert.match(result.stdout, /undone: rect#r2 updated: stroke-width="0"/);
    assert.match(result.stdout, /redone: rect#r2 updated: stroke-width="0"/);
    const encoded = readFileSync(join(directory, "phase5-output.svg"), "utf8");
    const saved = codec.decode(encoded).copyDocument();
    assert.equal(saved.findShape("t1").textContent, "课程作业 & SVG <v2>");
    assert.equal(saved.findShape("t1").svgAttributes.get("fill"), "#4a90d9");
    assert.equal(saved.findShape("r2").svgAttributes.get("stroke-width"), "0");
    assert.equal(saved.findShape("r2").svgAttributes.get("x"), "160");
    assert.equal(saved.findShape("r2").svgAttributes.get("y"), "120");
    assert.equal(saved.parentOf("r2")?.id, "g1");
    assert.match(encoded, /课程作业 &amp; SVG &lt;v2&gt;/);
    assert.equal(saved.findShape("c1").svgAttributes.has("fill"), false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
