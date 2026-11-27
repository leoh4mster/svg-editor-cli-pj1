import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("two independent labels preserve order across edits, saves and undo in both assemblies", t => {
  const cwd = mkdtempSync(join(tmpdir(), "svg-tree-labels-"));
  t.after(() => rmSync(cwd, {recursive: true, force: true}));
  const input = readFileSync(join(root, "doc/transcript/tree-labels.txt"), "utf8");
  const expected = readFileSync(join(root, "doc/transcript/tree-labels.stdout"));
  const run = (text: string, args: string[]) => {
    const result = spawnSync(process.execPath, [join(root,"dist/src/main.js"), ...args],
      {cwd, input: text, timeout: 5000});
    assert.equal(result.status, 0);
    return result;
  };
  const saved: Buffer[] = [];
  for (const args of [[], ["--config", join(root, "plugins.config.json")]]) {
    const result = run(input, args);
    assert.deepEqual(result.stderr, Buffer.alloc(0));
    assert.deepEqual(result.stdout, expected);
    saved.push(readFileSync(join(cwd, "state.svg")));
  }
  assert.deepEqual(saved[0], saved[1]);

  // Swap activation order and disable only the star, using the same implementations.
  const config = join(cwd, "plugins.json");
  const entries = ["tree-star", "box"].map(name => ({module:join(root,"dist/plugins",name), enabled:true}));
  writeFileSync(config, JSON.stringify({plugins: entries}));
  const reversed = run('init\ncreate box n 0 0 10 10 t\ntree n\n', ["--config",config]);
  assert.match(reversed.stdout.toString(), /g#n \* \(box\)\n/);
  entries[0]!.enabled = false;
  writeFileSync(config, JSON.stringify({plugins: entries}));
  const onlyBox = run('init\ncreate box n 0 0 10 10 t\ntree n\n', ["--config",config]);
  assert.match(onlyBox.stdout.toString(), /g#n \(box\)\n/);
  assert.doesNotMatch(onlyBox.stdout.toString(), /\*/);
});

test("failed operations keep dirty state and canvas resize compares with the saved canvas", t => {
  const cwd = mkdtempSync(join(tmpdir(), "svg-tree-error-"));
  t.after(() => rmSync(cwd, {recursive:true, force:true}));
  const result = spawnSync(process.execPath, [join(root,"dist/src/main.js")],
    {cwd, encoding:"utf8", input:[
      "init", "create g a", "save state.svg", "move a 0 0", "tree",
      "create g a", "read missing.svg", "save missing/file.svg", "tree",
      "canvas 400 300", "tree", "canvas 800 600", "tree", "read state.svg", "tree",
    ].join("\n")});
  assert.equal(result.status,0);
  assert.equal(result.stderr, "error: id already exists: a\nerror: cannot read file: missing.svg\nerror: cannot write file: missing/file.svg\n");
  const trees = result.stdout.split(/(?=^svg \(\d+x\d+\))/m).slice(1).map(s => s.split("\n").slice(0,2).join("\n"));
  assert.deepEqual(trees, [
    "svg (800x600)\n└── g#a", "svg (800x600)\n└── g#a",
    "svg (400x300) *\n└── g#a", "svg (800x600)\n└── g#a", "svg (800x600)\n└── g#a",
  ]);
});
