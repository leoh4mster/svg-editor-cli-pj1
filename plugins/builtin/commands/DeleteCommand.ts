import {
  CommandArguments, EditCommand, type SvgDocument,
} from "../../../src/extensions/index.js";

export class DeleteCommand extends EditCommand {
  constructor() {
    super("delete <id>", "Delete a shape and all of its descendants.");
  }

  protected override apply(args: readonly string[], document: SvgDocument): string {
    new CommandArguments(args, this.usage).expectCount(1);
    const shape = document.deleteShape(args[0]!);
    return `${shape.label} deleted`;
  }
}
