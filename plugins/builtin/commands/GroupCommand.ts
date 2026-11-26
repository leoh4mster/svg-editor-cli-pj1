import {
  EditCommand, EditorError, type SvgDocument, type ShapeCatalog,
} from "../../../src/extensions/index.js";

export class GroupCommand extends EditCommand {
  constructor(private readonly shapes: ShapeCatalog) {
    super("group <newGid> <id1> <id2>...", "Group existing shapes in their original document order.");
  }

  protected override apply(args: readonly string[], document: SvgDocument): string {
    if (args.length < 3) {
      throw new EditorError(`usage: ${this.usage}`);
    }
    const group = document.groupShapes(this.shapes.create("g", args[0]!, []), args.slice(1));
    return `${group.label} created with ${group.children.length} children`;
  }
}
