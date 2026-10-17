import { EditorError } from "../../domain/EditorError.js";
import type { SvgDocument } from "../../domain/SvgDocument.js";
import { HistoryEntry } from "./HistoryEntry.js";

export class CommandHistory {
  private readonly undoEntries: HistoryEntry[] = [];
  private readonly redoEntries: HistoryEntry[] = [];
  private blockedAfterIo = true;

  record(before: SvgDocument, after: SvgDocument, summary: string): void {
    // Construct both snapshots before changing either stack or the IO barrier.
    const entry = new HistoryEntry(before, after, summary);
    this.undoEntries.push(entry);
    this.redoEntries.length = 0;
    this.blockedAfterIo = false;
  }

  blockAfterIo(): void {
    this.undoEntries.length = 0;
    this.redoEntries.length = 0;
    this.blockedAfterIo = true;
  }

  undo(): readonly [SvgDocument, string] {
    this.assertAllowed();
    const entry = this.undoEntries.at(-1);
    if (entry === undefined) {
      throw new EditorError("nothing to undo");
    }
    const document = entry.restoreBefore();
    this.undoEntries.pop();
    this.redoEntries.push(entry);
    return [document, `undone: ${entry.summary}`];
  }

  redo(): readonly [SvgDocument, string] {
    this.assertAllowed();
    const entry = this.redoEntries.at(-1);
    if (entry === undefined) {
      throw new EditorError("nothing to redo");
    }
    const document = entry.restoreAfter();
    this.redoEntries.pop();
    this.undoEntries.push(entry);
    return [document, `redone: ${entry.summary}`];
  }

  private assertAllowed(): void {
    if (this.blockedAfterIo) {
      // The specification uses this same error for both undo and redo.
      throw new EditorError("undo not allowed after io command");
    }
  }
}
