import {
  Command, CommandArguments, type EditorSession,
} from "../../../src/extensions/index.js";

export class UndoCommand extends Command {
  constructor() {
    super("undo", "Undo the most recent successful edit.");
  }

  override execute(args: readonly string[], session: EditorSession): string {
    session.requireDocument();
    new CommandArguments(args, this.usage).expectCount(0);
    return session.undo();
  }
}
