import assert from "node:assert/strict";
import test from "node:test";
import { ShapeFactory } from "../src/application/ShapeFactory.js";
import { SvgDocument } from "../src/domain/SvgDocument.js";
import type { Shape } from "../src/domain/shapes/Shape.js";

const factory = new ShapeFactory();

function add(document: SvgDocument, id: string, parent?: string): void {
  document.addShape(factory.create("g", id, []), parent);
}

function ids(document: SvgDocument, parent?: string): string[] {
  return (parent === undefined ? document.children : document.findShape(parent).children).map((shape) => shape.id);
}

function state(document: SvgDocument): string {
  return JSON.stringify({
    width: document.width,
    height: document.height,
    nodes: document.children.flatMap((root) => root.walk()).map((shape) => ({
      id: shape.id, type: shape.type, parent: document.parentOf(shape.id)?.id,
      details: shape.details(), children: shape.children.map((child) => child.id),
    })),
  });
}

function nestedDocument(): SvgDocument {
  const document = new SvgDocument(640, 480);
  add(document, "before");
  add(document, "outer");
  add(document, "left", "outer");
  document.addShape(factory.create("rect", "a", ["1", "2", "3", "4", "red"]), "left");
  document.addShape(factory.create("text", "b", ["5", "6", "开始"]), "left");
  add(document, "middle", "outer");
  add(document, "right", "outer");
  document.addShape(factory.create("circle", "c", ["7", "8", "9"]), "right");
  document.addShape(factory.create("line", "d", ["10", "11", "12", "13", "black"]), "right");
  add(document, "after");
  return document;
}

function assertIndexes(document: SvgDocument): void {
  const seen = new Set<string>();
  function visit(shape: Shape, parent: Shape | undefined): void {
    assert.equal(seen.has(shape.id), false);
    seen.add(shape.id);
    assert.strictEqual(document.findShape(shape.id), shape);
    assert.strictEqual(document.parentOf(shape.id), parent);
    for (const child of shape.children) visit(child, shape);
  }
  for (const root of document.children) visit(root, undefined);
}

function assertRejectedWithoutMutation(document: SvgDocument, operation: () => unknown, message?: string): void {
  const before = state(document);
  const references = document.children.flatMap((root) => root.walk());
  if (message === undefined) assert.throws(operation);
  else assert.throws(operation, { message });
  assert.equal(state(document), before);
  for (const shape of references) assert.strictEqual(document.findShape(shape.id), shape);
  assertIndexes(document);
}

test("group uses original sibling order and the first selected slot regardless of argument order", () => {
  const document = new SvgDocument();
  for (const id of ["before", "a", "between", "b", "after"]) add(document, id);
  const group = document.groupShapes("selected", ["b", "a"]);
  assert.strictEqual(group, document.findShape("selected"));
  assert.deepEqual(ids(document), ["before", "selected", "between", "after"]);
  assert.deepEqual(ids(document, "selected"), ["a", "b"]);
  assert.equal(document.parentOf("selected"), undefined);
  assertIndexes(document);
});

test("group across parents uses their lowest common ancestor, original preorder and earliest affected slot", () => {
  const document = nestedDocument();
  const details = new Map(["a", "b", "c", "d"].map((id) => [id, document.findShape(id).details()]));
  document.groupShapes("picked", ["d", "b", "c"]);
  assert.deepEqual(ids(document), ["before", "outer", "after"]);
  assert.deepEqual(ids(document, "outer"), ["picked", "left", "middle", "right"]);
  assert.deepEqual(ids(document, "picked"), ["b", "c", "d"]);
  assert.deepEqual(ids(document, "left"), ["a"]);
  assert.deepEqual(ids(document, "right"), []);
  assert.equal(document.parentOf("picked")?.id, "outer");
  for (const [id, before] of details) assert.deepEqual(document.findShape(id).details(), before);
  assertIndexes(document);
});

test("group can gather a root and a deeply nested source at the canvas without dropping old empty parents", () => {
  const document = nestedDocument();
  document.groupShapes("gathered", ["d", "before"]);
  assert.deepEqual(ids(document), ["gathered", "outer", "after"]);
  assert.deepEqual(ids(document, "gathered"), ["before", "d"]);
  assert.deepEqual(ids(document, "right"), ["c"]);
  assert.equal(document.parentOf("gathered"), undefined);
  assertIndexes(document);
});

test("group of complete sibling subtrees retains descendants and never shares previously owned nodes", () => {
  const document = nestedDocument();
  const old = document.children.flatMap((root) => root.walk());
  const oldTrees = old.map((shape) => [shape, shape.children.map((child) => child.id)] as const);
  document.groupShapes("branches", ["right", "left"]);
  assert.deepEqual(ids(document, "outer"), ["branches", "middle"]);
  assert.deepEqual(ids(document, "branches"), ["left", "right"]);
  assert.deepEqual(ids(document, "left"), ["a", "b"]);
  assert.deepEqual(ids(document, "right"), ["c", "d"]);
  for (const [shape, children] of oldTrees) {
    assert.notStrictEqual(document.findShape(shape.id), shape);
    assert.deepEqual(shape.children.map((child) => child.id), children);
  }
  assertIndexes(document);
});

