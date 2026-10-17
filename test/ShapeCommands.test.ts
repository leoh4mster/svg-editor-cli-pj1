import assert from "node:assert/strict";
import test from "node:test";
import { EditorSession } from "../src/application/EditorSession.js";
import { ShapeFactory } from "../src/application/ShapeFactory.js";
import { CreateCommand } from "../src/application/commands/CreateCommand.js";
import { ShowCommand } from "../src/application/commands/ShowCommand.js";
import { TreeCommand } from "../src/application/commands/TreeCommand.js";

const create = new CreateCommand(new ShapeFactory());
const tree = new TreeCommand();
const show = new ShowCommand();

test("create returns the required feedback and supports all six types within nested groups", () => {
  const session = new EditorSession();
  session.initialize();
  assert.equal(create.execute(["g", "outer"], session), "g#outer created");
  assert.equal(create.execute(["g", "inner", "in", "outer"], session), "g#inner created in g#outer");
  const cases: Array<[string, string, string[]]> = [
    ["rect", "r", ["1", "2", "3", "4", "#ffffff"]],
    ["circle", "c", ["5", "6", "7", "red"]],
    ["ellipse", "e", ["8", "9", "10", "11"]],
    ["line", "l", ["1", "2", "3", "4", "black"]],
    ["text", "t", ["12", "13", "开始 处理数据"]],
  ];
  for (const [type, id, args] of cases) {
    assert.equal(create.execute([type, id, ...args, "in", "inner"], session), `${type}#${id} created in g#inner`);
    assert.equal(session.requireDocument().parentOf(id)?.id, "inner");
  }
  assert.deepEqual(session.requireDocument().findShape("inner").children.map((shape) => shape.id), ["r", "c", "e", "l", "t"]);
});

