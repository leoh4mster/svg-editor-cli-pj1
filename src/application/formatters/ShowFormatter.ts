import type { SvgDocument } from "../../domain/SvgDocument.js";

export class ShowFormatter {
  format(document: SvgDocument, id: string): string {
    const shape = document.findShape(id);
    const parent = document.parentOf(id);
    return [
      `${shape.label}  parent=${parent?.label ?? "svg"}`,
      ...shape.details().map((line) => `  ${line}`),
    ].join("\n");
  }
}