test("group rejects ancestor and descendant selections in either order and leaves the proposed id reusable", () => {
  const document = nestedDocument();
  for (const sources of [["outer", "a"], ["a", "outer"], ["left", "b"], ["b", "left"]]) {
    const ancestor = sources.includes("outer") ? "outer" : "left";
    assertRejectedWithoutMutation(document, () => document.groupShapes("candidate", sources),
      `cannot group a container into its own descendant: ${ancestor}`);
    assert.throws(() => document.findShape("candidate"), { message: "no such shape: candidate" });
  }
  document.groupShapes("candidate", ["a", "b"]);
  assert.deepEqual(ids(document, "candidate"), ["a", "b"]);
});

test("group validates all ids and source multiplicity before changing any tree or indexes", () => {
  const document = nestedDocument();
  for (const [newId, sources] of [
    ["candidate", []], ["candidate", ["a"]], ["candidate", ["a", "a"]],
    ["candidate", ["a", "b", "missing"]], ["a", ["b", "c"]],
    ["", ["a", "b"]], ["bad id", ["a", "b"]], ["bad\n", ["a", "b"]],
  ] as Array<[string, string[]]>) {
    assertRejectedWithoutMutation(document, () => document.groupShapes(newId, sources));
  }
  assert.throws(() => document.findShape("candidate"), /no such shape/);
  document.addShape(factory.create("g", "candidate", []));
  assertIndexes(document);
});

test("group ids preserve case and Unicode and remain globally unique at every depth", () => {
  const document = new SvgDocument();
  add(document, "A");
  add(document, "a");
  add(document, "节点");
  document.groupShapes("组合", ["a", "A"]);
  assert.deepEqual(ids(document, "组合"), ["A", "a"]);
  assertRejectedWithoutMutation(document, () => document.groupShapes("节点", ["A", "a"]), "id already exists: 节点");
  assertRejectedWithoutMutation(document, () => document.groupShapes("new", ["A", "组合"]),
    "cannot group a container into its own descendant: 组合");
});

test("ungroup promotes children at the exact nested slot, preserves properties and frees only the dissolved id", () => {
  const document = nestedDocument();
  document.setAttribute("outer", "fill", "blue");
  document.setAttribute("left", "fill", "orange");
  document.setAttribute("a", "stroke-width", "2.5");
  const before = new Map(["a", "b"].map((id) => [id, document.findShape(id).details()]));
  const promoted = document.ungroupShape("left");
  assert.deepEqual(promoted.map((shape) => shape.id), ["a", "b"]);
  assert.deepEqual(ids(document, "outer"), ["a", "b", "middle", "right"]);
  for (const shape of promoted) {
    assert.strictEqual(document.findShape(shape.id), shape);
    assert.equal(document.parentOf(shape.id)?.id, "outer");
    assert.deepEqual(shape.details(), before.get(shape.id));
  }
  assert.doesNotMatch(document.findShape("b").details().join("\n"), /fill=/);
  assert.match(document.findShape("outer").details().join("\n"), /fill=blue/);
  assert.throws(() => document.findShape("left"), { message: "no such shape: left" });
  document.addShape(factory.create("g", "left", []), "outer");
  assert.deepEqual(ids(document, "outer"), ["a", "b", "middle", "right", "left"]);
  assertIndexes(document);
});

test("ungroup supports nested groups and empty groups but rejects top-level groups, leaves and missing ids", () => {
  const document = nestedDocument();
  assertRejectedWithoutMutation(document, () => document.ungroupShape("outer"), "cannot ungroup top-level container: outer");
  assertRejectedWithoutMutation(document, () => document.ungroupShape("a"), "not a container: a");
  assertRejectedWithoutMutation(document, () => document.ungroupShape("missing"), "no such shape: missing");
  assert.deepEqual(document.ungroupShape("middle"), []);
  assert.deepEqual(ids(document, "outer"), ["left", "right"]);
  document.groupShapes("nested", ["right", "left"]);
  document.ungroupShape("nested");
  assert.deepEqual(ids(document, "outer"), ["left", "right"]);
  assert.equal(document.parentOf("a")?.id, "left");
  assertIndexes(document);
});

test("addto appends existing subtrees across parents and can reorder an existing child", () => {
  const document = nestedDocument();
  const before = document.findShape("left").walk().map((shape) => [shape.id, shape.details()] as const);
  const moved = document.addTo("right", "left");
  assert.strictEqual(moved, document.findShape("left"));
  assert.deepEqual(ids(document, "outer"), ["middle", "right"]);
  assert.deepEqual(ids(document, "right"), ["c", "d", "left"]);
  for (const [id, details] of before) assert.deepEqual(document.findShape(id).details(), details);
  document.addTo("right", "c");
  assert.deepEqual(ids(document, "right"), ["d", "left", "c"]);
  document.addTo("left", "before");
  assert.deepEqual(ids(document), ["outer", "after"]);
  assert.deepEqual(ids(document, "left"), ["a", "b", "before"]);
  assertIndexes(document);
});

