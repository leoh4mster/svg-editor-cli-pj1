/** Register the stats query in the plugin context. */
import type { Plugin, PluginContext } from "../../src/extensions/index.js";
import { StatsCommand } from "./StatsCommand.js";

export class StatsPlugin implements Plugin {
  activate(context: PluginContext): void {
    context.register("commands", "stats", new StatsCommand());
  }
}

export default new StatsPlugin();
