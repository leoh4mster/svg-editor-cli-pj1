import assert from "node:assert/strict";
import test from "node:test";
import { EditorSession } from "../src/application/EditorSession.js";
import { ShapeFactory } from "../src/application/ShapeFactory.js";
import { SvgReadResult } from "../src/application/SvgReadResult.js";
import { CreateCommand } from "../src/application/commands/CreateCommand.js";
import { ReadCommand } from "../src/application/commands/ReadCommand.js";
import { SaveCommand } from "../src/application/commands/SaveCommand.js";
import type { SvgCodec } from "../src/application/ports/SvgCodec.js";
import type { TextFileStore } from "../src/application/ports/TextFileStore.js";
import { SvgXmlCodec } from "../src/infrastructure/svg/SvgXmlCodec.js";

const codec = new SvgXmlCodec(new ShapeFactory());
const create = new CreateCommand(new ShapeFactory());
const imported = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><g id="g"><rect id="r" x="1" y="2" width="3" height="4"/></g></svg>';

function memoryFiles() {
  class MemoryFiles implements TextFileStore {
    readonly content = new Map<string, string>([["source.svg", imported]]);
    readonly writes: string[] = [];
    readText(path: string): string {
      const content = this.content.get(path);
      if (content === undefined) throw new Error("unavailable input");
      return content;
    }
    writeText(path: string, content: string): void {
      if (path === "unwritable.svg") throw new Error("unavailable output");
      this.content.set(path, content);
      this.writes.push(path);
    }
  }
  return new MemoryFiles();
}

function editableSession(): EditorSession {
  const session = new EditorSession();
  session.initialize();
  create.execute(["rect", "old", "10", "20", "30", "40"], session);
  session.markSaved("old.svg");
  session.executeEdit((draft) => {
    draft.moveShape("old", 1, 2);
    return "moved old";
  });
  session.undo();
  return session;
}

test("read replaces the document, reports warnings before its summary and counts groups", () => {
  const files = memoryFiles();
  files.content.set("unnamed.svg", '<svg><rect/><g id="g"><circle id="c"/></g></svg>');
  const session = editableSession();
  const read = new ReadCommand(files, codec);
  assert.equal(read.execute(["unnamed.svg"], session), "warning: assigned id rect1 to unnamed <rect>\nread unnamed.svg (3 elements)");
  assert.equal(session.currentPath, "unnamed.svg");
  assert.throws(() => session.requireDocument().findShape("old"), /no such shape/);
  assert.equal(session.requireDocument().findShape("rect1").type, "rect");
  assert.throws(() => session.undo(), { message: "undo not allowed after io command" });
  assert.throws(() => session.redo(), { message: "undo not allowed after io command" });
  create.execute(["g", "new"], session);
  session.undo();
  assert.throws(() => session.undo(), { message: "nothing to undo" });
});

test("explicit save and later reads change the default target; edits and history preserve it", () => {
  const files = memoryFiles();
  const read = new ReadCommand(files, codec);
  const save = new SaveCommand(files, codec);
  const session = new EditorSession();
  read.execute(["source.svg"], session);
  assert.equal(save.execute([], session), "saved to source.svg (2 elements)");
  assert.equal(save.execute(["copy with spaces.svg"], session), "saved to copy with spaces.svg (2 elements)");
  assert.equal(session.currentPath, "copy with spaces.svg");
  session.executeEdit((draft) => {
    draft.moveShape("r", 2, 3);
    return "move imported";
  });
  session.undo();
  session.redo();
  session.resizeCanvas(100, 90);
  assert.equal(session.currentPath, "copy with spaces.svg");
  save.execute([], session);
  assert.deepEqual(files.writes, ["source.svg", "copy with spaces.svg", "copy with spaces.svg"]);
  assert.equal(codec.decode(files.content.get("copy with spaces.svg")!).copyDocument().width, 100);
  read.execute(["source.svg"], session);
  assert.equal(session.currentPath, "source.svg");
  save.execute([], session);
  assert.equal(files.writes.at(-1), "source.svg");
});

test("save without a document or known target fails; initialize clears a previous path", () => {
  const files = memoryFiles();
  const save = new SaveCommand(files, codec);
  const session = new EditorSession();
  assert.throws(() => save.execute(["new.svg"], session), { message: "no document. use 'init' or 'read' first" });
  session.initialize();
  assert.throws(() => save.execute([], session), { message: "no file path. use 'save <file.svg>' first" });
  assert.equal(save.execute(["empty.svg"], session), "saved to empty.svg (0 elements)");
  assert.equal(session.currentPath, "empty.svg");
  session.initialize(10, 20);
  assert.equal(session.currentPath, undefined);
  assert.throws(() => save.execute([], session), { message: "no file path. use 'save <file.svg>' first" });
  assert.deepEqual(files.writes, ["empty.svg"]);
});