test("addto validates targets and sources and rejects self or arbitrary-depth ancestor cycles atomically", () => {
  const document = nestedDocument();
  for (const [target, source, message] of [
    ["missing", "a", "no such container: missing"],
    ["a", "b", "not a container: a"],
    ["left", "missing", "no such shape: missing"],
    ["outer", "outer", "cannot add a container into its own descendant: outer"],
    ["left", "outer", "cannot add a container into its own descendant: outer"],
    ["left", "left", "cannot add a container into its own descendant: left"],
  ]) {
    assertRejectedWithoutMutation(document, () => document.addTo(target!, source!), message!);
  }
  add(document, "deep", "left");
  assertRejectedWithoutMutation(document, () => document.addTo("deep", "outer"),
    "cannot add a container into its own descendant: outer");
});

test("front paints last and back paints first within the original siblings while preserving subtrees", () => {
  const document = nestedDocument();
  document.bringToFront("before");
  assert.deepEqual(ids(document), ["outer", "after", "before"]);
  document.sendToBack("before");
  assert.deepEqual(ids(document), ["before", "outer", "after"]);
  const subtree = document.findShape("left").walk().map((shape) => [shape.id, shape.details()] as const);
  document.bringToFront("left");
  assert.deepEqual(ids(document, "outer"), ["middle", "right", "left"]);
  assert.deepEqual(ids(document, "right"), ["c", "d"]);
  document.sendToBack("left");
  assert.deepEqual(ids(document, "outer"), ["left", "middle", "right"]);
  for (const [id, details] of subtree) assert.deepEqual(document.findShape(id).details(), details);
  assertRejectedWithoutMutation(document, () => document.bringToFront("missing"), "no such shape: missing");
  assertRejectedWithoutMutation(document, () => document.sendToBack("missing"), "no such shape: missing");
  assertIndexes(document);
});

test("hierarchy rewrites retain document mutation authority for subsequent insertion, editing, deletion and cloning", () => {
  const document = nestedDocument();
  document.groupShapes("joined", ["b", "d"]);
  document.addTo("joined", "left");
  document.sendToBack("joined");
  document.bringToFront("a");
  document.addShape(factory.create("text", "new", ["0", "0", "新节点"]), "left");
  document.moveShape("joined", 10, -2);
  document.setAttribute("joined", "stroke", "green");
  document.scaleShape("left", 2);
  assert.match(document.findShape("a").details().join("\n"), /^x=22 y=0 width=6 height=8/);
  document.ungroupShape("joined");
  document.deleteShape("left");
  for (const id of ["left", "a", "new", "joined"]) assert.throws(() => document.findShape(id), /no such shape/);
  assertIndexes(document);
  assert.equal(state(document.clone()), state(document));
});

test("withChildren returns an independent detached group, preserves styles and cannot bypass document ownership", () => {
  const document = nestedDocument();
  document.setAttribute("left", "fill", "blue");
  document.setAttribute("left", "stroke-width", "2");
  const original = document.findShape("left");
  const before = state(document);
  const detached = factory.create("g", "replacement", []);
  detached.appendChild(factory.create("text", "label", ["1", "2", "替代"]));
  const copy = original.withChildren([detached]);
  assert.equal(state(document), before);
  assert.notStrictEqual(copy, original);
  assert.deepEqual(copy.details(), original.details());
  assert.deepEqual(copy.children.map((child) => child.id), ["replacement"]);
  for (const shape of copy.walk()) shape.assertDetached();
  const independent = new SvgDocument();
  independent.addShape(copy);
  independent.addShape(factory.create("g", "extra", []), "left");
  assert.equal(state(document), before);
  assert.throws(() => original.appendChild(factory.create("g", "intruder", [])));
  assert.throws(() => original.replaceChild("a", undefined));
  assert.throws(() => original.withChildren([document.findShape("a")]));
  assertIndexes(document);
});

test("each successful hierarchy operation publishes fresh nodes without mutating previously retained trees", () => {
  for (const operation of [
    (document: SvgDocument) => document.groupShapes("joined", ["b", "d"]),
    (document: SvgDocument) => document.ungroupShape("left"),
    (document: SvgDocument) => document.addTo("right", "left"),
    (document: SvgDocument) => document.bringToFront("left"),
    (document: SvgDocument) => document.sendToBack("right"),
  ]) {
    const document = nestedDocument();
    const retained = document.children.flatMap((root) => root.walk());
    const before = retained.map((shape) => [shape.id, shape.children.map((child) => child.id)]);
    operation(document);
    const current = document.children.flatMap((root) => root.walk());
    for (const shape of current) assert.equal(retained.includes(shape), false);
    assert.deepEqual(retained.map((shape) => [shape.id, shape.children.map((child) => child.id)]), before);
    assertIndexes(document);
  }
});
