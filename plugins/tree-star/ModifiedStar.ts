import type { DocumentView, Shape, TreeDecorator } from "../../src/extensions/index.js";

/** 比较当前内容与保存点，并把差异传播到仍存在的祖先。 */
export class ModifiedStar implements TreeDecorator {
  private readonly modifiedIds = new Set<string | undefined>();

  labels(document: DocumentView, saved: DocumentView | undefined): ReadonlyMap<string | undefined, string> {
    this.modifiedIds.clear();
    const previous = new Map<string, string>();
    const collect = (shape: Shape, parent?: string): void => {
      previous.set(shape.id, this.signature(shape, parent));
      for (const child of shape.children) collect(child, shape.id);
    };
    for (const shape of saved?.children ?? []) collect(shape);

    const compare = (shape: Shape, parent?: string): boolean => {
      let dirty = previous.get(shape.id) !== this.signature(shape, parent);
      for (const child of shape.children) {
        if (compare(child, shape.id)) dirty = true;
      }
      if (dirty) this.modifiedIds.add(shape.id);
      return dirty;
    };
    let dirty = !saved || this.rootSignature(document) !== this.rootSignature(saved);
    for (const shape of document.children) {
      if (compare(shape)) dirty = true;
    }
    if (dirty) this.modifiedIds.add(undefined);
    return new Map([...this.modifiedIds].map(id => [id, "*"]));
  }

  private signature(shape: Shape, parent: string | undefined): string {
    return JSON.stringify([shape.type, shape.svgTag, this.attributes(shape.svgAttributes),
      shape.textContent, parent, shape.children.map(child => child.id)]);
  }

  private rootSignature(document: DocumentView): string {
    return JSON.stringify([document.width, document.height, this.attributes(document.svgAttributes),
      document.children.map(child => child.id)]);
  }

  private attributes(attributes: ReadonlyMap<string, string>): readonly (readonly [string, string])[] {
    return [...attributes].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  }
}
