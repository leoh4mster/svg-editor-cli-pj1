import { EditorError } from "../domain/EditorError.js";

export class CommandArguments {
  constructor(
    private readonly values: readonly string[],
    private readonly syntax: string,
  ) {}

  expectCount(...allowedCounts: number[]): void {
    if (!allowedCounts.includes(this.values.length)) {
      throw new EditorError(`usage: ${this.syntax}`);
    }
  }

  number(index: number, name: string): number {
    const text = this.values[index];
    // Accept decimal SVG-style numbers, including fractions and exponents.
    if (
      text === undefined ||
      !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)
    ) {
      throw new EditorError(`invalid number for ${name}: ${text ?? "(missing)"}`);
    }
    const value = Number(text);
    if (!Number.isFinite(value)) {
      throw new EditorError(`invalid number for ${name}: ${text}`);
    }
    return value;
  }
}
