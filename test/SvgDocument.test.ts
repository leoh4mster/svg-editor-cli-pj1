import assert from "node:assert/strict";
import test from "node:test";
import { EditorSession } from "../src/application/EditorSession.js";
import { SvgDocument } from "../src/domain/SvgDocument.js";

test("a document defaults to an 800 x 600 canvas and accepts fractional sizes", () => {
  const defaults = new SvgDocument();
  assert.deepEqual([defaults.width, defaults.height], [800, 600]);

  const fractional = new SvgDocument(320.5, 0.25);
  assert.deepEqual([fractional.width, fractional.height], [320.5, 0.25]);
});

test("both dimensions must be finite and positive when constructing a document", () => {
  for (const invalid of [0, -1, NaN, Infinity, -Infinity]) {
    assert.throws(() => new SvgDocument(invalid, 600), /width must be a finite positive number/);
    assert.throws(() => new SvgDocument(800, invalid), /height must be a finite positive number/);
  }
});

test("a rejected resize preserves both dimensions, including a valid proposed width", () => {
  const document = new SvgDocument(320, 240);
  for (const invalid of [0, -1, NaN, Infinity, -Infinity]) {
    assert.throws(() => document.resize(invalid, 480));
    assert.deepEqual([document.width, document.height], [320, 240]);
    assert.throws(() => document.resize(640, invalid));
    assert.deepEqual([document.width, document.height], [320, 240]);
  }

  document.resize(640.5, 480.25);
  assert.deepEqual([document.width, document.height], [640.5, 480.25]);
});

test("an empty session requires initialization before querying or resizing", () => {
  const session = new EditorSession();
  const message = /no document\. use 'init' or 'read' first/;
  assert.throws(() => session.requireDocument(), message);
  assert.throws(() => session.resizeCanvas(320, 240), message);
});

test("a failed initial initialization leaves the session without a document", () => {
  const session = new EditorSession();
  assert.throws(() => session.initialize(320, 0));
  assert.throws(() => session.requireDocument(), /no document/);
});

test("failed document replacement and resize preserve the current document", () => {
  const session = new EditorSession();
  const original = session.initialize(320, 240);
  assert.throws(() => session.initialize(800, 0));
  assert.strictEqual(session.requireDocument(), original);
  assert.throws(() => session.resizeCanvas(640, 0));
  assert.deepEqual([original.width, original.height], [320, 240]);

  const replacement = session.initialize();
  assert.notStrictEqual(replacement, original);
  assert.strictEqual(session.requireDocument(), replacement);
  assert.deepEqual([replacement.width, replacement.height], [800, 600]);
});
