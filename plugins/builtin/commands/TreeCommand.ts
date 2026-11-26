import {
  Command, CommandArguments, type EditorSession, type TreeDisplay,
} from "../../../src/extensions/index.js";

export class TreeCommand extends Command {
  constructor(private readonly formatter: TreeDisplay) {
    super("tree [id]", "Show document structure, or one shape's subtree.");
  }

  override execute(args: readonly string[], session: EditorSession): string {
    const document = session.requireDocument();
    new CommandArguments(args, this.usage).expectCount(0, 1);
    return this.formatter.format(document, args[0], () => session.savedSnapshot());
  }
}
