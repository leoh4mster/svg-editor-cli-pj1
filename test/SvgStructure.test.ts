import assert from "node:assert/strict";
import test from "node:test";
import { EditorSession } from "../src/application/EditorSession.js";
import { ShapeFactory } from "../src/application/ShapeFactory.js";
import { SvgDocument } from "../src/domain/SvgDocument.js";

const factory = new ShapeFactory();

test("document insertion preserves root and nested order and finds shapes at every depth", () => {
  const document = new SvgDocument();
  const first = factory.create("g", "outer", []);
  const nested = factory.create("g", "inner", []);
  const rect = factory.create("rect", "r1", ["1", "2", "3", "4"]);
  const circle = factory.create("circle", "c1", ["5", "6", "7"]);
  document.addShape(first);
  document.addShape(nested, "outer");
  document.addShape(rect, "inner");
  document.addShape(circle);
  assert.deepEqual(document.children, [first, circle]);
  assert.deepEqual(first.children, [nested]);
  assert.deepEqual(nested.children, [rect]);
  assert.deepEqual([...first.walk()], [first, nested, rect]);
  assert.strictEqual(document.findShape("r1"), rect);
  assert.strictEqual(document.parentOf("r1"), nested);
  assert.strictEqual(document.parentOf("inner"), first);
  assert.equal(document.parentOf("outer"), undefined);
  assert.equal(document.parentOf("c1"), undefined);
});

test("global id collisions reject a whole subtree without reserving any new ids", () => {
  const document = new SvgDocument();
  const outer = factory.create("g", "outer", []);
  document.addShape(outer);
  document.addShape(factory.create("circle", "shared", ["0", "0", "1"]), "outer");
  const rejected = factory.create("g", "candidate", []);
  rejected.appendChild(factory.create("rect", "shared", ["0", "0", "1", "1"]));
  assert.throws(() => document.addShape(rejected), { message: "id already exists: shared" });
  assert.deepEqual(document.children, [outer]);
  assert.throws(() => document.findShape("candidate"), { message: "no such shape: candidate" });
  const replacement = factory.create("g", "candidate", []);
  document.addShape(replacement);
  assert.strictEqual(document.findShape("candidate"), replacement);
  assert.throws(() => document.addShape(factory.create("g", "shared", []), "candidate"), {
    message: "id already exists: shared",
  });
  assert.deepEqual(replacement.children, []);
});

test("duplicate ids within a detached subtree are rejected atomically", () => {
  const document = new SvgDocument();
  const root = factory.create("g", "root", []);
  const nested = factory.create("g", "nested", []);
  root.appendChild(nested);
  nested.appendChild(factory.create("circle", "root", ["0", "0", "1"]));
  assert.throws(() => document.addShape(root), { message: "id already exists: root" });
  assert.deepEqual(document.children, []);
  document.addShape(factory.create("g", "root", []));
  assert.equal(document.findShape("root").type, "g");
});

test("invalid parent targets leave topology unchanged and the proposed id available", () => {
  const document = new SvgDocument();
  const leaf = factory.create("rect", "leaf", ["0", "0", "1", "1"]);
  document.addShape(leaf);
  const child = factory.create("g", "child", []);
  assert.throws(() => document.addShape(child, "missing"), { message: "no such container: missing" });
  assert.throws(() => document.addShape(child, "leaf"), { message: "not a container: leaf" });
  assert.deepEqual(document.children, [leaf]);
  assert.deepEqual(leaf.children, []);
  document.addShape(child);
  assert.strictEqual(document.findShape("child"), child);
  assert.throws(() => document.findShape("Missing"), { message: "no such shape: Missing" });
});

test("child collection views cannot mutate root or nested document topology", () => {
  const document = new SvgDocument();
  const group = factory.create("g", "group", []);
  const child = factory.create("g", "child", []);
  document.addShape(group);
  document.addShape(child, "group");
  const roots = [...document.children];
  roots.length = 0;
  assert.deepEqual(document.children, [group]);
  const children = [...group.children];
  children.length = 0;
  assert.deepEqual(group.children, [child]);
  // Callers can use JavaScript casts: a readonly annotation alone is insufficient.
  const rootView = document.children as Array<typeof group>;
  const childView = group.children as Array<typeof child>;
  try { rootView.length = 0; } catch { /* A frozen view is also valid. */ }
  try { childView.length = 0; } catch { /* A frozen view is also valid. */ }
  assert.deepEqual(document.children, [group]);
  assert.deepEqual(group.children, [child]);
});

