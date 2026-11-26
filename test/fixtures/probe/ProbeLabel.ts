import { type DocumentView, type TreeDecorator } from "../../../src/extensions/index.js";

export class ProbeLabel implements TreeDecorator {
  labels(doc: DocumentView, saved: DocumentView | undefined): ReadonlyMap<string | undefined, string> {
    const result = new Map<string | undefined, string>([[undefined, `saved-roots=${saved?.children.length}`]]);
    for (const root of doc.children) {
      for (const shape of root.walk()) if (shape.type === "probe") result.set(shape.id, "(probe)");
    }
    return result;
  }
}
