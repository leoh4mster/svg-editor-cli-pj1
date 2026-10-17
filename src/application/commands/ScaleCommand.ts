import type { SvgDocument } from "../../domain/SvgDocument.js";
import { CommandArguments } from "../CommandArguments.js";
import { EditCommand } from "./EditCommand.js";

export class ScaleCommand extends EditCommand {
  constructor() {
    super("scale <id> <factor>", "Scale geometric positions and sizes by a positive factor.");
  }

  protected override apply(args: readonly string[], document: SvgDocument): string {
    const parameters = new CommandArguments(args, this.usage);
    parameters.expectCount(2);
    const factor = parameters.number(1, "factor");
    const shape = document.scaleShape(args[0]!, factor);
    return `${shape.label} scaled by ${factor}`;
  }
}
