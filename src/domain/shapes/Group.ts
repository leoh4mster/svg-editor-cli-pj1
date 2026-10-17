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
    return this.label;
  }

  override details(): readonly string[] {
    return [];
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
}
