import type { SvgDocument } from "../../domain/SvgDocument.js";
import { CommandArguments } from "../CommandArguments.js";
import { EditCommand } from "./EditCommand.js";

export class MoveCommand extends EditCommand {
  constructor() {
    super("move <id> <dx> <dy>", "Move a shape or an entire group by an offset.");
  }

  protected override apply(args: readonly string[], document: SvgDocument): string {
    const parameters = new CommandArguments(args, this.usage);
    parameters.expectCount(3);
    const dx = parameters.number(1, "dx");
    const dy = parameters.number(2, "dy");
    const shape = document.moveShape(args[0]!, dx, dy);
    return `${shape.label} moved by (${dx},${dy})`;
  }
}
