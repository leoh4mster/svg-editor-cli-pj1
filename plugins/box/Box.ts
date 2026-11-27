import { EditorError, Group, type Shape } from "../../src/extensions/index.js";

/** 保持框体矩形和标题文字作为复合图形的直接子部件。 */
export class Box extends Group {
  private constructor(id: string) { super(id); }

  static fromChildren(id: string, children: readonly Shape[]): Group {
    return new Box(id).withChildren(children);
  }

  override get type(): string { return "box"; }
  override get svgTag(): string { return "g"; }
  override get canUngroup(): boolean { return false; }
  get rectId(): string { return this.id + "-rect"; }
  get labelId(): string { return this.id + "-label"; }

  override get creationSummary(): string {
    return `${this.label} created (g#${this.id} + rect#${this.rectId} + text#${this.labelId})`;
  }

  override get svgAttributes(): ReadonlyMap<string, string> {
    return new Map([...super.svgAttributes, ["data-kind", "box"]]);
  }

  override summary(): string {
    return ["g#" + this.id, ...this.appearanceDetails()].join(" ");
  }

  protected override emptyCopy(): Group { return new Box(this.id); }

  override withChildren(children: readonly Shape[]): Group {
    this.requirePart(this.rectId, "rect", children.find(child => child.id === this.rectId));
    this.requirePart(this.labelId, "text", children.find(child => child.id === this.labelId));
    return super.withChildren(children);
  }

  override replaceChild(id: string, replacement: Shape | undefined, key?: symbol): Shape {
    if (id === this.rectId) this.requirePart(id, "rect", replacement);
    if (id === this.labelId) this.requirePart(id, "text", replacement);
    return super.replaceChild(id, replacement, key);
  }

  private requirePart(id: string, type: string, shape: Shape | undefined): void {
    if (shape?.id !== id || shape.type !== type) {
      throw new EditorError(`${this.label} requires direct child ${type}#${id}`);
    }
  }
}