test("a successful save keeps the current object but clears history and blocks undo until a valid edit", () => {
  const files = memoryFiles();
  const save = new SaveCommand(files, codec);
  const session = editableSession();
  const before = session.requireDocument();
  const encoded = codec.encode(before);
  save.execute(["saved.svg"], session);
  assert.strictEqual(session.requireDocument(), before);
  assert.equal(files.content.get("saved.svg"), encoded);
  assert.throws(() => session.undo(), { message: "undo not allowed after io command" });
  assert.throws(() => session.redo(), { message: "undo not allowed after io command" });
  assert.throws(() => create.execute(["g", "old"], session));
  assert.throws(() => session.undo(), { message: "undo not allowed after io command" });
  create.execute(["g", "fresh"], session);
  session.undo();
  assert.equal(codec.encode(session.requireDocument()), encoded);
  assert.equal(session.currentPath, "saved.svg");
  assert.throws(() => session.undo(), { message: "nothing to undo" });
});

test("failed reads, writes, syntax and semantic imports preserve object identity, path and redo branch", () => {
  const files = memoryFiles();
  files.content.set("malformed.svg", "<svg><rect></svg>");
  files.content.set("unsupported.svg", "<svg><rect/><path id=\"p\"/></svg>");
  const read = new ReadCommand(files, codec);
  const save = new SaveCommand(files, codec);
  const failures: Array<(session: EditorSession) => string> = [
    (session) => read.execute(["missing.svg"], session),
    (session) => read.execute(["malformed.svg"], session),
    (session) => read.execute(["unsupported.svg"], session),
    (session) => read.execute([], session),
    (session) => read.execute(["source.svg", "extra"], session),
    (session) => save.execute(["unwritable.svg"], session),
    (session) => save.execute(["first.svg", "extra"], session),
  ];
  for (const fail of failures) {
    const session = editableSession();
    const before = session.requireDocument();
    const content = codec.encode(before);
    assert.throws(() => fail(session));
    assert.strictEqual(session.requireDocument(), before);
    assert.equal(codec.encode(session.requireDocument()), content);
    assert.equal(session.currentPath, "old.svg");
    assert.equal(session.redo(), "redone: moved old");
    assert.equal(session.requireDocument().findShape("old").svgAttributes.get("x"), "11");
  }
  assert.deepEqual(files.writes, []);
  assert.equal(files.content.has("first.svg"), false);
});

test("file adapter errors use the required messages, while invalid SVG reports a parsing error", () => {
  const files = memoryFiles();
  files.content.set("bad.svg", "<not-svg/>");
  const session = editableSession();
  assert.throws(() => new ReadCommand(files, codec).execute(["missing.svg"], session), { message: "cannot read file: missing.svg" });
  assert.throws(() => new SaveCommand(files, codec).execute(["unwritable.svg"], session), { message: "cannot write file: unwritable.svg" });
  assert.throws(() => new ReadCommand(files, codec).execute(["bad.svg"], session), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.doesNotMatch(error.message, /cannot read file/);
    return true;
  });
});

test("failed file operations preserve the existing IO barrier and failed save does not replace the default path", () => {
  const files = memoryFiles();
  const session = new EditorSession();
  const read = new ReadCommand(files, codec);
  const save = new SaveCommand(files, codec);
  read.execute(["source.svg"], session);
  const document = session.requireDocument();
  for (const action of [
    () => read.execute(["missing.svg"], session),
    () => save.execute(["unwritable.svg"], session),
    () => save.execute(["a", "b"], session),
  ]) {
    assert.throws(action);
    assert.strictEqual(session.requireDocument(), document);
    assert.equal(session.currentPath, "source.svg");
    assert.throws(() => session.undo(), { message: "undo not allowed after io command" });
    assert.throws(() => session.redo(), { message: "undo not allowed after io command" });
  }
  save.execute([], session);
  assert.deepEqual(files.writes, ["source.svg"]);
});

test("serialization failure happens before any file write and does not discard redo", () => {
  const files = memoryFiles();
  const session = editableSession();
  const broken: SvgCodec = {
    decode: (xml) => codec.decode(xml),
    encode: () => { throw new Error("cannot encode document"); },
  };
  const before = session.requireDocument();
  assert.throws(() => new SaveCommand(files, broken).execute(["new.svg"], session), /cannot encode document/);
  assert.strictEqual(session.requireDocument(), before);
  assert.equal(session.currentPath, "old.svg");
  assert.deepEqual(files.writes, []);
  assert.equal(session.redo(), "redone: moved old");
});

test("loading owns a cloned document rather than exposing the codec result to later mutation", () => {
  const files = memoryFiles();
  const source = codec.decode(imported).copyDocument();
  const result = new SvgReadResult(source, []);
  const controlledCodec: SvgCodec = {
    decode: () => result,
    encode: (document) => codec.encode(document),
  };
  const session = new EditorSession();
  new ReadCommand(files, controlledCodec).execute(["source.svg"], session);
  source.moveShape("r", 100, 100);
  result.copyDocument().moveShape("r", 200, 200);
  assert.equal(session.requireDocument().findShape("r").svgAttributes.get("x"), "1");
  const retained = codec.decode(imported).copyDocument();
  session.loadDocument(retained, "retained.svg");
  retained.moveShape("r", 300, 300);
  assert.equal(session.requireDocument().findShape("r").svgAttributes.get("x"), "1");
});
