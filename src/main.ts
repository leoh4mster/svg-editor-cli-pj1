import { EditorSession } from "./application/EditorSession.js";
import { ShapeFactory } from "./application/ShapeFactory.js";
import { AddToCommand } from "./application/commands/AddToCommand.js";
import { BackCommand } from "./application/commands/BackCommand.js";
import { CanvasCommand } from "./application/commands/CanvasCommand.js";
import { CreateCommand } from "./application/commands/CreateCommand.js";
import { DeleteCommand } from "./application/commands/DeleteCommand.js";
import { FrontCommand } from "./application/commands/FrontCommand.js";
import { GroupCommand } from "./application/commands/GroupCommand.js";
import { HelpCommand } from "./application/commands/HelpCommand.js";
import { InitCommand } from "./application/commands/InitCommand.js";
import { MoveCommand } from "./application/commands/MoveCommand.js";
import { RedoCommand } from "./application/commands/RedoCommand.js";
import { ReadCommand } from "./application/commands/ReadCommand.js";
import { SaveCommand } from "./application/commands/SaveCommand.js";
import { ScaleCommand } from "./application/commands/ScaleCommand.js";
import { SetCommand } from "./application/commands/SetCommand.js";
import { ShowCommand } from "./application/commands/ShowCommand.js";
import { TreeCommand } from "./application/commands/TreeCommand.js";
import { UndoCommand } from "./application/commands/UndoCommand.js";
import { UngroupCommand } from "./application/commands/UngroupCommand.js";
import { ShowFormatter } from "./application/formatters/ShowFormatter.js";
import { TreeFormatter } from "./application/formatters/TreeFormatter.js";
import { Cli } from "./cli/Cli.js";
import { CommandLineParser } from "./cli/CommandLineParser.js";
import { CommandRegistry } from "./cli/CommandRegistry.js";
import { NodeFileStore } from "./infrastructure/NodeFileStore.js";
import { SvgXmlCodec } from "./infrastructure/svg/SvgXmlCodec.js";

const registry = new CommandRegistry();
const shapes = new ShapeFactory();
const files = new NodeFileStore();
const codec = new SvgXmlCodec(shapes);
registry.register("help", new HelpCommand(registry, shapes));
registry.register("init", new InitCommand());
registry.register("canvas", new CanvasCommand());
registry.register("read", new ReadCommand(files, codec));
registry.register("save", new SaveCommand(files, codec));
registry.register("create", new CreateCommand(shapes));
registry.register("move", new MoveCommand());
registry.register("scale", new ScaleCommand());
registry.register("set", new SetCommand());
registry.register("delete", new DeleteCommand());
registry.register("group", new GroupCommand());
registry.register("ungroup", new UngroupCommand());
registry.register("addto", new AddToCommand());
registry.register("front", new FrontCommand());
registry.register("back", new BackCommand());
registry.register("undo", new UndoCommand());
registry.register("redo", new RedoCommand());
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
