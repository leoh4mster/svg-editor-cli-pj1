import type { Plugin, PluginContext } from "../../src/extensions/index.js";
import { ModifiedStar } from "./ModifiedStar.js";

/** 装入独立维护状态的未保存修改标签。 */
export class TreeStarPlugin implements Plugin {
  activate(context: PluginContext): void {
    context.register("decorators", "modified-star", new ModifiedStar());
  }
}

export default new TreeStarPlugin();
