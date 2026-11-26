import { AttributeDispatcher } from "../application/AttributeDispatcher.js";
import { ShapeFactory } from "../application/ShapeFactory.js";
import { AddToCommand } from "../../plugins/builtin/commands/AddToCommand.js";
import { BackCommand } from "../../plugins/builtin/commands/BackCommand.js";
import { CanvasCommand } from "../../plugins/builtin/commands/CanvasCommand.js";
import { CreateCommand } from "../../plugins/builtin/commands/CreateCommand.js";
import { DeleteCommand } from "../../plugins/builtin/commands/DeleteCommand.js";
import { FrontCommand } from "../../plugins/builtin/commands/FrontCommand.js";
import { GroupCommand } from "../../plugins/builtin/commands/GroupCommand.js";
import { HelpCommand } from "../../plugins/builtin/commands/HelpCommand.js";
import { InitCommand } from "../../plugins/builtin/commands/InitCommand.js";
import { MoveCommand } from "../../plugins/builtin/commands/MoveCommand.js";
import { RedoCommand } from "../../plugins/builtin/commands/RedoCommand.js";
import { ReadCommand } from "../../plugins/builtin/commands/ReadCommand.js";
import { SaveCommand } from "../../plugins/builtin/commands/SaveCommand.js";
import { ScaleCommand } from "../../plugins/builtin/commands/ScaleCommand.js";
import { SetCommand } from "../../plugins/builtin/commands/SetCommand.js";
import { ShowCommand } from "../../plugins/builtin/commands/ShowCommand.js";
import { TreeCommand } from "../../plugins/builtin/commands/TreeCommand.js";
import { UndoCommand } from "../../plugins/builtin/commands/UndoCommand.js";
import { UngroupCommand } from "../../plugins/builtin/commands/UngroupCommand.js";
import { ShowFormatter } from "../application/formatters/ShowFormatter.js";
import { TreeFormatter } from "../application/formatters/TreeFormatter.js";
import { CommandRegistry } from "../cli/CommandRegistry.js";
import { NodeFileStore } from "../infrastructure/NodeFileStore.js";
import { SvgXmlCodec } from "../infrastructure/svg/SvgXmlCodec.js";

import { createRequire } from "node:module";
import type { Manifest } from "./loader/Registration.js";
import { BuiltinPlugin } from "../../plugins/builtin/BuiltinPlugin.js";
import { Registration } from "./loader/Registration.js";
import { PluginLoader, type CodePlugin } from "./loader/PluginLoader.js";

export class EditorHost {
  private readonly extensions = Registration.empty();
  readonly commands = new CommandRegistry(this.extensions.commands);
  private readonly loader: PluginLoader;

  constructor(report: (line: string) => void) {
    this.loader = new PluginLoader(this.extensions, report);
  }

  async start(plugins: readonly CodePlugin[], config?: string): Promise<void> {
    const registry = this.commands;
    const shapes = new ShapeFactory(this.extensions.shapes);
    const files = new NodeFileStore();
    const codec = new SvgXmlCodec(shapes);
    const builtins = new BuiltinPlugin([
      new HelpCommand(registry, shapes),
      new InitCommand(),
      new CanvasCommand(),
      new ReadCommand(files, codec),
      new SaveCommand(files, codec),
      new CreateCommand(shapes),
      new MoveCommand(),
      new ScaleCommand(),
      new SetCommand(new AttributeDispatcher(this.extensions.attributes)),
      new DeleteCommand(),
      new GroupCommand(shapes),
      new UngroupCommand(),
      new AddToCommand(),
      new FrontCommand(),
      new BackCommand(),
      new UndoCommand(),
      new RedoCommand(),
      new TreeCommand(new TreeFormatter(this.extensions.decorators)),
      new ShowCommand(new ShowFormatter()),
    ]);
    const manifest: Manifest = createRequire(import.meta.url)("../../plugins/builtin/package.json");
    await this.loader.activate({ manifest, plugin: builtins });
    if (config !== undefined) await this.loader.fromConfig(config);
    else {
      for (const plugin of plugins) await this.loader.activate(plugin);
    }
  }
}
