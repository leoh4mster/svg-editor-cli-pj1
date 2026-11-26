/** Register the directory command with its local filesystem adapter. */
import type { Plugin, PluginContext } from "../../src/extensions/index.js";
import { DirCommand } from "./DirCommand.js";
import { NodeDirectoryReader } from "./NodeDirectoryReader.js";

export class DirPlugin implements Plugin {
  activate(context: PluginContext): void {
    context.register("commands", "dir", new DirCommand(new NodeDirectoryReader()));
  }
}

export default new DirPlugin();
