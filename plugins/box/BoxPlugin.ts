import type { Plugin, PluginContext } from "../../src/extensions/index.js";
import { BoxProvider } from "./BoxProvider.js";
import { BoxAttributes } from "./BoxAttributes.js";
import { BoxTypeLabel } from "./BoxTypeLabel.js";

/** 在同一注册事务中装入标题框的构造、属性行为和树标签。 */
export class BoxPlugin implements Plugin {
  activate(context: PluginContext): void {
    context.register("shapes", "box", new BoxProvider());
    context.register("attributes", "box-attributes", new BoxAttributes());
    context.register("decorators", "box-type-label", new BoxTypeLabel());
  }
}

export default new BoxPlugin();
