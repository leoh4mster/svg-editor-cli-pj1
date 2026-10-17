import { CommandArguments } from "../CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";
import { Command } from "./Command.js";

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
