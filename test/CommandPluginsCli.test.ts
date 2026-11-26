import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
function fixture(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), "svg-command-cli-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const cwd = join(dir, "working");
  mkdirSync(join(cwd, "docs"), { recursive: true });
  copyFileSync(join(root, "examples/imported.svg"), join(cwd, "docs/source.svg"));
  writeFileSync(join(cwd, ".settings"), "");
  const run = (input: string, args: string[]) => {
    const proc = spawnSync(process.execPath, [join(root, "dist/src/main.js"), ...args], { input, cwd, timeout: 5000 });
    assert.equal(proc.status, 0, proc.error?.message ?? proc.stderr?.toString());
    return proc;
  };
  return { dir, run };
}

test("code and config replay the command transcript byte-for-byte in the same fixed directory", t => {
  const { run } = fixture(t);
  const base = join(root, "doc/transcript/command-plugins");
  const input = readFileSync(base + ".txt", "utf8");
  const expected = readFileSync(base + ".stdout");
  for (const args of [[], ["--config", join(root, "plugins.config.json")]]) {
    const result = run(input, args);
    assert.deepEqual(result.stderr, Buffer.alloc(0));
    assert.deepEqual(result.stdout, expected);
  }
});

test("help and dispatch reflect each optional command independently", t => {
  const { dir, run } = fixture(t);
  for (const names of [["stats"], ["dir"], []]) {
    const config = join(dir, "select.json");
    writeFileSync(config, JSON.stringify({ plugins: ["stats", "dir"].map(name =>
      ({ module: join(root, "dist/plugins", name), enabled: names.includes(name) })) }));
    const result = run("help\ninit\nstats\ndir\n", ["--config", config]);
    const missing: string[] = [];
    for (const name of ["stats", "dir"]) {
      assert.equal(new RegExp("^  " + name + " +", "m").test(result.stdout.toString()), names.includes(name));
      if (!names.includes(name)) missing.push("error: unknown command: " + name + "\n");
    }
    assert.equal(result.stderr.toString(), missing.join(""));
  }
});

test("save in another directory keeps dir rooted at the CLI working directory", t => {
  const result = fixture(t).run("read docs/source.svg\nsave ../copy.svg\ndir\n", []);
  assert.equal(result.stderr.length, 0);
  assert.ok(result.stdout.toString().endsWith("saved to ../copy.svg (7 elements)\n[DIR]  docs\n[FILE]  .settings\n"));
});
