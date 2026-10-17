import type { SvgDocument } from "../../domain/SvgDocument.js";
import { CommandArguments } from "../CommandArguments.js";
import { EditCommand } from "./EditCommand.js";

export class SetCommand extends EditCommand {
  constructor() {
    super("set <id> <attr> <value>", "Set a whitelisted geometry, style, or text attribute.");
  }

  protected override apply(args: readonly string[], document: SvgDocument): string {
    new CommandArguments(args, this.usage).expectCount(3);
    const name = args[1]!;
    const value = args[2]!;
    const shape = document.setAttribute(args[0]!, name, value);
    return `${shape.label} updated: ${name}=${JSON.stringify(value)}`;
  }
}