test("the word in remains valid as an id, text content, and optional appearance value", () => {
  const session = new EditorSession();
  session.initialize();
  assert.equal(create.execute(["g", "in"], session), "g#in created");
  assert.equal(create.execute(["text", "word", "1", "2", "in"], session), "text#word created");
  assert.equal(create.execute(["text", "nested", "1", "2", "in", "in", "in"], session), "text#nested created in g#in");
  assert.equal(create.execute(["rect", "paint", "0", "0", "1", "1", "in"], session), "rect#paint created");
  assert.equal(create.execute(["rect", "nested-paint", "0", "0", "1", "1", "in", "in", "in"], session), "rect#nested-paint created in g#in");
  assert.match(show.execute(["word"], session), /text="in"/);
  assert.match(show.execute(["nested"], session), /parent=g#in/);
  assert.match(show.execute(["paint"], session), /fill=in/);
  assert.match(show.execute(["nested-paint"], session), /fill=in/);
});

test("new shape and display commands require a document", () => {
  const session = new EditorSession();
  for (const operation of [
    () => create.execute(["g", "root"], session),
    () => tree.execute([], session),
    () => tree.execute(["root"], session),
    () => show.execute(["root"], session),
  ]) {
    assert.throws(operation, { message: "no document. use 'init' or 'read' first" });
  }
});

test("failed create calls never alter the tree or leave a reserved ghost id", () => {
  const session = new EditorSession();
  session.initialize();
  create.execute(["g", "parent"], session);
  create.execute(["rect", "leaf", "0", "0", "1", "1", "in", "parent"], session);
  const before = tree.execute([], session);
  const failures = [
    ["rect", "candidate", "0", "0", "-1", "1"],
    ["rect", "candidate", "0", "0", "1"],
    ["rect", "candidate", "0", "0", "1", "1", "red", "extra"],
    ["g", "candidate", "in", "missing"],
    ["g", "candidate", "in", "leaf"],
    ["g", "candidate", "in"],
    ["g", "leaf"],
    ["box", "candidate", "0", "0", "1", "1", "title"],
    ["g", ""],
  ];
  for (const args of failures) {
    assert.throws(() => create.execute(args, session));
    assert.equal(tree.execute([], session), before);
    assert.throws(() => session.requireDocument().findShape("candidate"), /no such shape/);
  }
  assert.equal(create.execute(["g", "candidate", "in", "parent"], session), "g#candidate created in g#parent");
});

test("create reports exact duplicate, container, and unknown-type errors", () => {
  const session = new EditorSession();
  session.initialize();
  create.execute(["g", "parent"], session);
  create.execute(["circle", "leaf", "0", "0", "1", "in", "parent"], session);
  for (const [args, message] of [
    [["g", "leaf"], "id already exists: leaf"],
    [["g", "child", "in", "missing"], "no such container: missing"],
    [["g", "child", "in", "leaf"], "not a container: leaf"],
    [["box", "child"], "unknown shape type: box (is the plugin loaded?)"],
  ] as const) {
    assert.throws(() => create.execute(args, session), { message });
  }
});

test("tree shows ordered hierarchy with geometry, correct branches, and scoped subtrees", () => {
  const session = new EditorSession();
  session.initialize();
  create.execute(["rect", "bg", "0", "0", "800", "600", "#ffffff"], session);
  create.execute(["g", "flow"], session);
  create.execute(["g", "node", "in", "flow"], session);
  create.execute(["rect", "start", "120", "100", "160", "60", "#4a90d9", "in", "node"], session);
  create.execute(["text", "title", "155", "135", "开始", "in", "node"], session);
  create.execute(["circle", "dot", "-1.5", "2.25", "0", "in", "flow"], session);
  assert.equal(tree.execute([], session), [
    "svg (800x600)",
    "├── rect#bg x=0 y=0 w=800 h=600 fill=#ffffff",
    "└── g#flow",
    "    ├── g#node",
    "    │   ├── rect#start x=120 y=100 w=160 h=60 fill=#4a90d9",
    '    │   └── text#title (155,135) "开始"',
    "    └── circle#dot cx=-1.5 cy=2.25 r=0",
  ].join("\n"));
  assert.equal(tree.execute(["node"], session), [
    "g#node",
    "├── rect#start x=120 y=100 w=160 h=60 fill=#4a90d9",
    '└── text#title (155,135) "开始"',
  ].join("\n"));
  assert.equal(tree.execute(["dot"], session), "circle#dot cx=-1.5 cy=2.25 r=0");
  session.resizeCanvas(900.5, 700.25);
  assert.match(tree.execute([], session), /^svg \(900.5x700.25\)\n/);
});

test("show uses canonical attributes, actual parents, and explicitly supplied styles", () => {
  const session = new EditorSession();
  session.initialize();
  create.execute(["g", "markers"], session);
  create.execute(["rect", "r", "1", "2", "3", "4", "#eee", "in", "markers"], session);
  create.execute(["circle", "c", "100", "100", "20"], session);
  create.execute(["text", "empty", "0", "0", "", "in", "markers"], session);
  assert.equal(show.execute(["r"], session), [
    "rect#r  parent=g#markers",
    "  x=1 y=2 width=3 height=4",
    "  fill=#eee",
  ].join("\n"));
  assert.equal(show.execute(["c"], session), [
    "circle#c  parent=svg",
    "  cx=100 cy=100 r=20",
  ].join("\n"));
  assert.equal(show.execute(["markers"], session), "g#markers  parent=svg");
  assert.match(show.execute(["empty"], session), /  text=""$/);
  assert.doesNotMatch(show.execute(["c"], session), /(?:fill=black|stroke=none)/);
});

test("display argument and lookup failures preserve all document contents", () => {
  const session = new EditorSession();
  session.initialize();
  create.execute(["g", "root"], session);
  const before = tree.execute([], session);
  assert.throws(() => tree.execute(["root", "extra"], session), /usage: tree/);
  assert.throws(() => show.execute([], session), /usage: show/);
  assert.throws(() => show.execute(["root", "extra"], session), /usage: show/);
  assert.throws(() => tree.execute(["missing"], session), { message: "no such shape: missing" });
  assert.throws(() => show.execute(["missing"], session), { message: "no such shape: missing" });
  assert.equal(tree.execute([], session), before);
});
