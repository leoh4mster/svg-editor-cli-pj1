import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ShapeFactory } from "../src/application/ShapeFactory.js";
import type { SvgDocument } from "../src/domain/SvgDocument.js";
import { SvgXmlCodec } from "../src/infrastructure/svg/SvgXmlCodec.js";

const entryPoint = fileURLToPath(new URL("../src/main.js", import.meta.url));
const codec = new SvgXmlCodec(new ShapeFactory());

function example(name: string): string {
  return readFileSync(new URL(`../../examples/${name}`, import.meta.url), "utf8");
}

function replay(directory: string, input: string) {
  const result = spawnSync(process.execPath, [entryPoint], {
    cwd: directory, input, encoding: "utf8", timeout: 5000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.signal, null);
  assert.doesNotMatch(result.stdout, /(?:^|\n)svg>\s/);
  return result;
}

function prepare(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(directory, "examples", "output"), { recursive: true });
  copyFileSync(new URL("../../examples/imported.svg", import.meta.url), join(directory, "examples", "imported.svg"));
  return directory;
}

function saved(directory: string, name: string): SvgDocument {
  const result = codec.decode(readFileSync(join(directory, "examples", "output", name), "utf8"));
  assert.deepEqual(result.warnings, [], "all exported elements must already have ids");
  return result.copyDocument();
}

function count(document: SvgDocument): number {
  return document.children.flatMap((shape) => shape.walk()).length;
}

test("assignment section 6 replay saves five elements, retains both deliberate errors and imports seven elements", () => {
  const directory = prepare("svg-cli-transcript-");
  try {
    const result = replay(directory, example("acceptance-session.cli"));
    assert.equal(result.stderr, [
      "error: cannot group a container into its own descendant: markers",
      "error: undo not allowed after io command",
      "",
    ].join("\n"));
    assert.match(result.stdout, /saved to examples\/output\/demo.svg \(5 elements\)/);
    assert.match(result.stdout, /warning: assigned id rect1 to unnamed <rect>\nread examples\/imported.svg \(7 elements\)/);
    assert.equal((result.stdout.match(/warning: assigned id/g) ?? []).length, 1);
    assert.match(result.stdout, /saved to examples\/output\/imported-copy.svg \(7 elements\)/);

    const demo = saved(directory, "demo.svg");
    assert.equal(count(demo), 5);
    assert.deepEqual(demo.children.map((shape) => shape.id), ["bg", "title", "markers"]);
    assert.deepEqual(demo.findShape("markers").children.map((shape) => shape.id), ["c1", "box"]);
    assert.equal(demo.findShape("title").textContent, "My Diagram");
    assert.equal(demo.findShape("c1").svgAttributes.get("cx"), "130");
    assert.equal(demo.parentOf("box")?.id, "markers");
    assert.throws(() => demo.findShape("bad"), { message: "no such shape: bad" });

    const imported = saved(directory, "imported-copy.svg");
    assert.equal(count(imported), 7);
    assert.equal(imported.width, 400);
    assert.equal(imported.height, 300);
    assert.deepEqual(imported.children.map((shape) => shape.id), ["rect1", "t1", "c1", "g1", "e1"]);
    assert.deepEqual(imported.findShape("g1").children.map((shape) => shape.id), ["r2", "c2"]);
    assert.equal(imported.findShape("t1").textContent, "imported");
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("assignment section 6.1 version A exports eight elements and undo restores both node geometry and Chinese label position", () => {
  const directory = prepare("svg-cli-flowchart-");
  try {
    const result = replay(directory, example("flowchart.cli"));
    assert.equal(result.stderr, "");
    assert.match(result.stdout, /g#node2 moved by \(0,100\)/);
    assert.match(result.stdout, /undone: g#node2 moved by \(0,100\)/);
    assert.match(result.stdout, /saved to examples\/output\/flowchart.svg \(8 elements\)/);
    const diagram = saved(directory, "flowchart.svg");
    assert.equal(count(diagram), 8);
    assert.equal(diagram.width, 800);
    assert.equal(diagram.height, 600);
    assert.deepEqual(diagram.children.map((shape) => shape.id), ["flowchart"]);
    assert.deepEqual(diagram.findShape("flowchart").children.map((shape) => shape.id), ["node1", "node2", "arrow1"]);
    assert.deepEqual(diagram.findShape("node1").children.map((shape) => shape.id), ["start", "start-label"]);
    assert.deepEqual(diagram.findShape("node2").children.map((shape) => shape.id), ["process", "process-label"]);
    assert.equal(diagram.findShape("start-label").textContent, "开始");
    assert.equal(diagram.findShape("process-label").textContent, "处理数据 v2");
    assert.equal(diagram.findShape("process").svgAttributes.get("y"), "100");
    assert.equal(diagram.findShape("process-label").svgAttributes.get("y"), "135");
    assert.equal(diagram.findShape("arrow1").svgAttributes.get("stroke"), "black");
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("exported flowchart can be reimported, regrouped and transformed with full CLI history before another escaped save", () => {
  const directory = prepare("svg-cli-flowchart-roundtrip-");
  try {
    const input = example("flowchart.cli") + [
      "read examples/output/flowchart.svg",
      "undo",
      "group pair process-label process",
      "back process-label",
      "undo",
      "redo",
      "addto node1 pair",
      "undo",
      "read missing.svg",
      "redo",
      "ungroup pair",
      "undo",
      "redo",
      "move node1 5 10",
      "scale node1 0.5",
      'set process-label text "处理 <数据> & \\"结果\\""',
      "save examples/output/edited.svg",
      "undo",
      "read examples/output/edited.svg",
      "show process-label",
      "save",
      "",
    ].join("\n");
    const result = replay(directory, input);
    assert.equal(result.stderr, [
      "error: undo not allowed after io command",
      "error: cannot read file: missing.svg",
      "error: undo not allowed after io command",
      "",
    ].join("\n"));
    assert.match(result.stdout, /redone: g#pair moved into g#node1/);
    assert.match(result.stdout, /redone: g#pair ungrouped \(2 children promoted\)/);
    assert.equal((result.stdout.match(/saved to examples\/output\/edited.svg \(8 elements\)/g) ?? []).length, 2);
    assert.doesNotMatch(result.stdout, /warning: assigned id/);

    const diagram = saved(directory, "edited.svg");
    assert.equal(count(diagram), 8);
    assert.deepEqual(diagram.findShape("node1").children.map((shape) => shape.id), ["start", "start-label", "process-label", "process"]);
    assert.deepEqual(diagram.findShape("node2").children, []);
    assert.equal(diagram.parentOf("process-label")?.id, "node1");
    assert.equal(diagram.findShape("process-label").textContent, '处理 <数据> & "结果"');
    assert.equal(diagram.findShape("process-label").svgAttributes.get("x"), "275");
    assert.equal(diagram.findShape("process-label").svgAttributes.get("y"), "72.5");
    assert.equal(diagram.findShape("process").svgAttributes.get("x"), "262.5");
    assert.equal(diagram.findShape("process").svgAttributes.get("y"), "55");
    assert.equal(diagram.findShape("process").svgAttributes.get("width"), "80");
    assert.equal(diagram.findShape("process").svgAttributes.get("height"), "30");
    assert.equal(diagram.findShape("arrow1").svgAttributes.get("x1"), "280");
    const xml = readFileSync(join(directory, "examples", "output", "edited.svg"), "utf8");
    assert.match(xml, /处理 &lt;数据&gt; &amp; "结果"/);
    assert.doesNotMatch(xml, /\stext=/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
