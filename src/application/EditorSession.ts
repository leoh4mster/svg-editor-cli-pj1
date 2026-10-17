import { EditorError } from "../domain/EditorError.js";
import { SvgDocument } from "../domain/SvgDocument.js";

export class EditorSession {
  private document: SvgDocument | undefined;

  initialize(width = 800, height = 600): SvgDocument {
    // A rejected replacement must leave the current document untouched.
    const document = new SvgDocument(width, height);
    this.document = document;
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
    return document;
  }
}
