import {
  CommandArguments, EditCommand, type SvgDocument,
} from "../../../src/extensions/index.js";

export class AddToCommand extends EditCommand {
  constructor() {
    super("addto <gid> <id>", "Move an existing shape to the end of a group's children.");
  }

  protected override apply(args: readonly string[], document: SvgDocument): string {
    new CommandArguments(args, this.usage).expectCount(2);
    const shape = document.addTo(args[0]!, args[1]!);
    return `${shape.label} moved into ${document.findShape(args[0]!).label}`;
  }
}
