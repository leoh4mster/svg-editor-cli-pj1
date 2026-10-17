import { CommandArguments } from "../CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";
import { Command } from "./Command.js";

export class InitCommand extends Command {
  constructor() {
    super("init [w] [h]", "Create a canvas (defaults: 800 x 600).");
  }

  override execute(args: readonly string[], session: EditorSession): string {
    const parameters = new CommandArguments(args, this.usage);
    parameters.expectCount(0, 1, 2);
    const width = args.length >= 1 ? parameters.number(0, "width") : 800;
    const height = args.length === 2 ? parameters.number(1, "height") : 600;
    const document = session.initialize(width, height);
    return `canvas ${document.width}x${document.height} created`;
  }
}
