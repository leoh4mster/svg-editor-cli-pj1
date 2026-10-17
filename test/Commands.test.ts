import assert from "node:assert/strict";
import test from "node:test";
import { EditorSession } from "../src/application/EditorSession.js";
import { CanvasCommand } from "../src/application/commands/CanvasCommand.js";
import { InitCommand } from "../src/application/commands/InitCommand.js";

test("init supports defaults, width with default height, and explicit dimensions", () => {
  const command = new InitCommand();
  const session = new EditorSession();
  assert.equal(command.execute([], session), "canvas 800x600 created");
  assert.equal(command.execute(["400"], session), "canvas 400x600 created");
  assert.equal(command.execute(["400", "300"], session), "canvas 400x300 created");
  assert.deepEqual([session.requireDocument().width, session.requireDocument().height], [400, 300]);
});

test("init accepts decimal SVG numbers, including signs and exponents", () => {
  const session = new EditorSession();
  new InitCommand().execute(["+3.2e2", ".5"], session);
  assert.deepEqual([session.requireDocument().width, session.requireDocument().height], [320, 0.5]);
});

test("init rejects malformed, nonpositive, nonfinite, and extra arguments atomically", () => {
  const session = new EditorSession();
  const original = session.initialize(320, 240);
  const command = new InitCommand();
  const invalidArguments = [
    ["640", "480", "extra"],
    ["oops"],
    [""],
    ["0x20"],
    ["Infinity"],
    ["1e309"],
    ["0"],
    ["-1"],
    ["640", "oops"],
    ["640", "0"],
  ];
  for (const args of invalidArguments) {
    assert.throws(() => command.execute(args, session));
    assert.strictEqual(session.requireDocument(), original);
    assert.deepEqual([original.width, original.height], [320, 240]);
  }
});

test("canvas query and resize both require a document", () => {
  const command = new CanvasCommand();
  const session = new EditorSession();
  assert.throws(() => command.execute([], session), /no document/);
  assert.throws(() => command.execute(["320", "240"], session), /no document/);
});

test("canvas without arguments reports dimensions and a pair resizes the same document", () => {
  const command = new CanvasCommand();
  const session = new EditorSession();
  const document = session.initialize(320, 240);
  assert.equal(command.execute([], session), "canvas 320x240");
  assert.equal(command.execute(["640.5", "480.25"], session), "canvas resized to 640.5x480.25");
  assert.strictEqual(session.requireDocument(), document);
  assert.equal(command.execute([], session), "canvas 640.5x480.25");
});

test("canvas rejects incomplete pairs, extra arguments, and invalid numbers without resizing", () => {
  const command = new CanvasCommand();
  const session = new EditorSession();
  session.initialize(320, 240);
  for (const args of [["640"], ["640", "480", "extra"], ["640", "oops"], ["640", "0"], ["-1", "480"], ["640", "1e309"]]) {
    assert.throws(() => command.execute(args, session));
    assert.equal(command.execute([], session), "canvas 320x240");
  }
});