test("ids are globally case sensitive and init replaces the complete shape tree", () => {
  const session = new EditorSession();
  const original = session.initialize();
  original.addShape(factory.create("g", "A", []));
  original.addShape(factory.create("g", "a", []), "A");
  assert.equal(original.findShape("A").id, "A");
  assert.equal(original.findShape("a").id, "a");
  const replacement = session.initialize(400, 300);
  assert.notStrictEqual(replacement, original);
  assert.deepEqual(replacement.children, []);
  assert.throws(() => replacement.findShape("a"), /no such shape/);
  replacement.addShape(factory.create("g", "A", []));
  assert.equal(replacement.findShape("A").id, "A");
});

test("document-owned containers reject direct insertion while the document retains sole mutation authority", () => {
  const document = new SvgDocument();
  const group = factory.create("g", "group", []);
  const original = factory.create("circle", "original", ["0", "0", "1"]);
  document.addShape(group);
  document.addShape(original, "group");
  const proposed = factory.create("g", "candidate", []);
  assert.throws(() => group.appendChild(proposed));
  assert.deepEqual(document.children, [group]);
  assert.deepEqual(group.children, [original]);
  assert.strictEqual(document.findShape("original"), original);
  assert.strictEqual(document.parentOf("original"), group);
  assert.throws(() => document.findShape("candidate"), { message: "no such shape: candidate" });
  document.addShape(proposed, "group");
  assert.deepEqual(group.children, [original, proposed]);
  assert.strictEqual(document.findShape("candidate"), proposed);
  assert.strictEqual(document.parentOf("candidate"), group);
});

test("owned roots and descendants cannot be shared across documents or grafted onto a detached group", () => {
  const first = new SvgDocument();
  const second = new SvgDocument();
  const root = factory.create("g", "root", []);
  const nested = factory.create("g", "nested", []);
  const child = factory.create("text", "label", ["1", "2", "开始"]);
  nested.appendChild(child);
  root.appendChild(nested);
  first.addShape(root);
  const other = factory.create("g", "other", []);
  second.addShape(other);
  const detached = factory.create("g", "detached", []);
  for (const owned of [root, nested, child]) {
    assert.throws(() => second.addShape(owned));
    assert.throws(() => second.addShape(owned, "other"));
    assert.throws(() => detached.appendChild(owned));
    assert.deepEqual(second.children, [other]);
    assert.deepEqual(other.children, []);
    assert.deepEqual(detached.children, []);
    assert.throws(() => second.findShape(owned.id), { message: `no such shape: ${owned.id}` });
  }
  assert.deepEqual(first.children, [root]);
  assert.deepEqual(root.children, [nested]);
  assert.deepEqual(nested.children, [child]);
  assert.strictEqual(first.findShape("root"), root);
  assert.strictEqual(first.findShape("nested"), nested);
  assert.strictEqual(first.findShape("label"), child);
  assert.strictEqual(first.parentOf("nested"), root);
  assert.strictEqual(first.parentOf("label"), nested);
  const fresh = factory.create("circle", "fresh", ["0", "0", "1"]);
  detached.appendChild(fresh);
  second.addShape(detached, "other");
  assert.strictEqual(second.findShape("fresh"), fresh);
  assert.strictEqual(second.parentOf("fresh"), detached);
  assert.strictEqual(second.parentOf("detached"), other);
});

test("detached groups reject self and ancestor cycles before changing either subtree", () => {
  const root = factory.create("g", "root", []);
  const nested = factory.create("g", "nested", []);
  const child = factory.create("circle", "child", ["0", "0", "1"]);
  root.appendChild(nested);
  nested.appendChild(child);
  assert.throws(() => root.appendChild(root));
  assert.throws(() => nested.appendChild(root));
  assert.throws(() => nested.appendChild(nested));
  assert.deepEqual(root.children, [nested]);
  assert.deepEqual(nested.children, [child]);
  assert.deepEqual(root.walk(), [root, nested, child]);
  const document = new SvgDocument();
  document.addShape(root);
  assert.strictEqual(document.findShape("child"), child);
  assert.strictEqual(document.parentOf("child"), nested);
});
