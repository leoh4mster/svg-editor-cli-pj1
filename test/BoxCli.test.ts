import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test, { type TestContext } from "node:test";

const root = fileURLToPath(new URL("../../", import.meta.url));
function workspace(t: TestContext) {
  const cwd = mkdtempSync(join(tmpdir(), "svg-box-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const run = (input: string, flags: string[] = []) => {
    const result = spawnSync(process.execPath, [join(root, "dist/src/main.js"), ...flags], { input, cwd, timeout: 5000 });
    assert.equal(result.status, 0, result.stderr?.toString());
    return result;
  };
  return { cwd, run };
}

test("both assemblies replay §6.1 B identically and produce a stable SVG, including when reopened without the plugin", t => {
  const { cwd, run } = workspace(t);
  const input = readFileSync(join(root, "doc/transcript/box-flowchart.txt"), "utf8");
  const expected = readFileSync(join(root, "doc/transcript/box-flowchart-star.stdout"));
  const file = join(cwd, "flowchart-box.svg");
  const outputs: Buffer[] = [];
  for (const flags of [[], ["--config", join(root, "plugins.config.json")]]) {
    const result = run(input, flags);
    assert.deepEqual(result.stderr, Buffer.alloc(0));
    assert.deepEqual(result.stdout, expected);
    const xml = readFileSync(file);
    assert.match(xml.toString(), /<g id="n1" data-kind="box">/);
    outputs.push(xml);
    const reopen = run('read flowchart-box.svg\nstats\ntree n2\nsave again.svg\n', flags);
    assert.equal(reopen.stderr.length, 0);
    assert.match(reopen.stdout.toString(), /rect: 2  text: 2  line: 1  \(total 5, containers 3\)/);
    assert.match(reopen.stdout.toString(), /g#n2 \(box\)/);
    assert.deepEqual(readFileSync(join(cwd, "again.svg")), xml);
    rmSync(file);
  }
  assert.deepEqual(outputs[0], outputs[1]);
  writeFileSync(file, outputs[0]!);
  const plain = run("read flowchart-box.svg\nshow n1\nset n1 label no\nsave plain.svg\n", ["--no-plugins"]);
  assert.match(plain.stdout.toString(), /g#n1  parent=g#flowchart/);
  assert.equal(plain.stderr.toString(), "error: unknown attribute: label\n");
  assert.deepEqual(readFileSync(join(cwd, "plain.svg")), outputs[0]);
});

test("invalid marked groups and duplicate ids reject the whole read and preserve previous save path and redo", t => {
  const { cwd, run } = workspace(t);
  for (const [parts, reason] of [
    ['<rect id="b-rect"/>', "box#b requires direct child text#b-label"],
    ['<text id="b-rect"/><text id="b-label"/>', "box#b requires direct child rect#b-rect"],
    ['<rect id="b-rect"/><text id="b-label"/><g id="b-label"/>', "id already exists: b-label"],
  ]) {
    writeFileSync(join(cwd, "broken.svg"), '<svg><g id="b" data-kind="box">' + parts + '</g></svg>');
    const result = run("init\ncreate box a 0 0 20 10 hi\nsave old.svg\nset a label later\nundo\nread broken.svg\nredo\nsave\n");
    assert.equal(result.stderr.toString(), "error: " + reason + "\n");
    assert.match(result.stdout.toString(), /redone: box#a label updated: "later"\nsaved to old.svg/);
    assert.match(readFileSync(join(cwd, "old.svg"), "utf8"), />later<\/text>/);
  }
});
