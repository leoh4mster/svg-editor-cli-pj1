import {
  Command, CommandArguments, type EditorSession, type ShapeDisplay,
} from "../../../src/extensions/index.js";

export class ShowCommand extends Command {
  constructor(private readonly formatter: ShapeDisplay) {
    super("show <id>", "Show one shape's attributes and parent.");
  }

  override execute(args: readonly string[], session: EditorSession): string {
    const document = session.requireDocument();
    new CommandArguments(args, this.usage).expectCount(1);
    return this.formatter.format(document, args[0]!);
  }
}
