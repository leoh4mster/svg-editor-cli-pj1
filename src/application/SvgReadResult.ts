import type { SvgDocument } from "../domain/SvgDocument.js";

export class SvgReadResult {
  private readonly document: SvgDocument;
  private readonly messages: readonly string[];

  constructor(document: SvgDocument, warnings: readonly string[]) {
    this.document = document.clone();
    this.messages = [...warnings];
  }

  copyDocument(): SvgDocument {
    return this.document.clone();
  }

  get warnings(): readonly string[] {
    return [...this.messages];
  }
}
