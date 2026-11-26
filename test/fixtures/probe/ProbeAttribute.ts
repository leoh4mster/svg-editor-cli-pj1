import { type AttributeHandler, type Shape, type SvgDocument } from "../../../src/extensions/index.js";

export class ProbeAttribute implements AttributeHandler {
  handles(shape: Shape, attribute: string): boolean {
    return shape.type === "probe" && attribute === "caption";
  }
  apply(draft: SvgDocument, shape: Shape, _attribute: string, value: string): string {
    draft.setAttribute(shape.id + "-t", "text", value);
    if (value === "fail") throw new Error("injected failure after first write");
    draft.setAttribute(shape.id, "fill", value);
    return "caption applied";
  }
}
