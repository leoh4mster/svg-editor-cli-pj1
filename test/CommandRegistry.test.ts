import assert from "node:assert/strict";
import test from "node:test";
import { EditorSession } from "../src/application/EditorSession.js";
import { CanvasCommand } from "../src/application/commands/CanvasCommand.js";
import { HelpCommand } from "../src/application/commands/HelpCommand.js";
import { InitCommand } from "../src/application/commands/InitCommand.js";
import { CommandRegistry } from "../src/cli/CommandRegistry.js";

test("the registry delegates to a registered command", () => {
  const registry = new CommandRegistry();
  const session = new EditorSession();
  registry.register("init", new InitCommand());
  assert.equal(registry.execute("init", ["320", "240"], session), "canvas 320x240 created");
  assert.equal(session.requireDocument().width, 320);
});

test("duplicate registration is rejected without replacing the existing command", () => {
  const registry = new CommandRegistry();
  registry.register("init", new InitCommand());
  assert.throws(() => registry.register("init", new CanvasCommand()), /command already registered: init/);
  assert.equal(registry.execute("init", [], new EditorSession()), "canvas 800x600 created");
});

test("unknown command names are case sensitive and preserve document state", () => {
  const registry = new CommandRegistry();
  registry.register("init", new InitCommand());
  const session = new EditorSession();
  const original = session.initialize(320, 240);
  for (const name of ["Init", "missing"]) {
    assert.throws(() => registry.execute(name, [], session), { message: `unknown command: ${name}` });
    assert.strictEqual(session.requireDocument(), original);
  }
});

test("help works before init, describes registered commands, and leaves the session empty", () => {
  const registry = new CommandRegistry();
  registry.register("help", new HelpCommand(registry));
  registry.register("init", new InitCommand());
  registry.register("canvas", new CanvasCommand());
  const session = new EditorSession();
  const output = registry.execute("help", [], session);
  assert.match(output, /help/);
  assert.match(output, /init \[w\] \[h\]/);
  assert.match(output, /canvas \[w h\]/);
  assert.throws(() => session.requireDocument(), /no document/);
  assert.throws(() => registry.execute("help", ["extra"], session), /usage: help/);
});
