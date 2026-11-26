import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Command, type PluginContext } from "../src/extensions/index.js";
import { PluginLoader } from "../src/host/loader/PluginLoader.js";
import { Registration } from "../src/host/loader/Registration.js";

class Marker extends Command {
  constructor() { super("mark", "Marker for registration tests"); }
  execute(): string { return "mark"; }
}

function fixture(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), "svg-plugins-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const errors: string[] = [];
  const registry = Registration.empty();
  const loader = new PluginLoader(registry, line => errors.push(line));
  const config = join(dir, "plugins.json");
  const add = (path: string, name: string, source: string, commands: string[], extra = {}) => {
    const folder = join(dir, path);
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, "package.json"), JSON.stringify({
      name, type: "module", main: "./entry.js", contributes: { commands }, ...extra,
    }));
    writeFileSync(join(folder, "entry.js"), source);
  };
  const from = async (plugins: unknown[]) => {
    writeFileSync(config, JSON.stringify({ plugins }));
    await loader.fromConfig(config);
  };
  return { errors, registry, loader, config, add, from };
}

const registerSource = `class Info { usage = "info"; description = "probe"; execute() {return "ok"} }
export default {activate(ctx, options) {ctx.register("commands", options.name, new Info())}}`;

test("missing module and missing default report separately; disabled entries skip resolution", async t => {
  const f = fixture(t);
  f.add("no-default", "named-only", "export const value = 1", []);
  f.add("good", "good", registerSource, ["after"]);
  await f.from([{ module: "./disabled", enabled: false }, { module: "./absent" }, { module: "./no-default" },
    { module: "./good", options: { name: "after" } }]);
  assert.deepEqual(f.errors, ["error: plugin not found: ./absent", "error: plugin has no default export: ./no-default"]);
  assert.deepEqual([...f.registry.commands.keys()], ["after"]);
});

test("evaluation and missing transitive imports of an existing package are activation failures", async t => {
  const f = fixture(t);
  f.add("throws", "evaluation", 'throw new Error("module failed")', []);
  f.add("broken", "dependency", 'import "./missing.js"; export default {}', []);
  await f.from([{ module: "./throws" }, { module: "./broken" }]);
  assert.equal(f.errors[0], "error: plugin failed to activate: evaluation (module failed)");
  assert.match(f.errors[1]!, /^error: plugin failed to activate: dependency \(.*missing\.js/u);
});

test("bare package resolution uses the config directory and the import export condition", async t => {
  const f = fixture(t);
  f.add("node_modules/@test/esm", "@test/esm", registerSource, ["resolved"],
    { exports: { import: "./entry.js", require: "./wrong.cjs" } });
  await f.from([{ module: "@test/esm", options: { name: "resolved" } }]);
  assert.deepEqual(f.errors, []);
  assert.deepEqual([...f.registry.commands.keys()], ["resolved"]);
});

test("entire configuration is validated before activation; unreadable, invalid JSON and malformed entries use defaults", async t => {
  const f = fixture(t);
  await f.loader.fromConfig(f.config);
  for (const content of ["{", "null", '{"plugins":{}}']) {
    writeFileSync(f.config, content);
    await f.loader.fromConfig(f.config);
  }
  for (const entry of [{ module: "" }, { module: "x", enabled: 0 }, { module: "x", options: null }, {}, []]) {
    await f.from([{ module: "./would-have-loaded" }, entry]);
  }
  assert.deepEqual(f.errors, Array(9).fill("error: invalid plugin config"));
  assert.equal(f.registry.commands.size, 0);
});

test("manifest compares names and categories; duplicate registration, mismatch and thrown activation roll back a whole batch", async t => {
  const f = fixture(t);
  f.add("first", "first", registerSource, ["first"]);
  f.add("mismatch", "mismatch", registerSource, [], { contributes: { attributes: ["orphan"] } });
  const command = 'class C {usage="ok"; description="ok"; execute(){return "ok"}}';
  f.add("collision", "collision", command + `\nexport default {activate(c){
    c.register("commands","temporary",new C()); try {c.register("commands","first",new C())} catch {} }}`, ["temporary"]);
  f.add("throw", "thrower", command + `\nexport default {async activate(c) {
    c.register("commands","orphan",new C()); await Promise.resolve(); throw new Error("stopped") }}`, ["orphan"]);
  f.add("last", "last", registerSource, ["last"]);
  await f.from([{ module: "./first", options: { name: "first" } }, { module: "./mismatch", options: { name: "orphan" } },
    { module: "./collision" }, { module: "./throw" }, { module: "./last", options: { name: "last" } }]);
  assert.deepEqual(f.errors, [
    'error: plugin manifest mismatch: mismatch (declared: {"shapes":[],"commands":[],"decorators":[],"attributes":["orphan"]}, registered: {"shapes":[],"commands":["orphan"],"decorators":[],"attributes":[]})',
    "error: duplicate registration: commands/first", "error: plugin failed to activate: thrower (stopped)",
  ]);
  assert.deepEqual([...f.registry.commands.keys()], ["first", "last"]);
});

test("code assembly also enforces manifest, intra-plugin duplicates, extension contracts and lifetime of context", async t => {
  const f = fixture(t);
  const manifest = { name: "probe", contributes: { commands: ["one"] } };
  const add = (activate: (ctx: PluginContext) => void) => f.loader.activate({ manifest, plugin: { activate } });
  await add(ctx => { ctx.register("commands", "one", new Marker()); ctx.register("commands", "one", new Marker()); });
  await add(ctx => ctx.register("commands", "two", new Marker()));
  await add(ctx => ctx.register("commands", "one", {} as Command));
  assert.equal(f.registry.commands.size, 0);
  let retained!: PluginContext;
  await add(ctx => { retained = ctx; ctx.register("commands", "one", new Marker()); });
  assert.throws(() => retained.register("commands", "late", new Marker()), /registration is closed/);
  assert.equal(f.errors[0], "error: duplicate registration: commands/one");
  assert.match(f.errors[1]!, /^error: plugin manifest mismatch: probe/);
  assert.equal(f.errors[2], "error: plugin failed to activate: probe (invalid extension contract: commands)");
  assert.deepEqual([...f.registry.commands.keys()], ["one"]);
});
