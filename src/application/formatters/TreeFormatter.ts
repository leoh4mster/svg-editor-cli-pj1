import { EditorError } from "../../domain/EditorError.js";
import type { SvgDocument } from "../../domain/SvgDocument.js";
import type { Shape } from "../../domain/shapes/Shape.js";
import type { TreeDecorator } from "../../extensions/Contracts.js";

export class TreeFormatter {
  constructor(private readonly decorators: ReadonlyMap<string, TreeDecorator> = new Map()) {}

  format(document: SvgDocument, rootId?: string, saved?: () => SvgDocument | undefined): string {
    const root = rootId === undefined ? undefined : document.findShape(rootId);
    const labels = new Map<string | undefined, string[]>();
    for (const [name, decorator] of this.decorators) {
      for (const [id, label] of decorator.labels(document.clone(), saved?.())) {
        if (typeof label !== "string" || !label.trim() || /[\r\n]/u.test(label)) {
          throw new EditorError(`invalid tree label: ${name}`);
        }
        const row = labels.get(id) ?? [];
        row.push(label);
        labels.set(id, row);
      }
    }
    const lines: string[] = [];
    const append = (body: string, id: string | undefined): void => {
      lines.push([body, ...(labels.get(id) ?? [])].join(" "));
    };
    const children = (shapes: readonly Shape[], prefix: string): void => {
      for (const [index, child] of shapes.entries()) {
        const last = index === shapes.length - 1;
        append(`${prefix}${last ? "└──" : "├──"} ${child.summary()}`, child.id);
        children(child.children, `${prefix}${last ? "    " : "│   "}`);
      }
    };
    append(root?.summary() ?? `svg (${document.width}x${document.height})`, rootId);
    children(root?.children ?? document.children, "");
    return lines.join("\n");
  }
}
