import assert from "node:assert/strict";
import test from "node:test";
import { ShapeFactory } from "../src/application/ShapeFactory.js";
import { SvgDocument } from "../src/domain/SvgDocument.js";
import type { Shape } from "../src/domain/shapes/Shape.js";

const factory = new ShapeFactory();

function snapshot(document: SvgDocument): string {
  return JSON.stringify({
    width: document.width,
    height: document.height,
    nodes: document.children.flatMap((root) => root.walk()).map((shape) => ({
      id: shape.id,
      type: shape.type,
      parent: document.parentOf(shape.id)?.id,
      details: shape.details(),
      children: shape.children.map((child) => child.id),
    })),
  });
}

function nestedDocument(): SvgDocument {
  const document = new SvgDocument(320.5, 240.25);
  document.addShape(factory.create("g", "outer", []));
  document.addShape(factory.create("g", "inner", []), "outer");
  document.addShape(factory.create("rect", "r", ["1", "2", "3", "4", "red"]), "inner");
  document.addShape(factory.create("circle", "c", ["5", "6", "7"]), "inner");
  document.addShape(factory.create("ellipse", "e", ["8", "9", "10", "11"]), "inner");
  document.addShape(factory.create("line", "l", ["12", "13", "14", "15", "black"]), "outer");
  document.addShape(factory.create("text", "t", ["16", "17", "开始 处理数据"]), "outer");
  return document;
}

function details(shape: Shape): string {
  return shape.details().join("\n");
}

test("document clone preserves all values, explicit styles and their absence without sharing nodes", () => {
  const original = nestedDocument();
  original.setAttribute("outer", "fill", "#eeeeee");
  original.setAttribute("l", "stroke-width", "2.5");
  const before = snapshot(original);
  const cloned = original.clone();
  assert.equal(snapshot(cloned), before);
  for (const node of original.children.flatMap((root) => root.walk())) {
    assert.notStrictEqual(cloned.findShape(node.id), node);
  }
  cloned.moveShape("outer", 100, -20);
  cloned.setAttribute("t", "text", "已修改");
  cloned.deleteShape("c");
  assert.equal(snapshot(original), before);
  assert.match(details(original.findShape("t")), /text="开始 处理数据"/);
  assert.doesNotMatch(details(original.findShape("c")), /fill=|stroke=/);
});

test("immutable shape copies are independent detached trees including nested descendants", () => {
  const original = nestedDocument();
  const root = original.findShape("outer");
  const before = snapshot(original);
  for (const copy of [root.clone(), root.moved(1, 2), root.scaled(2), root.withAttribute("fill", "blue")]) {
    assert.notStrictEqual(copy, root);
    for (const descendant of copy.walk()) {
      assert.notStrictEqual(descendant, original.findShape(descendant.id));
      descendant.assertDetached();
    }
    copy.appendChild(factory.create("g", "new", []));
    const independent = new SvgDocument();
    independent.addShape(copy);
    assert.equal(independent.findShape("new").type, "g");
    assert.equal(snapshot(original), before);
  }
});

test("recursive movement changes every positional coordinate and keeps dimensions and stroke width", () => {
  const document = nestedDocument();
  document.setAttribute("l", "stroke-width", "2.5");
  document.moveShape("outer", -0.5, 1.25);
  assert.match(details(document.findShape("r")), /^x=0.5 y=3.25 width=3 height=4/);
  assert.match(details(document.findShape("c")), /^cx=4.5 cy=7.25 r=7/);
  assert.match(details(document.findShape("e")), /^cx=7.5 cy=10.25 rx=10 ry=11/);
  assert.match(details(document.findShape("l")), /^x1=11.5 y1=14.25 x2=13.5 y2=16.25/);
  assert.match(details(document.findShape("l")), /stroke-width=2.5/);
  assert.match(details(document.findShape("t")), /^x=15.5 y=18.25\ntext="开始 处理数据"/);
  assert.equal(document.parentOf("r")?.id, "inner");
});

test("recursive scaling multiplies every geometric position and size, while keeping explicit stroke width", () => {
  const document = nestedDocument();
  document.setAttribute("l", "stroke-width", "3");
  document.scaleShape("outer", 0.5);
  assert.match(details(document.findShape("r")), /^x=0.5 y=1 width=1.5 height=2/);
  assert.match(details(document.findShape("c")), /^cx=2.5 cy=3 r=3.5/);
  assert.match(details(document.findShape("e")), /^cx=4 cy=4.5 rx=5 ry=5.5/);
  assert.match(details(document.findShape("l")), /^x1=6 y1=6.5 x2=7 y2=7.5/);
  assert.match(details(document.findShape("l")), /stroke-width=3/);
  assert.match(details(document.findShape("t")), /^x=8 y=8.5\ntext="开始 处理数据"/);
});

