import assert from "node:assert/strict";
import { chmodSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { NodeFileStore } from "../src/infrastructure/NodeFileStore.js";

const files = new NodeFileStore();

function temporaryDirectory(): { directory: string; cleanup: () => void } {
  const directory = mkdtempSync(join(tmpdir(), "svg-editor-files-"));
  return { directory, cleanup: () => rmSync(directory, { recursive: true, force: true }) };
}

test("file store reads and atomically replaces UTF-8 files with spaces and Chinese names", () => {
  const { directory, cleanup } = temporaryDirectory();
  try {
    const path = join(directory, "课程 diagram.svg");
    files.writeText(path, "<svg>开始 😀</svg>\n");
    assert.equal(files.readText(path), "<svg>开始 😀</svg>\n");
    chmodSync(path, 0o640);
    files.writeText(path, "<svg>更新 &amp; 保存</svg>\n");
    assert.equal(readFileSync(path, "utf8"), "<svg>更新 &amp; 保存</svg>\n");
    assert.equal(statSync(path).mode & 0o777, 0o640);
    assert.deepEqual(readdirSync(directory), ["课程 diagram.svg"]);
  } finally { cleanup(); }
});

test("read rejects missing files and directories; failed output leaves existing targets and directories untouched", () => {
  const { directory, cleanup } = temporaryDirectory();
  try {
    const original = join(directory, "original.svg");
    writeFileSync(original, "original contents");
    const child = join(directory, "folder");
    mkdirSync(child);
    const invalid = join(directory, "invalid-utf8.svg");
    writeFileSync(invalid, Buffer.from([0x3c, 0x73, 0x76, 0x67, 0x3e, 0xc3, 0x28]));
    assert.throws(() => files.readText(join(directory, "missing.svg")));
    assert.throws(() => files.readText(child));
    assert.throws(() => files.readText(invalid));
    assert.throws(() => files.writeText(child, "replacement"));
    assert.throws(() => files.writeText(join(directory, "missing-parent", "out.svg"), "replacement"));
    assert.equal(readFileSync(original, "utf8"), "original contents");
    assert.ok(statSync(child).isDirectory());
    assert.deepEqual(readdirSync(directory).sort(), ["folder", "invalid-utf8.svg", "original.svg"]);
  } finally { cleanup(); }
});

test("read-only targets cannot be replaced and no temporary files remain after failure", () => {
  const { directory, cleanup } = temporaryDirectory();
  const path = join(directory, "locked.svg");
  try {
    writeFileSync(path, "original contents");
    chmodSync(path, 0o444);
    assert.throws(() => files.writeText(path, "replacement"));
    assert.equal(readFileSync(path, "utf8"), "original contents");
    assert.equal(statSync(path).mode & 0o777, 0o444);
    assert.deepEqual(readdirSync(directory), ["locked.svg"]);
  } finally {
    chmodSync(path, 0o644);
    cleanup();
  }
});

test("saving through a symlink updates its regular target while preserving the link", () => {
  const { directory, cleanup } = temporaryDirectory();
  try {
    const target = join(directory, "target.svg");
    const link = join(directory, "linked.svg");
    writeFileSync(target, "before");
    symlinkSync("target.svg", link);
    files.writeText(link, "after");
    assert.ok(lstatSync(link).isSymbolicLink());
    assert.equal(readFileSync(target, "utf8"), "after");
    assert.equal(files.readText(link), "after");
    const broken = join(directory, "broken.svg");
    symlinkSync("absent.svg", broken);
    assert.throws(() => files.writeText(broken, "must not create target"));
    assert.ok(lstatSync(broken).isSymbolicLink());
    assert.deepEqual(readdirSync(directory).sort(), ["broken.svg", "linked.svg", "target.svg"]);
  } finally { cleanup(); }
});
