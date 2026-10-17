import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const entryPoint = fileURLToPath(new URL("../src/main.js", import.meta.url));

test("a piped replay separates errors, preserves state, recovers, and exits at EOF", () => {
  const input = [
    "# first-stage replay",
    "",
    "canvas",
    "init 320 240",
    "canvas 640 0",
    "canvas",
    "init 640 nope",
    "canvas",
    "missing",
    'init "unterminated',
    "canvas 640",
    "canvas 640 480",
    "canvas",
  ].join("\n");
  const result = spawnSync(process.execPath, [entryPoint], { input, encoding: "utf8", timeout: 5000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.signal, null);
  assert.equal(result.stdout, [
    "canvas 320x240 created",
    "canvas 320x240",
    "canvas 320x240",
    "canvas resized to 640x480",
    "canvas 640x480",
    "",
  ].join("\n"));
  assert.equal(result.stderr, [
    "error: no document. use 'init' or 'read' first",
    "error: canvas height must be a finite positive number",
    "error: invalid number for height: nope",
    "error: unknown command: missing",
    "error: unterminated double quote",
    "error: usage: canvas [w h]",
    "",
  ].join("\n"));
});

test("piped help works without initialization and comments produce no output", () => {
  const result = spawnSync(process.execPath, [entryPoint], {
    input: '# comments can contain an unmatched "\nhelp\n  # done\n',
    encoding: "utf8",
    timeout: 5000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /init \[w\] \[h\]/);
  assert.match(result.stdout, /canvas \[w h\]/);
  assert.doesNotMatch(result.stdout, /svg>/);
});
