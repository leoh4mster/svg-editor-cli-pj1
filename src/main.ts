import { EditorSession } from "./application/EditorSession.js";
import { ShapeFactory } from "./application/ShapeFactory.js";
import { CanvasCommand } from "./application/commands/CanvasCommand.js";
import { CreateCommand } from "./application/commands/CreateCommand.js";
import { HelpCommand } from "./application/commands/HelpCommand.js";
import { InitCommand } from "./application/commands/InitCommand.js";
import { ShowCommand } from "./application/commands/ShowCommand.js";
import { TreeCommand } from "./application/commands/TreeCommand.js";
import { ShowFormatter } from "./application/formatters/ShowFormatter.js";
import { TreeFormatter } from "./application/formatters/TreeFormatter.js";
import { Cli } from "./cli/Cli.js";
import { CommandLineParser } from "./cli/CommandLineParser.js";
import { CommandRegistry } from "./cli/CommandRegistry.js";

const registry = new CommandRegistry();
const shapes = new ShapeFactory();
registry.register("help", new HelpCommand(registry, shapes));
registry.register("init", new InitCommand());
registry.register("canvas", new CanvasCommand());
registry.register("create", new CreateCommand(shapes));
registry.register("tree", new TreeCommand(new TreeFormatter()));
registry.register("show", new ShowCommand(new ShowFormatter()));

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
