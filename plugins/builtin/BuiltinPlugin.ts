import type { Command, Plugin, PluginContext } from "../../src/extensions/index.js";
import { BuiltinShapes } from "./BuiltinShapes.js";

export class BuiltinPlugin implements Plugin {
  constructor(private readonly commands: readonly Command[]) {}

  activate(context: PluginContext): void {
    for (const shape of new BuiltinShapes().providers()) context.register("shapes", shape.svgTag, shape);
    for (const command of this.commands) context.register("commands", command.usage.split(" ")[0]!, command);
  }
}
