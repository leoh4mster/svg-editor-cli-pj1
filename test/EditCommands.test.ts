import assert from "node:assert/strict";
import test from "node:test";
import { EditorSession } from "../src/application/EditorSession.js";
import { ShapeFactory } from "../src/application/ShapeFactory.js";
import { CanvasCommand } from "../src/application/commands/CanvasCommand.js";
import { CreateCommand } from "../src/application/commands/CreateCommand.js";
import { DeleteCommand } from "../src/application/commands/DeleteCommand.js";
import { InitCommand } from "../src/application/commands/InitCommand.js";
import { MoveCommand } from "../src/application/commands/MoveCommand.js";
import { RedoCommand } from "../src/application/commands/RedoCommand.js";
import { ScaleCommand } from "../src/application/commands/ScaleCommand.js";
import { SetCommand } from "../src/application/commands/SetCommand.js";
import { ShowCommand } from "../src/application/commands/ShowCommand.js";
import { TreeCommand } from "../src/application/commands/TreeCommand.js";
import { UndoCommand } from "../src/application/commands/UndoCommand.js";

const create = new CreateCommand(new ShapeFactory());
const move = new MoveCommand();
const scale = new ScaleCommand();
const set = new SetCommand();
const remove = new DeleteCommand();
const undo = new UndoCommand();
const redo = new RedoCommand();
const tree = new TreeCommand();
const show = new ShowCommand();
const canvas = new CanvasCommand();
const initialize = new InitCommand();

function sessionWithTree(): EditorSession {
  const session = new EditorSession();
  session.initialize();
  create.execute(["g", "before"], session);
  create.execute(["g", "outer"], session);
  create.execute(["g", "inner", "in", "outer"], session);
  create.execute(["rect", "r", "1", "2", "3", "4", "red", "in", "inner"], session);
  create.execute(["text", "t", "5", "6", "开始", "in", "inner"], session);
  create.execute(["circle", "c", "7", "8", "9", "in", "outer"], session);
  create.execute(["g", "after"], session);
  return session;
}

function state(session: EditorSession): string {
  const document = session.requireDocument();
  return JSON.stringify({
    tree: tree.execute([], session),
    shapes: document.children.flatMap((root) => root.walk()).map((shape) => ({
      show: show.execute([shape.id], session),
      parent: document.parentOf(shape.id)?.id,
    })),
  });
}

test("move, scale and set each commit one complete undo unit with symmetric redo", () => {
  const session = sessionWithTree();
  for (const execute of [
    () => move.execute(["outer", "-.5", "1.25"], session),
    () => scale.execute(["outer", ".5"], session),
    () => set.execute(["t", "text", "处理数据 v2"], session),
    () => set.execute(["outer", "stroke-width", "2.5"], session),
  ]) {
    const before = state(session);
    const summary = execute();
    const after = state(session);
    assert.notEqual(after, before);
    assert.equal(undo.execute([], session), `undone: ${summary}`);
    assert.equal(state(session), before);
    assert.equal(redo.execute([], session), `redone: ${summary}`);
    assert.equal(state(session), after);
  }
});

test("deleting a whole nested group restores exact geometry, ids, sibling order and parent indexes", () => {
  const session = sessionWithTree();
  const before = state(session);
  const summary = remove.execute(["inner"], session);
  const after = state(session);
  assert.deepEqual(session.requireDocument().findShape("outer").children.map((shape) => shape.id), ["c"]);
  for (const id of ["inner", "r", "t"]) {
    assert.throws(() => session.requireDocument().findShape(id), { message: `no such shape: ${id}` });
  }
  for (let count = 0; count < 3; count += 1) {
    assert.equal(undo.execute([], session), `undone: ${summary}`);
    assert.equal(state(session), before);
    assert.deepEqual(session.requireDocument().children.map((shape) => shape.id), ["before", "outer", "after"]);
    assert.strictEqual(session.requireDocument().parentOf("r"), session.requireDocument().findShape("inner"));
    assert.equal(redo.execute([], session), `redone: ${summary}`);
    assert.equal(state(session), after);
  }
});

test("undo of create frees the id and a successful new create clears redo", () => {
  const session = new EditorSession();
  session.initialize();
  const summary = create.execute(["rect", "r", "0", "0", "1", "1"], session);
  assert.equal(undo.execute([], session), `undone: ${summary}`);
  assert.deepEqual(session.requireDocument().children, []);
  assert.throws(() => undo.execute([], session), { message: "nothing to undo" });
  create.execute(["circle", "r", "2", "3", "4"], session);
  assert.equal(session.requireDocument().findShape("r").type, "circle");
  assert.throws(() => redo.execute([], session), { message: "nothing to redo" });
});

