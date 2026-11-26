import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DirCommand } from "../plugins/dir/DirCommand.js";
import type { DirectoryEntry, DirectoryReader } from "../plugins/dir/DirectoryReader.js";
import { NodeDirectoryReader } from "../plugins/dir/NodeDirectoryReader.js";
import { EditorSession } from "../src/application/EditorSession.js";
import { Command, Rect } from "../src/extensions/index.js";

function reader(entries: readonly DirectoryEntry[]): DirectoryReader {
  return { currentPath: () => "/demo", list(path) { assert.equal(path, "/demo"); return entries; } };
}

test("dir filters dot aliases, includes hidden names, and sorts consistently without mutating input", () => {
  const entries: DirectoryEntry[] = [
    { name: "x", kind: "FILE" }, { name: "..", kind: "DIR" }, { name: ".x", kind: "FILE" },
    { name: "z", kind: "DIR" }, { name: ".", kind: "DIR" }, { name: ".a", kind: "DIR" },
    { name: "a\nb", kind: "FILE" },
  ];
  const expected = "[DIR]  .a\n[DIR]  z\n[FILE]  .x\n[FILE]  a\\nb\n[FILE]  x";
  assert.equal(new DirCommand(reader(Object.freeze(entries))).execute([]), expected);
  assert.equal(new DirCommand(reader([...entries].reverse())).execute([]), expected);
});

test("dir works before initialization and preserves path, saved content and both history directions on success and failure", () => {
  const session = new EditorSession();
  const ok: Command = new DirCommand(reader([]));
  const fail: Command = new DirCommand({ currentPath: () => "/denied", list() { throw new Error("EACCES"); } });
  const query = () => {
    assert.equal(ok.execute([], session), "(empty directory)");
    assert.throws(() => fail.execute([], session), { message: "cannot read directory: /denied" });
    assert.throws(() => fail.execute(["arg"], session), /usage: dir/);
  };
  query();
  session.initialize(); session.markSaved("sub/doc.svg");
  session.executeEdit(doc => { doc.addShape(new Rect("r", 0, 0, 1, 1)); return "create"; });
  session.executeEdit(doc => { doc.deleteShape("r"); return "delete"; });
  session.undo();
  const before = session.requireDocument();
  query();
  assert.equal(session.currentPath, "sub/doc.svg");
  assert.equal(session.savedSnapshot()!.children.length, 0);
  assert.equal(session.requireDocument(), before);
  assert.equal(before.findShape("r").id, "r");
  assert.equal(session.redo(), "redone: delete");
  assert.equal(session.undo(), "undone: delete");
  assert.equal(session.undo(), "undone: create");
});

test("Node adapter lists one level including dangling links and propagates a missing directory error", t => {
  const path = mkdtempSync(join(tmpdir(), "svg-dir-"));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  class FixtureDirectory extends NodeDirectoryReader {
    override currentPath() { return path; }
  }
  const command = new DirCommand(new FixtureDirectory());
  assert.equal(command.execute([]), "(empty directory)");
  mkdirSync(join(path, "docs"));
  writeFileSync(join(path, "docs", "nested"), "");
  writeFileSync(join(path, ".settings"), "");
  symlinkSync("missing", join(path, "link"));
  assert.equal(command.execute([]), "[DIR]  docs\n[FILE]  .settings\n[LINK]  link");
  rmSync(path, { recursive: true });
  assert.throws(() => command.execute([]), { message: "cannot read directory: " + path });
});
