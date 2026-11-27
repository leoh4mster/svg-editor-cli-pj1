import assert from "node:assert/strict";
import test from "node:test";
import { EditorSession } from "../src/application/EditorSession.js";
import { Group, Rect, Text } from "../src/extensions/index.js";
import { BoxProvider } from "../plugins/box/BoxProvider.js";
import { BoxAttributes } from "../plugins/box/BoxAttributes.js";
import { BoxTypeLabel } from "../plugins/box/BoxTypeLabel.js";

const provider = new BoxProvider();
const args = ["120", "100", "160", "60", "开始"];

test("box template preserves subtype and positions through cloning, moving and scaling", () => {
  const box = provider.create("n", args);
  assert.equal(box.creationSummary, "box#n created (g#n + rect#n-rect + text#n-label)");
  assert.equal(box.children[0]!.svgAttributes.get("fill"), "#4a90d9");
  assert.equal(box.children[1]!.summary(), 'text#n-label (140,135) "开始"');
  const scaled = box.clone().moved(10, 20).scaled(2);
  assert.equal(scaled.type, "box");
  assert.equal(scaled.children[1]!.summary(), 'text#n-label (300,310) "开始"');
  assert.equal(scaled.svgAttributes.get("data-kind"), "box");
  for (const bad of [args.slice(0, 4), [...args, "extra"], ["x", ...args.slice(1)], ["1","2","-1","1","t"]]) {
    assert.throws(() => provider.create("n", bad));
  }
});

test("required parts survive failed reparent, regroup and delete; optional children and whole boxes remain editable", () => {
  const session = new EditorSession();
  const doc = session.initialize();
  doc.addShape(provider.create("a", args));
  doc.addShape(provider.create("b", args), "a");
  doc.addShape(new Text("note", 0, 0, ""), "a");
  const tree = () => doc.children.flatMap(n => n.walk().map(s => [s.type, s.id, doc.parentOf(s.id)?.id]));
  const before = tree();
  for (const change of [() => doc.deleteShape("a-label"), () => doc.addTo("b", "a-rect"),
    () => doc.groupShapes(new Group("g"), ["a-label","note"]),
    () => doc.ungroupShape("a"), () => doc.ungroupShape("b")]) {
    assert.throws(change, /requires direct child|cannot ungroup composite shape/);
    assert.deepEqual(tree(), before);
  }
  assert.deepEqual([...new BoxTypeLabel().labels(doc)], [["a", "(box)"], ["b", "(box)"]]);
  doc.addTo("b", "note");
  doc.deleteShape("b");
  assert.deepEqual(doc.findShape("a").children.map(c => c.id), ["a-rect", "a-label"]);
});

test("derived ids are checked against existing ids before inserting any part", () => {
  for (const id of ["a", "a-rect", "a-label"]) {
    const doc = new EditorSession().initialize();
    doc.addShape(new Text(id, 0, 0, ""));
    assert.throws(() => doc.addShape(provider.create("a", args)), /id already exists/);
    assert.deepEqual(doc.children.map(c => c.id), [id]);
  }
});

test("each forwarded attribute is a single reversible edit; deleting the container is also reversible", () => {
  const session = new EditorSession();
  session.initialize().addShape(provider.create("a", args));
  const attributes = new BoxAttributes();
  const get = () => session.requireDocument();
  const fill = () => get().findShape("a-rect").svgAttributes.get("fill");
  const label = () => get().findShape("a-label").textContent;
  assert.equal(attributes.handles(get().findShape("a-rect"), "label"), false);
  session.executeEdit(d => attributes.apply(d, d.findShape("a"), "fill", "red"));
  assert.equal(fill(), "red");
  assert.equal(get().findShape("a").svgAttributes.get("fill"), undefined);
  session.undo(); assert.equal(fill(), "#4a90d9");
  session.redo(); assert.equal(fill(), "red");
  session.executeEdit(d => attributes.apply(d, d.findShape("a"), "label", "第二步"));
  assert.equal(label(), "第二步");
  session.undo(); assert.equal(label(), "开始"); assert.equal(fill(), "red");
  session.redo(); assert.equal(label(), "第二步");
  session.executeEdit(d => { d.deleteShape("a"); return "delete"; });
  assert.equal(get().children.length, 0);
  session.undo(); assert.equal(label(), "第二步");
});

test("provider validates direct typed parts while preserving imported order and appearance", () => {
  const attrs = new Map([["id","a"],["fill","gold"],["stroke-width","2px"],["data-owner","A"]]);
  const rect = new Rect("a-rect", 0, 0, 5, 5);
  const title = new Text("a-label", 1, 2, "Imported");
  for (const children of [[rect], [new Text("a-rect", 0, 0, ""), title], [rect, new Rect("a-label", 0, 0, 1, 1)]]) {
    assert.throws(() => provider.read("a", attrs, "", () => children), /requires direct child/);
  }
  const box = provider.read("a", attrs, "", () => [title, rect]);
  assert.deepEqual(box.children.map(c => c.id), ["a-label","a-rect"]);
  assert.equal(box.svgAttributes.get("fill"), "gold");
  assert.equal(box.svgAttributes.get("stroke-width"), "2");
  assert.equal(box.svgAttributes.get("data-owner"), "A");
});
