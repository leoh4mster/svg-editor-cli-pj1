import assert from "node:assert/strict";
import test from "node:test";
import { EditorSession } from "../src/application/EditorSession.js";
import { ShapeFactory } from "../src/application/ShapeFactory.js";
import { AddToCommand } from "../src/application/commands/AddToCommand.js";
import { BackCommand } from "../src/application/commands/BackCommand.js";
import { CanvasCommand } from "../src/application/commands/CanvasCommand.js";
import { FrontCommand } from "../src/application/commands/FrontCommand.js";
import { GroupCommand } from "../src/application/commands/GroupCommand.js";
import { MoveCommand } from "../src/application/commands/MoveCommand.js";
import { RedoCommand } from "../src/application/commands/RedoCommand.js";
import { SetCommand } from "../src/application/commands/SetCommand.js";
import { ShowCommand } from "../src/application/commands/ShowCommand.js";
import { TreeCommand } from "../src/application/commands/TreeCommand.js";
import { UndoCommand } from "../src/application/commands/UndoCommand.js";
import { UngroupCommand } from "../src/application/commands/UngroupCommand.js";

const factory = new ShapeFactory();
const group = new GroupCommand();
const ungroup = new UngroupCommand();
const addto = new AddToCommand();
const front = new FrontCommand();
const back = new BackCommand();
const undo = new UndoCommand();
const redo = new RedoCommand();
const move = new MoveCommand();
const set = new SetCommand();
const tree = new TreeCommand();
const show = new ShowCommand();
const canvas = new CanvasCommand();

function sessionWithTree(): EditorSession {
  const session = new EditorSession();
  const document = session.initialize();
  document.addShape(factory.create("g", "before", []));
  document.addShape(factory.create("g", "outer", []));
  document.addShape(factory.create("g", "left", []), "outer");
  document.addShape(factory.create("rect", "a", ["1", "2", "3", "4", "red"]), "left");
  document.addShape(factory.create("text", "b", ["5", "6", "开始"]), "left");
  document.addShape(factory.create("g", "right", []), "outer");
  document.addShape(factory.create("circle", "c", ["7", "8", "9"]), "right");
  document.addShape(factory.create("g", "after", []));
  document.setAttribute("outer", "fill", "blue");
  document.setAttribute("left", "fill", "orange");
  document.setAttribute("a", "stroke-width", "2.5");
  return session;
}

function state(session: EditorSession): string {
  const document = session.requireDocument();
  return JSON.stringify({
    tree: tree.execute([], session),
    nodes: document.children.flatMap((root) => root.walk()).map((shape) => ({
      show: show.execute([shape.id], session), parent: document.parentOf(shape.id)?.id,
    })),
  });
}

test("all five hierarchy commands form one symmetric undo unit including every parent, order and attribute", () => {
  for (const edit of [
    (session: EditorSession) => group.execute(["joined", "c", "a", "b"], session),
    (session: EditorSession) => ungroup.execute(["left"], session),
    (session: EditorSession) => addto.execute(["right", "left"], session),
    (session: EditorSession) => front.execute(["left"], session),
    (session: EditorSession) => back.execute(["right"], session),
  ]) {
    const session = sessionWithTree();
    const before = state(session);
    const summary = edit(session);
    const after = state(session);
    assert.notEqual(after, before);
    for (let count = 0; count < 3; count += 1) {
      assert.equal(undo.execute([], session), `undone: ${summary}`);
      assert.equal(state(session), before);
      assert.throws(() => undo.execute([], session), { message: "nothing to undo" });
      assert.equal(redo.execute([], session), `redone: ${summary}`);
      assert.equal(state(session), after);
      assert.throws(() => redo.execute([], session), { message: "nothing to redo" });
    }
  }
});

test("hierarchy success feedback describes group size, promoted children, destination and layer direction", () => {
  const session = sessionWithTree();
  assert.equal(group.execute(["joined", "b", "a"], session), "g#joined created with 2 children");
  assert.equal(ungroup.execute(["joined"], session), "g#joined ungrouped (2 children promoted)");
  assert.equal(addto.execute(["right", "a"], session), "rect#a moved into g#right");
  assert.equal(front.execute(["a"], session), "rect#a brought to front");
  assert.equal(back.execute(["a"], session), "rect#a sent to back");
});

