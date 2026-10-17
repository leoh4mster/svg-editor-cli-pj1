import type { SvgDocument } from "../../domain/SvgDocument.js";

export class HistoryEntry {
  private readonly before: SvgDocument;
  private readonly after: SvgDocument;

  constructor(
    before: SvgDocument,
    after: SvgDocument,
    private readonly result: string,
  ) {
    // Snapshots never alias the live document or objects returned to callers.
    this.before = before.clone();
    this.after = after.clone();
  }

  restoreBefore(): SvgDocument {
    return this.before.clone();
  }

  restoreAfter(): SvgDocument {
    return this.after.clone();
  }

  get summary(): string {
    return this.result;
  }
}
