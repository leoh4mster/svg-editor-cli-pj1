import { EditorError } from "./EditorError.js";

export class NumericValue {
  static parse(text: string | undefined, name: string): number {
    // Match SVG-style decimal numbers without accepting JavaScript-only literals.
    if (text === undefined || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) {
      throw new EditorError(`invalid number for ${name}: ${text ?? "(missing)"}`);
    }
    const value = Number(text);
    if (!Number.isFinite(value)) {
      throw new EditorError(`invalid number for ${name}: ${text}`);
    }
    return value;
  }
}
