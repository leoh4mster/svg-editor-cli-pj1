import { CommandArguments } from "../CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";
import { Command } from "./Command.js";

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
