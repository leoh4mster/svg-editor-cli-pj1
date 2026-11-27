import assert from "node:assert/strict";
import test from "node:test";
import { ModifiedStar } from "../plugins/tree-star/ModifiedStar.js";
import { EditorSession } from "../src/application/EditorSession.js";
import { Group, Rect, SvgDocument } from "../src/extensions/index.js";

test("edit, save, edit, undo to save point and redo recompute labels from content", () => {
  const session = new EditorSession();
  const star = new ModifiedStar();
  const labels = () => star.labels(session.requireDocument(), session.savedSnapshot());
  session.initialize();
  assert.equal(labels().size, 0);
  session.executeEdit(doc => {
    doc.addShape(new Group("g"));
    doc.addShape(new Rect("r", 0, 0, 2, 3), "g");
    return "create";
  });
  assert.deepEqual(new Set(labels().keys()), new Set(["g", "r", undefined]));
  session.markSaved("save.svg");
  assert.equal(labels().size, 0);
  session.executeEdit(doc => { doc.setAttribute("r", "fill", "red"); return "fill"; });
  const retained = labels();
  assert.deepEqual(new Set(retained.keys()), new Set(["g", "r", undefined]));
  session.undo(); assert.equal(labels().size, 0);
  assert.equal(retained.size, 3);
  session.redo(); assert.equal(labels().size, 3);
  session.executeEdit(() => "noop"); assert.equal(labels().size, 3);
  session.undo(); session.undo(); assert.equal(labels().size, 0);
});

test("deleting, reparenting and reordering propagate to affected ancestors without marking untouched siblings", () => {
  const doc = new SvgDocument();
  doc.addShape(new Group("a")); doc.addShape(new Group("b"));
  doc.addShape(new Rect("r", 0, 0, 1, 1), "a");
  doc.addShape(new Rect("s", 0, 0, 1, 1), "b");
  const saved = doc.clone();
  const star = new ModifiedStar();
  doc.addTo("b", "r");
  assert.deepEqual(new Set(star.labels(doc, saved).keys()), new Set(["a","b","r",undefined]));
  doc.deleteShape("r");
  assert.deepEqual(new Set(star.labels(doc, saved).keys()), new Set(["a",undefined]));
  doc.bringToFront("a");
  assert.ok(star.labels(doc, saved).has(undefined));
  const reordered = saved.clone();
  reordered.bringToFront("a");
  assert.deepEqual([...star.labels(reordered, saved).keys()], [undefined]);
});

test("root-only changes, empty saved document and separate instances do not leak state", () => {
  const doc = new SvgDocument();
  const saved = doc.clone();
  const first = new ModifiedStar(), second = new ModifiedStar();
  assert.deepEqual([...first.labels(doc, undefined)], [[undefined, "*"]]);
  assert.equal(second.labels(doc, saved).size, 0);
  doc.resize(400, 300);
  assert.deepEqual([...first.labels(doc, saved)], [[undefined, "*"]]);
  assert.equal(first.labels(saved, saved).size, 0);
});

test("attribute insertion order does not count as a content edit", () => {
  const doc = new SvgDocument();
  doc.addShape(new Rect("r",0,0,1,1).withExtraAttributes(new Map([["data-b","2"],["data-a","1"]])));
  const saved = new SvgDocument();
  saved.addShape(new Rect("r",0,0,1,1).withExtraAttributes(new Map([["data-a","1"],["data-b","2"]])));
  assert.equal(new ModifiedStar().labels(doc,saved).size, 0);
});
