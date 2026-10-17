import { EditorSession } from "./application/EditorSession.js";
import { CanvasCommand } from "./application/commands/CanvasCommand.js";
import { HelpCommand } from "./application/commands/HelpCommand.js";
import { InitCommand } from "./application/commands/InitCommand.js";
import { Cli } from "./cli/Cli.js";
import { CommandLineParser } from "./cli/CommandLineParser.js";
import { CommandRegistry } from "./cli/CommandRegistry.js";

const registry = new CommandRegistry();
registry.register("help", new HelpCommand(registry));
registry.register("init", new InitCommand());
registry.register("canvas", new CanvasCommand());

const cli = new Cli(
  registry,
  new CommandLineParser(),
  new EditorSession(),
  process.stdin,
  process.stdout,
  process.stderr,
  process.stdin.isTTY === true && process.stdout.isTTY === true,
);

await cli.run();
