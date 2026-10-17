import type { SvgDocument } from "../../domain/SvgDocument.js";
import { CommandArguments } from "../CommandArguments.js";
import { EditCommand } from "./EditCommand.js";

export class UngroupCommand extends EditCommand {
  constructor() {
    super("ungroup <gid>", "Promote a nested group's children into its original position.");
  }

  protected override apply(args: readonly string[], document: SvgDocument): string {
    new CommandArguments(args, this.usage).expectCount(1);
    const group = document.findShape(args[0]!);
    const children = document.ungroupShape(group.id);
    return `${group.label} ungrouped (${children.length} children promoted)`;
  }
}
