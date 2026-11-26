import {
  Command, CommandArguments, type EditorSession,
} from "../../../src/extensions/index.js";

export class RedoCommand extends Command {
  constructor() {
    super("redo", "Redo an edit after undo.");
  }

  override execute(args: readonly string[], session: EditorSession): string {
    session.requireDocument();
    new CommandArguments(args, this.usage).expectCount(0);
    return session.redo();
  }
}
