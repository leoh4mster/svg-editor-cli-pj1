import type { SvgDocument } from "../../domain/SvgDocument.js";
import type { Shape } from "../../domain/shapes/Shape.js";

export class TreeFormatter {
  format(document: SvgDocument, rootId?: string): string {
    const lines: string[] = [];
    if (rootId === undefined) {
      lines.push(`svg (${document.width}x${document.height})`);
      this.appendChildren(lines, document.children, "");
    } else {
      const root = document.findShape(rootId);
      lines.push(root.summary());
      this.appendChildren(lines, root.children, "");
    }
    return lines.join("\n");
  }

  private appendChildren(lines: string[], children: readonly Shape[], prefix: string): void {
    for (const [index, child] of children.entries()) {
      const last = index === children.length - 1;
      lines.push(`${prefix}${last ? "└──" : "├──"} ${child.summary()}`);
      this.appendChildren(lines, child.children, `${prefix}${last ? "    " : "│   "}`);
    }
  }
}
