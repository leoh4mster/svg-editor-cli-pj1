import { EditorError, type AttributeHandler, type Shape, type SvgDocument } from "../../src/extensions/index.js";
import { Box } from "./Box.js";

/** 在当前编辑草稿中把 fill 和 label 转发给对应子部件。 */
export class BoxAttributes implements AttributeHandler {
  handles(shape: Shape, name: string): boolean {
    return shape instanceof Box && (name === "fill" || name === "label");
  }

  apply(document: SvgDocument, shape: Shape, name: string, value: string): string {
    if (!(shape instanceof Box)) throw new EditorError("box attribute requires a box");
    if (name === "fill") {
      document.setAttribute(shape.rectId, "fill", value);
      return `${shape.label} fill propagated to ${shape.rectId}`;
    }
    if (name !== "label") throw new EditorError(`unknown attribute: ${name}`);
    document.setAttribute(shape.labelId, "text", value);
    return `${shape.label} label updated: ${JSON.stringify(value)}`;
  }
}
