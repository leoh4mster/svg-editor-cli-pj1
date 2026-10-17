import type { SvgDocument } from "../../domain/SvgDocument.js";
import type { EditorSession } from "../EditorSession.js";
import { Command } from "./Command.js";

export abstract class EditCommand extends Command {
  override execute(args: readonly string[], session: EditorSession): string {
    return session.executeEdit((draft) => this.apply(args, draft));
  }

  protected abstract apply(args: readonly string[], document: SvgDocument): string;
}
