import { CommandArguments } from "../CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";
import { TreeFormatter } from "../formatters/TreeFormatter.js";
import { Command } from "./Command.js";

export class TreeCommand extends Command {
  constructor(private readonly formatter: TreeFormatter = new TreeFormatter()) {
    super("tree [id]", "Show document structure, or one shape's subtree.");
  }

  override execute(args: readonly string[], session: EditorSession): string {
    const document = session.requireDocument();
    new CommandArguments(args, this.usage).expectCount(0, 1);
    return this.formatter.format(document, args[0]);
  }
}
