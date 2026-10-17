import { CommandArguments } from "../CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";
import { Command } from "./Command.js";

export class CanvasCommand extends Command {
  constructor() {
    super("canvas [w h]", "Show canvas dimensions, or resize with both dimensions.");
  }

  override execute(args: readonly string[], session: EditorSession): string {
    const document = session.requireDocument();
    const parameters = new CommandArguments(args, this.usage);
    parameters.expectCount(0, 2);
    if (args.length === 0) {
      return `canvas ${document.width}x${document.height}`;
    }
    const width = parameters.number(0, "width");
    const height = parameters.number(1, "height");
    session.resizeCanvas(width, height);
    return `canvas resized to ${document.width}x${document.height}`;
  }
}
