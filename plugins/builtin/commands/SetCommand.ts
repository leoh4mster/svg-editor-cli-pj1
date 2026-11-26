import {
  CommandArguments, EditCommand, type AttributeSetter, type SvgDocument,
} from "../../../src/extensions/index.js";

export class SetCommand extends EditCommand {
  constructor(private readonly dispatcher: AttributeSetter) {
    super("set <id> <attr> <value>", "Set a whitelisted geometry, style, or text attribute.");
  }

  protected override apply(args: readonly string[], document: SvgDocument): string {
    new CommandArguments(args, this.usage).expectCount(3);
    return this.dispatcher.apply(document, args[0]!, args[1]!, args[2]!);
  }
}