test("hierarchy validation and malformed arguments preserve the current document object and the redo branch", () => {
  const session = sessionWithTree();
  const summary = move.execute(["outer", "10", "20"], session);
  const after = state(session);
  undo.execute([], session);
  const before = state(session);
  const original = session.requireDocument();
  const failures = [
    () => group.execute(["candidate", "a", "b", "missing"], session),
    () => group.execute(["candidate", "a", "a"], session),
    () => group.execute(["a", "b", "c"], session),
    () => group.execute(["candidate", "a", "outer"], session),
    () => group.execute(["bad id", "a", "b"], session),
    () => group.execute([], session),
    () => group.execute(["candidate", "a"], session),
    () => ungroup.execute(["outer"], session),
    () => ungroup.execute(["a"], session),
    () => ungroup.execute(["missing"], session),
    () => ungroup.execute([], session),
    () => ungroup.execute(["left", "extra"], session),
    () => addto.execute(["left", "outer"], session),
    () => addto.execute(["left", "left"], session),
    () => addto.execute(["a", "b"], session),
    () => addto.execute(["missing", "a"], session),
    () => addto.execute(["left", "missing"], session),
    () => addto.execute(["left"], session),
    () => addto.execute(["left", "a", "extra"], session),
    () => front.execute(["missing"], session),
    () => front.execute([], session),
    () => front.execute(["a", "extra"], session),
    () => back.execute(["missing"], session),
    () => back.execute([], session),
    () => back.execute(["a", "extra"], session),
  ];
  for (const fail of failures) {
    assert.throws(fail);
    assert.strictEqual(session.requireDocument(), original);
    assert.equal(state(session), before);
  }
  assert.throws(() => session.requireDocument().findShape("candidate"), /no such shape/);
  assert.equal(redo.execute([], session), `redone: ${summary}`);
  assert.equal(state(session), after);
});

test("each successful hierarchy edit clears redo even when moving the sole or already-last sibling", () => {
  for (const edit of [
    (session: EditorSession) => group.execute(["joined", "a", "b"], session),
    (session: EditorSession) => ungroup.execute(["left"], session),
    (session: EditorSession) => addto.execute(["right", "c"], session),
    (session: EditorSession) => front.execute(["c"], session),
    (session: EditorSession) => back.execute(["before"], session),
  ]) {
    const session = sessionWithTree();
    move.execute(["outer", "10", "20"], session);
    undo.execute([], session);
    const before = state(session);
    edit(session);
    assert.throws(() => redo.execute([], session), { message: "nothing to redo" });
    undo.execute([], session);
    assert.equal(state(session), before);
    assert.throws(() => undo.execute([], session), { message: "nothing to undo" });
  }
});

test("empty ungroup and layer no-ops remain undoable successful edits after a canvas history barrier", () => {
  for (const edit of [
    (session: EditorSession) => ungroup.execute(["right"], session),
    (session: EditorSession) => addto.execute(["left", "a"], session),
    (session: EditorSession) => front.execute(["a"], session),
    (session: EditorSession) => back.execute(["before"], session),
  ]) {
    const session = sessionWithTree();
    session.requireDocument().deleteShape("c");
    session.requireDocument().deleteShape("b");
    canvas.execute(["320", "240"], session);
    const before = state(session);
    assert.throws(() => group.execute(["bad", "left", "a"], session));
    assert.throws(() => undo.execute([], session), { message: "undo not allowed after io command" });
    assert.throws(() => redo.execute([], session), { message: "undo not allowed after io command" });
    const summary = edit(session);
    const after = state(session);
    assert.equal(undo.execute([], session), `undone: ${summary}`);
    assert.equal(state(session), before);
    assert.throws(() => undo.execute([], session), { message: "nothing to undo" });
    assert.equal(redo.execute([], session), `redone: ${summary}`);
    assert.equal(state(session), after);
  }
});

test("history snapshots stay isolated through regrouping, movement and edits on retained documents", () => {
  const session = sessionWithTree();
  const initial = state(session);
  const staleInitial = session.requireDocument();
  group.execute(["joined", "c", "b"], session);
  const grouped = state(session);
  const staleGrouped = session.requireDocument();
  move.execute(["joined", "10", "20"], session);
  const moved = state(session);
  const staleMoved = session.requireDocument();
  ungroup.execute(["joined"], session);
  const promoted = state(session);
  staleInitial.deleteShape("left");
  staleGrouped.setAttribute("b", "text", "stale grouped");
  staleMoved.deleteShape("joined");
  for (const expected of [moved, grouped, initial]) {
    undo.execute([], session);
    assert.equal(state(session), expected);
  }
  for (const expected of [grouped, moved, promoted]) {
    redo.execute([], session);
    assert.equal(state(session), expected);
  }
  set.execute(["b", "text", "仍可编辑"], session);
  assert.match(show.execute(["b"], session), /text="仍可编辑"/);
});

test("all hierarchy commands reject a missing document without silently initializing one", () => {
  const session = new EditorSession();
  for (const edit of [
    () => group.execute(["new", "a", "b"], session),
    () => ungroup.execute(["left"], session),
    () => addto.execute(["right", "left"], session),
    () => front.execute(["a"], session),
    () => back.execute(["a"], session),
  ]) {
    assert.throws(edit, { message: "no document. use 'init' or 'read' first" });
    assert.throws(() => session.requireDocument(), /no document/);
  }
});
