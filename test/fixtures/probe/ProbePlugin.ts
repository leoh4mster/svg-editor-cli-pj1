import { type Plugin, type PluginContext, type PluginOptions } from "../../../src/extensions/index.js";
import { ProbeProvider } from "./ProbeProvider.js";
import { ProbeCommand } from "./ProbeCommand.js";
import { ProbeAttribute } from "./ProbeAttribute.js";
import { ProbeLabel } from "./ProbeLabel.js";

export class ProbePlugin implements Plugin {
  activate(context: PluginContext, options: PluginOptions): void {
    context.register("shapes", "probe", new ProbeProvider());
    context.register("commands", "probe-info", new ProbeCommand(String(options.message)));
    context.register("attributes", "probe-attributes", new ProbeAttribute());
    context.register("decorators", "probe-label", new ProbeLabel());
  }
}
