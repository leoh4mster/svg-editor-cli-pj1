import { EditorError } from "../domain/EditorError.js";
import { NumericValue } from "../domain/NumericValue.js";

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
    return NumericValue.parse(this.values[index], name);
  }
}
