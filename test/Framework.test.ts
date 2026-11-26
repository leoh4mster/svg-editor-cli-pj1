import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { EditorSession } from "../src/application/EditorSession.js";
import { Group, type PluginContext } from "../src/extensions/index.js";
import { EditorHost } from "../src/host/EditorHost.js";
import probe from "./fixtures/probe/index.js";
import manifest from "./fixtures/probe/package.json" with { type: "json" };

const root = fileURLToPath(new URL("../../", import.meta.url));
const pluginDir = fileURLToPath(new URL("./fixtures/probe", import.meta.url));
const options = { message: "装配一致" };

test("the same four contributions run through code and config with identical messages and SVG bytes", async t => {
  const dir = mkdtempSync(join(tmpdir(), "svg-framework-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "snapshot.svg");
  const config = join(dir, "plugins.json");
  writeFileSync(config, JSON.stringify({ plugins: [{ module: pluginDir, options }] }));
  const observed: string[][] = [];
  const xml: Buffer[] = [];
  for (const mode of ["code", "config"]) {
    const errors: string[] = [];
    const host = new EditorHost(line => errors.push(line));
    await host.start([{ plugin: probe, manifest, options }], mode === "code" ? undefined : config);
    const session = new EditorSession();
    const run = (...args: string[]) => host.commands.execute(args[0]!, args.slice(1), session);
    const output = [run("help"), run("probe-info"), run("init"), run("create", "probe", "p"), run("tree")];
    assert.match(output[0]!, /probe-info/);
    assert.equal(output[1], "装配一致");
    assert.match(output[4]!, /svg \(800x600\) saved-roots=0/);
    assert.match(output[4]!, /probe#p \(probe\)/);
    assert.throws(() => run("ungroup", "p"), /cannot ungroup composite shape: p/);
    output.push(run("tree", "p"), run("save", file), run("tree"));
    assert.match(output.at(-1)!, /saved-roots=1/);
    xml.push(readFileSync(file));
    assert.match(xml.at(-1)!.toString(), /<g id="p" data-kind="probe">/);
    output.push(run("read", file), run("set", "p", "caption", "blue"));
    assert.equal(session.requireDocument().findShape("p-t").textContent, "blue");
    assert.equal(session.requireDocument().findShape("p").svgAttributes.get("fill"), "blue");
    output.push(run("undo"));
    assert.equal(session.requireDocument().findShape("p").svgAttributes.get("fill"), undefined);
    const before = run("tree");
    assert.throws(() => run("set", "p", "caption", "fail"), /injected failure/);
    assert.equal(run("tree"), before);
    assert.equal(session.requireDocument().findShape("p-t").textContent, "initial");
    output.push(run("redo"));
    assert.equal(session.requireDocument().findShape("p-t").textContent, "blue");
    assert.deepEqual(errors, []);
    observed.push(output);
  }
  assert.deepEqual(observed[0], observed[1]);
  assert.deepEqual(xml[0], xml[1]);
  const fallback = new EditorHost(assert.fail);
  await fallback.start([]);
  const session = new EditorSession();
  fallback.commands.execute("read", [file], session);
  assert.equal(session.requireDocument().findShape("p").type, "g");
  assert.equal(session.requireDocument().findShape("p-t").textContent, "initial");
  assert.throws(() => fallback.commands.execute("probe-info", [], session), /unknown command: probe-info/);
  assert.throws(() => fallback.commands.execute("set", ["p", "caption", "blue"], session), /unknown attribute: caption/);
});

test("disabled plugins match final's complete §6 transcript byte for byte on both streams", t => {
  const dir = mkdtempSync(join(tmpdir(), "svg-final-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, "examples/output"), { recursive: true });
  writeFileSync(join(dir, "examples/imported.svg"), readFileSync(join(root, "examples/imported.svg")));
  const prefix = join(root, "doc/transcript/cli-1");
  const config = join(dir, "empty.json");
  writeFileSync(config, '{"plugins":[]}');
  for (const args of [["--no-plugins"], ["--config", config]]) {
    const result = spawnSync(process.execPath, [join(root, "dist/src/main.js"), ...args],
      { input: readFileSync(prefix + ".txt"), cwd: dir });
    assert.equal(result.status, 0);
    assert.deepEqual(result.stdout, readFileSync(prefix + ".stdout"));
    assert.deepEqual(result.stderr, readFileSync(prefix + ".stderr"));
  }
});

test("multiple handlers are rejected before mutation and tree labels preserve plugin order", async () => {
  const host = new EditorHost(assert.fail);
  const second = {
    manifest: { name: "second", contributes: { attributes: ["other"], decorators: ["suffix"] } },
    plugin: { activate(ctx: PluginContext) {
      ctx.register("attributes", "other", {
        handles: (shape, name) => shape.type === "probe" && name === "caption",
        apply: () => assert.fail("ambiguous handler must not execute"),
      });
      ctx.register("decorators", "suffix", { labels: () => new Map([["p", "(second)"]]) });
    } },
  };
  await host.start([{ manifest, plugin: probe, options }, second]);
  const session = new EditorSession();
  const run = (...args: string[]) => host.commands.execute(args[0]!, args.slice(1), session);
  run("init"); run("create", "probe", "p");
  const before = run("tree");
  assert.match(before, /probe#p \(probe\) \(second\)/);
  run("move", "p", "5", "8"); run("undo");
  assert.throws(() => run("set", "p", "caption", "blue"), /ambiguous attribute handler: p\/caption/);
  assert.equal(run("tree"), before);
  assert.match(run("redo"), /moved/);
});

test("the real CLI continues after invalid config and can still use the built-in commands", t => {
  const dir = mkdtempSync(join(tmpdir(), "svg-bad-config-"));
  t.after(() => rmSync(dir, {recursive: true, force: true}));
  const file = join(dir, "broken.json");
  writeFileSync(file, "{");
  const result = spawnSync(process.execPath, [join(root, "dist/src/main.js"), "--config", file],
    { cwd: dir, encoding: "utf8", input: "init\ncreate g demo\ntree\n" });
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "error: invalid plugin config\n");
  assert.equal(result.stdout, "canvas 800x600 created\ng#demo created\nsvg (800x600)\n└── g#demo\n");
});

test("invalid decorator results and provider ids fail without corrupting the running document", async () => {
  const host = new EditorHost(assert.fail);
  const broken = {
    manifest: { name: "broken", contributes: { shapes: ["bad"], decorators: ["multiline"] } },
    plugin: { activate(ctx: PluginContext) {
      ctx.register("shapes", "bad", {
        usage: "create bad <id>", svgTag: "g", acceptsText: false, container: true,
        create: () => new Group("wrong"), read: () => new Group("wrong"),
      });
      ctx.register("decorators", "multiline", { labels: () => new Map([[undefined, "one\ntwo"]]) });
    } },
  };
  await host.start([broken]);
  const session = new EditorSession();
  const run = (...args: string[]) => host.commands.execute(args[0]!, args.slice(1), session);
  run("init"); run("create", "g", "original");
  assert.throws(() => run("create", "bad", "new"), /provider must retain shape id: new/);
  assert.throws(() => run("tree"), /invalid tree label: multiline/);
  assert.deepEqual(session.requireDocument().children.map(shape => shape.id), ["original"]);
  assert.equal(run("undo"), "undone: g#original created");
});
