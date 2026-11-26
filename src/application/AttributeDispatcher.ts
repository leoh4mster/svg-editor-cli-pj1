import { EditorError } from "../domain/EditorError.js";
import type { SvgDocument } from "../domain/SvgDocument.js";
import type { AttributeHandler } from "../extensions/Contracts.js";

export class AttributeDispatcher {
  constructor(private readonly handlers: ReadonlyMap<string, AttributeHandler> = new Map()) {}

  apply(document: SvgDocument, id: string, name: string, value: string): string {
    const target = document.findShape(id);
    const matches = [...this.handlers.values()].filter(handler => handler.handles(target, name));
    if (matches.length > 1) throw new EditorError(`ambiguous attribute handler: ${target.id}/${name}`);
    const handler = matches[0];
    if (handler) {
      const result = handler.apply(document, target, name, value);
      if (typeof result !== "string") throw new EditorError("attribute handler must return a message");
      return result;
    }
    const shape = document.setAttribute(id, name, value);
    return `${shape.label} updated: ${name}=${JSON.stringify(value)}`;
  }
}
