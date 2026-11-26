import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const temp = mkdtempSync(join(tmpdir(), "pj1-compat-"));
const baseline = join(temp, "final");
const git = (...args) => execFileSync("git", args, { cwd: root });

function run(entry, args, input, dir) {
  mkdirSync(join(dir, "examples/output"), { recursive: true });
  copyFileSync(join(baseline, "examples/imported.svg"), join(dir, "examples/imported.svg"));
  const result = spawnSync(process.execPath, [entry, ...args], { input, cwd: dir });
  assert.equal(result.status, 0, result.error?.message ?? result.stderr?.toString());
  const files = {};
  for (const file of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!file.isFile() || !file.name.endsWith(".svg")) continue;
    const path = join(file.parentPath ?? file.path, file.name);
    files[relative(dir, path)] = readFileSync(path);
  }
  return { stdout: result.stdout, stderr: result.stderr, files };
}

try {
  const paths = git("ls-tree", "-r", "--name-only", "final", "--", "src", "examples", "package.json", "tsconfig.json")
    .toString().trim().split("\n");
  for (const path of paths) {
    const dest = join(baseline, path);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, git("show", "final:" + path));
  }
  symlinkSync(join(root, "node_modules"), join(baseline, "node_modules"), "junction");
  execFileSync(process.execPath, [join(root, "node_modules/typescript/bin/tsc"), "-p", baseline]);
  const config = join(temp, "empty.json");
  writeFileSync(config, '{"plugins":[]}');
  for (const path of paths.filter(p => p.endsWith(".cli"))) {
    const name = path.slice("examples/".length, -".cli".length);
    const input = readFileSync(join(baseline, path));
    const original = run(join(baseline, "dist/src/main.js"), [], input, join(temp, name, "original"));
    for (const [mode, args] of [["code", ["--no-plugins"]], ["config", ["--config", config]]]) {
      const current = run(join(root, "dist/src/main.js"), args, input, join(temp, name, mode));
      assert.deepEqual(current, original, name + " differs from final in " + mode + " assembly");
    }
    if (name === "acceptance-session") {
      const prefix = join(root, "doc/transcript/cli-1");
      assert.deepEqual(readFileSync(prefix + ".txt"), input);
      for (const stream of ["stdout", "stderr"]) assert.deepEqual(readFileSync(prefix + "." + stream), original[stream]);
    }
    console.log("PASS", name, "(stdout, stderr, SVG bytes)");
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
