import { CommandArguments } from "../CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";
import { ShowFormatter } from "../formatters/ShowFormatter.js";
import { Command } from "./Command.js";

export class ShowCommand extends Command {
  constructor(private readonly formatter: ShowFormatter = new ShowFormatter()) {
    super("show <id>", "Show one shape's attributes and parent.");
  }

  override execute(args: readonly string[], session: EditorSession): string {
    const document = session.requireDocument();
    new CommandArguments(args, this.usage).expectCount(1);
    return this.formatter.format(document, args[0]!);
  }
}