test("every shape accepts common styles, and group style edits preserve explicit child attributes", () => {
  const document = nestedDocument();
  for (const id of ["outer", "inner", "r", "c", "e", "l", "t"]) {
    document.setAttribute(id, "fill", "#123456");
    document.setAttribute(id, "stroke", "none");
    document.setAttribute(id, "stroke-width", "0");
    assert.match(details(document.findShape(id)), /fill=#123456/);
    assert.match(details(document.findShape(id)), /stroke=none/);
    assert.match(details(document.findShape(id)), /stroke-width=0/);
  }
  const childBefore = details(document.findShape("r"));
  document.setAttribute("outer", "fill", "blue");
  assert.equal(details(document.findShape("r")), childBefore);
  assert.match(details(document.findShape("outer")), /fill=blue/);
});

test("geometry whitelist covers every subtype, text content, signed fractions and zero lengths", () => {
  const document = nestedDocument();
  const cases: Array<[string, string, string]> = [
    ["r", "x", "-.5"], ["r", "y", "+2e1"], ["r", "width", "0"], ["r", "height", ".25"],
    ["c", "cx", "-3"], ["c", "cy", "4"], ["c", "r", "0"],
    ["e", "cx", "-5"], ["e", "cy", "6"], ["e", "rx", "0"], ["e", "ry", ".5"],
    ["l", "x1", "-7"], ["l", "y1", "8"], ["l", "x2", "-9"], ["l", "y2", "10"],
    ["t", "x", "-11"], ["t", "y", "12"], ["t", "text", "新的 中文内容"],
  ];
  for (const [id, attr, value] of cases) {
    document.setAttribute(id, attr, value);
  }
  assert.match(details(document.findShape("r")), /^x=-0.5 y=20 width=0 height=0.25/);
  assert.match(details(document.findShape("c")), /^cx=-3 cy=4 r=0/);
  assert.match(details(document.findShape("e")), /^cx=-5 cy=6 rx=0 ry=0.5/);
  assert.match(details(document.findShape("l")), /^x1=-7 y1=8 x2=-9 y2=10/);
  assert.match(details(document.findShape("t")), /^x=-11 y=12\ntext="新的 中文内容"/);
  document.setAttribute("t", "text", "");
  assert.match(details(document.findShape("t")), /text=""/);
});

test("unknown, immutable and subtype-inappropriate attributes fail atomically", () => {
  const document = nestedDocument();
  const before = snapshot(document);
  for (const [id, attr] of [
    ["r", "id"], ["r", "transform"], ["r", "text"], ["r", "cx"], ["c", "width"],
    ["e", "r"], ["l", "x"], ["t", "font-size"], ["outer", "x"], ["outer", "text"],
  ]) {
    assert.throws(() => document.setAttribute(id!, attr!, "1"), { message: `unknown attribute: ${attr}` });
    assert.equal(snapshot(document), before);
  }
});

test("invalid geometry, stroke widths and transform factors leave the entire document unchanged", () => {
  const document = nestedDocument();
  const before = snapshot(document);
  const operations = [
    () => document.setAttribute("r", "width", "-1"),
    () => document.setAttribute("c", "r", "-1"),
    () => document.setAttribute("e", "rx", "Infinity"),
    () => document.setAttribute("l", "x1", "0x20"),
    () => document.setAttribute("t", "y", "NaN"),
    () => document.setAttribute("outer", "stroke-width", "-0.1"),
    () => document.setAttribute("t", "stroke-width", "1e309"),
    () => document.moveShape("outer", Number.POSITIVE_INFINITY, 0),
    () => document.moveShape("outer", 0, Number.NaN),
    () => document.scaleShape("outer", 0),
    () => document.scaleShape("outer", -1),
    () => document.scaleShape("outer", Number.POSITIVE_INFINITY),
  ];
  for (const operation of operations) {
    assert.throws(operation);
    assert.equal(snapshot(document), before);
  }
});

test("late descendant arithmetic overflow rolls back earlier valid descendants and both indexes", () => {
  for (const transform of [
    (document: SvgDocument) => document.moveShape("outer", 1e308, 0),
    (document: SvgDocument) => document.scaleShape("outer", 2),
  ]) {
    const document = nestedDocument();
    document.addShape(factory.create("rect", "overflow", ["1e308", "0", "1", "1"]), "outer");
    const before = snapshot(document);
    const first = document.findShape("r");
    const group = document.findShape("outer");
    assert.throws(() => transform(document));
    assert.equal(snapshot(document), before);
    assert.strictEqual(document.findShape("r"), first);
    assert.strictEqual(document.findShape("outer"), group);
    assert.strictEqual(document.parentOf("r"), document.findShape("inner"));
    assert.strictEqual(document.parentOf("overflow"), group);
  }
});

test("deleting a nested subtree preserves sibling order, unregisters descendants and frees all ids", () => {
  const document = nestedDocument();
  document.addShape(factory.create("g", "last", []));
  document.deleteShape("inner");
  assert.deepEqual(document.children.map((shape) => shape.id), ["outer", "last"]);
  assert.deepEqual(document.findShape("outer").children.map((shape) => shape.id), ["l", "t"]);
  for (const id of ["inner", "r", "c", "e"]) {
    assert.throws(() => document.findShape(id), { message: `no such shape: ${id}` });
    assert.throws(() => document.parentOf(id), { message: `no such shape: ${id}` });
    document.addShape(factory.create("g", id, []));
  }
  assert.deepEqual(document.children.map((shape) => shape.id), ["outer", "last", "inner", "r", "c", "e"]);
});