test("failed edits and malformed commands preserve the existing redo branch", () => {
  const session = sessionWithTree();
  const summary = move.execute(["inner", "10", "20"], session);
  const moved = state(session);
  undo.execute([], session);
  const before = state(session);
  const failures = [
    () => create.execute(["g", "r"], session),
    () => create.execute(["g", "candidate", "in", "missing"], session),
    () => move.execute(["missing", "1", "2"], session),
    () => move.execute(["outer", "1"], session),
    () => move.execute(["outer", "nope", "2"], session),
    () => scale.execute(["outer", "0"], session),
    () => scale.execute(["outer", "-1"], session),
    () => scale.execute(["outer", "Infinity"], session),
    () => set.execute(["r", "id", "new"], session),
    () => set.execute(["r", "width", "-1"], session),
    () => remove.execute(["missing"], session),
    () => remove.execute(["r", "extra"], session),
    () => undo.execute(["extra"], session),
    () => redo.execute(["extra"], session),
  ];
  for (const fail of failures) {
    assert.throws(fail);
    assert.equal(state(session), before);
  }
  assert.equal(redo.execute([], session), `redone: ${summary}`);
  assert.equal(state(session), moved);
});

test("display and canvas query skip history while successful new set, move, scale and delete invalidate redo", () => {
  for (const edit of [
    (session: EditorSession) => set.execute(["t", "text", "新分支"], session),
    (session: EditorSession) => move.execute(["r", "1", "0"], session),
    (session: EditorSession) => scale.execute(["c", "2"], session),
    (session: EditorSession) => remove.execute(["r"], session),
  ]) {
    const session = sessionWithTree();
    move.execute(["outer", "1", "2"], session);
    undo.execute([], session);
    tree.execute([], session);
    tree.execute(["inner"], session);
    show.execute(["r"], session);
    canvas.execute([], session);
    assert.throws(() => show.execute(["missing"], session));
    const before = state(session);
    edit(session);
    assert.throws(() => redo.execute([], session), { message: "nothing to redo" });
    undo.execute([], session);
    assert.equal(state(session), before);
  }
});

test("successful initialize and canvas resize block undo and redo until a successful edit", () => {
  const session = sessionWithTree();
  move.execute(["outer", "1", "2"], session);
  undo.execute([], session);
  canvas.execute(["640", "480"], session);
  const resized = state(session);
  for (const action of [() => undo.execute([], session), () => redo.execute([], session)]) {
    assert.throws(action, { message: "undo not allowed after io command" });
  }
  assert.throws(() => set.execute(["r", "width", "-1"], session));
  assert.throws(() => undo.execute([], session), { message: "undo not allowed after io command" });
  set.execute(["r", "fill", "blue"], session);
  undo.execute([], session);
  assert.equal(state(session), resized);
  assert.throws(() => undo.execute([], session), { message: "nothing to undo" });
  initialize.execute(["320", "240"], session);
  assert.deepEqual(session.requireDocument().children, []);
  assert.throws(() => undo.execute([], session), { message: "undo not allowed after io command" });
  assert.throws(() => redo.execute([], session), { message: "undo not allowed after io command" });
  create.execute(["g", "new"], session);
  undo.execute([], session);
  assert.deepEqual(session.requireDocument().children, []);
  assert.throws(() => undo.execute([], session), { message: "nothing to undo" });
});

test("failed document commands and history commands preserve both the barrier and redo availability", () => {
  const session = new EditorSession();
  session.initialize();
  for (const fail of [
    () => initialize.execute(["0"], session),
    () => canvas.execute(["640", "0"], session),
    () => move.execute(["missing", "1", "2"], session),
  ]) {
    assert.throws(fail);
    assert.throws(() => undo.execute([], session), { message: "undo not allowed after io command" });
    assert.throws(() => redo.execute([], session), { message: "undo not allowed after io command" });
  }
  const summary = create.execute(["g", "g"], session);
  undo.execute([], session);
  assert.throws(() => initialize.execute(["320", "nope"], session));
  assert.throws(() => canvas.execute(["640", "480", "extra"], session));
  assert.throws(() => canvas.execute(["640", "-1"], session));
  assert.equal(redo.execute([], session), `redone: ${summary}`);
});

