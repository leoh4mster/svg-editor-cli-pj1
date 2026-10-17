import { EditorError } from "../domain/EditorError.js";
import { SvgDocument } from "../domain/SvgDocument.js";
import { CommandHistory } from "./history/CommandHistory.js";

export class EditorSession {
  private document: SvgDocument | undefined;
  private readonly history = new CommandHistory();

  initialize(width = 800, height = 600): SvgDocument {
    // A rejected replacement must leave the current document untouched.
    const document = new SvgDocument(width, height);
    this.document = document;
    this.history.blockAfterIo();
    return document;
  }

  requireDocument(): SvgDocument {
    if (this.document === undefined) {
      throw new EditorError("no document. use 'init' or 'read' first");
    }
    return this.document;
  }

  resizeCanvas(width: number, height: number): SvgDocument {
    const document = this.requireDocument();
    document.resize(width, height);
    this.history.blockAfterIo();
    return document;
  }

  executeEdit(operation: (draft: SvgDocument) => string): string {
    const current = this.requireDocument();
    const draft = current.clone();
    const result = operation(draft);
    // A retained draft must not become an out-of-band handle to committed state.
    const committed = draft.clone();
    this.history.record(current, committed, result);
    this.document = committed;
    return result;
  }

  undo(): string {
    this.requireDocument();
    const [document, result] = this.history.undo();
    this.document = document;
    return result;
  }

  redo(): string {
    this.requireDocument();
    const [document, result] = this.history.redo();
    this.document = document;
    return result;
  }
}
