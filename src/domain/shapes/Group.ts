import { EditorError } from "../EditorError.js";
import { Shape } from "./Shape.js";

export class Group extends Shape {
  private readonly childShapes: Shape[] = [];

  constructor(id: string) {
    super(id);
  }

  override get type(): string {
    return "g";
  }

  override get isContainer(): boolean {
    return true;
  }

  override get children(): readonly Shape[] {
    return [...this.childShapes];
  }

  override summary(): string {
    return [this.label, ...this.appearanceDetails()].join(" ");
  }

  override details(): readonly string[] {
    return this.appearanceDetails();
  }

  override clone(): Group {
    const copy = this.copyAppearanceTo(new Group(this.id));
    for (const child of this.childShapes) {
      copy.childShapes.push(child.clone());
    }
    return copy;
  }

  override moved(dx: number, dy: number): Group {
    this.validateTranslation(dx, dy);
    const copy = this.copyAppearanceTo(new Group(this.id));
    for (const child of this.childShapes) {
      copy.childShapes.push(child.moved(dx, dy));
    }
    return copy;
  }

  override scaled(factor: number): Group {
    this.validateScale(factor);
    const copy = this.copyAppearanceTo(new Group(this.id));
    for (const child of this.childShapes) {
      copy.childShapes.push(child.scaled(factor));
    }
    return copy;
  }

  override appendChild(shape: Shape, key?: symbol): void {
    this.assertCanModify(key);
    const incoming = shape.walk();
    for (const node of incoming) {
      node.assertDetached();
    }
    if (incoming.includes(this)) {
      throw new EditorError(`cannot add a container into its own descendant: ${shape.id}`);
    }

    const ids = new Set(this.walk().map((node) => node.id));
    for (const node of incoming) {
      if (ids.has(node.id)) {
        throw new EditorError(`id already exists: ${node.id}`);
      }
      ids.add(node.id);
    }
    this.childShapes.push(shape);
  }

  override replaceChild(id: string, replacement: Shape | undefined, key?: symbol): Shape {
    this.assertCanModify(key);
    const index = this.childShapes.findIndex((child) => child.id === id);
    const previous = this.childShapes[index];
    if (previous === undefined) {
      throw new EditorError(`no such shape: ${id}`);
    }
    if (replacement !== undefined) {
      const incoming = replacement.walk();
      for (const node of incoming) {
        node.assertDetached();
      }
      if (incoming.includes(this)) {
        throw new EditorError(`cannot add a container into its own descendant: ${replacement.id}`);
      }
      const removed = new Set(previous.walk());
      const ids = new Set(this.walk().filter((node) => !removed.has(node)).map((node) => node.id));
      for (const node of incoming) {
        if (ids.has(node.id)) {
          throw new EditorError(`id already exists: ${node.id}`);
        }
        ids.add(node.id);
      }
      this.childShapes[index] = replacement;
    } else {
      this.childShapes.splice(index, 1);
    }
    return previous;
  }
}
