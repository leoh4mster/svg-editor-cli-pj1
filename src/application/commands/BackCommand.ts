import type { SvgDocument } from "../../domain/SvgDocument.js";
import { CommandArguments } from "../CommandArguments.js";
import { EditCommand } from "./EditCommand.js";

export class BackCommand extends EditCommand {
  constructor() {
    super("back <id>", "Move to the start of siblings (painted behind others).");
  }

  protected override apply(args: readonly string[], document: SvgDocument): string {
    new CommandArguments(args, this.usage).expectCount(1);
    const shape = document.sendToBack(args[0]!);
    return `${shape.label} sent to back`;
  }
}
