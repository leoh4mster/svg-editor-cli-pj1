import type { SvgDocument } from "../../domain/SvgDocument.js";
import { CommandArguments } from "../CommandArguments.js";
import { EditCommand } from "./EditCommand.js";

export class FrontCommand extends EditCommand {
  constructor() {
    super("front <id>", "Move to the end of siblings (painted on top).");
  }

  protected override apply(args: readonly string[], document: SvgDocument): string {
    new CommandArguments(args, this.usage).expectCount(1);
    const shape = document.bringToFront(args[0]!);
    return `${shape.label} brought to front`;
  }
}
