import assert from "node:assert/strict";
import test from "node:test";
import { StatsCommand } from "../plugins/stats/StatsCommand.js";
import { EditorSession } from "../src/application/EditorSession.js";
import { Group, Rect, Text } from "../src/extensions/index.js";

test("stats distinguishes a missing document, an empty canvas and invalid arguments", () => {
  const stats = new StatsCommand();
  const session = new EditorSession();
  assert.throws(() => stats.execute([], session), /no document/);
  session.initialize();
  assert.equal(stats.execute([], session), "(total 0, containers 0)");
  assert.throws(() => stats.execute(["extra"], session), /usage: stats/);
});

test("stats uses preorder, counts custom containers and preserves an existing redo branch", () => {
  class Composite extends Group {
    override get type(): string { return "sample-container"; }
    protected override emptyCopy(): Group { return new Composite(this.id); }
  }
  const session = new EditorSession();
  session.initialize();
  session.executeEdit(doc => {
    doc.addShape(new Group("outer"));
    doc.addShape(new Composite("inner"), "outer");
    doc.addShape(new Text("title", 0, 0, "A"), "inner");
    doc.addShape(new Rect("r", 0, 0, 2, 1));
    doc.addShape(new Text("caption", 1, 1, "B"));
    return "setup";
  });
  session.executeEdit(doc => { doc.deleteShape("outer"); return "delete"; });
  session.undo();
  const stats = new StatsCommand();
  assert.equal(stats.execute([], session), "text: 2  rect: 1  (total 3, containers 2)");
  session.redo();
  assert.equal(stats.execute([], session), "rect: 1  text: 1  (total 2, containers 0)");
});
