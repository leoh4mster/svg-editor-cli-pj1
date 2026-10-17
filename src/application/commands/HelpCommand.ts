import { CommandArguments } from "../CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";
import type { ShapeFactory } from "../ShapeFactory.js";
import type { CommandCatalog } from "../ports/CommandCatalog.js";
import { Command } from "./Command.js";

export class HelpCommand extends Command {
  constructor(
    private readonly catalog: CommandCatalog,
    private readonly shapes?: ShapeFactory,
  ) {
    super("help", "Show available commands and syntax.");
  }

  override execute(args: readonly string[], _session: EditorSession): string {
    new CommandArguments(args, this.usage).expectCount(0);
    return [
      "Available commands (development stage 5/6):",
      ...this.catalog.describeCommands(),
      ...(this.shapes === undefined ? [] : [
        "Shape creation (each type also supports a trailing in <containerId>):",
        ...this.shapes.describeTypes().map((syntax) => `  ${syntax}`),
      ]),
      "Use Ctrl+D (EOF) to leave the CLI.",
    ].join("\n");
  }
}
