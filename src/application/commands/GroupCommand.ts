import { EditorError } from "../../domain/EditorError.js";
import type { SvgDocument } from "../../domain/SvgDocument.js";
import { EditCommand } from "./EditCommand.js";

export class GroupCommand extends EditCommand {
  constructor() {
    super("group <newGid> <id1> <id2>...", "Group existing shapes in their original document order.");
  }

  protected override apply(args: readonly string[], document: SvgDocument): string {
    if (args.length < 3) {
      throw new EditorError(`usage: ${this.usage}`);
    }
    const group = document.groupShapes(args[0]!, args.slice(1));
    return `${group.label} created with ${group.children.length} children`;
  }
}
