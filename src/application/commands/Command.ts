import type { EditorSession } from "../EditorSession.js";

export abstract class Command {
  protected constructor(
    private readonly syntax: string,
    private readonly summary: string,
  ) {}

  get usage(): string {
    return this.syntax;
  }

  get description(): string {
    return this.summary;
  }

  abstract execute(args: readonly string[], session: EditorSession): string;
}
