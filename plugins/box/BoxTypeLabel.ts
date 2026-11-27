import type { DocumentView, TreeDecorator } from "../../src/extensions/index.js";
import { Box } from "./Box.js";

/** 为结构树中的标题框添加类型标签。 */
export class BoxTypeLabel implements TreeDecorator {
  labels(document: DocumentView): ReadonlyMap<string, string> {
    const labels = new Map<string, string>();
    for (const root of document.children) {
      for (const node of root.walk()) {
        if (node instanceof Box) labels.set(node.id, "(box)");
      }
    }
    return labels;
  }
}
