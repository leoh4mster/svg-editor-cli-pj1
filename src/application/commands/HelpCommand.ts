import { CommandArguments } from "../CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";
import type { CommandCatalog } from "../ports/CommandCatalog.js";
import { Command } from "./Command.js";

export class HelpCommand extends Command {
  constructor(private readonly catalog: CommandCatalog) {
    super("help", "Show available commands and syntax.");
  }

  override execute(args: readonly string[], _session: EditorSession): string {
    new CommandArguments(args, this.usage).expectCount(0);
    return [
      "Available commands (development stage 1/6):",
      ...this.catalog.describeCommands(),
      "Use Ctrl+D (EOF) to leave the CLI.",
    ].join("\n");
  }
}
