import {
  Command, CommandArguments, type CommandCatalog, type EditorSession, type ShapeCatalog,
} from "../../../src/extensions/index.js";

export class HelpCommand extends Command {
  constructor(
    private readonly catalog: CommandCatalog,
    private readonly shapes?: ShapeCatalog,
  ) {
    super("help", "Show available commands and syntax.");
  }

  override execute(args: readonly string[], _session: EditorSession): string {
    new CommandArguments(args, this.usage).expectCount(0);
    return [
      "Available commands:",
      ...this.catalog.describeCommands(),
      ...(this.shapes === undefined ? [] : [
        "Shape creation (each type also supports a trailing in <containerId>):",
        ...this.shapes.describeTypes().map((syntax) => `  ${syntax}`),
      ]),
      "Use Ctrl+D (EOF) to leave the CLI.",
    ].join("\n");
  }
}