test("history snapshots restore fresh objects and cannot be altered through previously retained documents", () => {
  const session = sessionWithTree();
  const before = state(session);
  const retainedBefore = session.requireDocument();
  move.execute(["inner", "3", "4"], session);
  const after = state(session);
  const retainedAfter = session.requireDocument();
  retainedBefore.setAttribute("t", "text", "stale before");
  retainedAfter.setAttribute("t", "text", "stale after");
  for (let count = 0; count < 3; count += 1) {
    undo.execute([], session);
    assert.equal(state(session), before);
    assert.notStrictEqual(session.requireDocument().findShape("r"), retainedBefore.findShape("r"));
    redo.execute([], session);
    assert.equal(state(session), after);
    assert.notStrictEqual(session.requireDocument().findShape("r"), retainedAfter.findShape("r"));
  }
});

test("an operation which mutates its draft and then throws commits neither document nor history", () => {
  const session = sessionWithTree();
  const summary = set.execute(["t", "text", "目标状态"], session);
  const after = state(session);
  undo.execute([], session);
  const before = state(session);
  const original = session.requireDocument();
  assert.throws(() => session.executeEdit((draft) => {
    draft.moveShape("inner", 20, 30);
    draft.deleteShape("c");
    throw new Error("operation rejected");
  }), /operation rejected/);
  assert.strictEqual(session.requireDocument(), original);
  assert.equal(state(session), before);
  assert.equal(redo.execute([], session), `redone: ${summary}`);
  assert.equal(state(session), after);
});

test("a caller retaining the successful transaction draft cannot change the committed document or snapshots", () => {
  const session = sessionWithTree();
  const before = state(session);
  let retainedDraft: ReturnType<EditorSession["requireDocument"]> | undefined;
  session.executeEdit((draft) => {
    retainedDraft = draft;
    draft.setAttribute("t", "text", "已提交");
    return "custom edit";
  });
  const after = state(session);
  assert.ok(retainedDraft);
  retainedDraft.setAttribute("t", "text", "不应泄漏");
  assert.equal(state(session), after);
  undo.execute([], session);
  assert.equal(state(session), before);
  redo.execute([], session);
  assert.equal(state(session), after);
});

test("late descendant overflow leaves the complete state, undo stack and redo stack untouched", () => {
  const session = sessionWithTree();
  create.execute(["rect", "huge", "1e308", "0", "1", "1", "in", "outer"], session);
  const summary = set.execute(["t", "text", "已改"], session);
  const after = state(session);
  undo.execute([], session);
  const before = state(session);
  assert.throws(() => move.execute(["outer", "1e308", "0"], session));
  assert.equal(state(session), before);
  assert.throws(() => scale.execute(["outer", "2"], session));
  assert.equal(state(session), before);
  assert.equal(redo.execute([], session), `redone: ${summary}`);
  assert.equal(state(session), after);
  undo.execute([], session);
  undo.execute([], session);
  assert.throws(() => session.requireDocument().findShape("huge"), /no such shape/);
});

test("new editing and history commands reject missing documents, arity, malformed numbers and nonpositive scaling", () => {
  const empty = new EditorSession();
  for (const action of [
    () => move.execute(["r", "1", "2"], empty),
    () => scale.execute(["r", "2"], empty),
    () => set.execute(["r", "fill", "red"], empty),
    () => remove.execute(["r"], empty),
    () => undo.execute([], empty),
    () => redo.execute([], empty),
  ]) {
    assert.throws(action, { message: "no document. use 'init' or 'read' first" });
  }
  const session = sessionWithTree();
  const before = state(session);
  for (const action of [
    () => move.execute(["r", "1", "2", "3"], session),
    () => move.execute(["r", "0x20", "2"], session),
    () => move.execute(["r", "1e309", "2"], session),
    () => scale.execute(["r"], session),
    () => scale.execute(["r", "2", "extra"], session),
    () => set.execute(["r", "fill"], session),
    () => set.execute(["r", "fill", "red", "extra"], session),
    () => remove.execute([], session),
  ]) {
    assert.throws(action);
    assert.equal(state(session), before);
  }
  for (const value of ["0", "-1", "-.5"]) {
    assert.throws(() => scale.execute(["r", value], session), { message: "scale factor must be positive" });
    assert.equal(state(session), before);
  }
});
