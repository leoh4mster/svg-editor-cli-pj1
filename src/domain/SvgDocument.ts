import { EditorError } from "./EditorError.js";
import type { Shape } from "./shapes/Shape.js";

export class SvgDocument {
  private canvasWidth = 800;
  private canvasHeight = 600;
  private readonly rootChildren: Shape[] = [];
  private readonly shapesById = new Map<string, Shape>();
  private readonly parentsById = new Map<string, Shape | undefined>();
  private readonly mutationKey = Symbol("document mutation");

  constructor(width = 800, height = 600) {
    this.resize(width, height);
  }

  get width(): number {
    return this.canvasWidth;
  }

  get height(): number {
    return this.canvasHeight;
  }

  get children(): readonly Shape[] {
    return [...this.rootChildren];
  }

  findShape(id: string): Shape {
    const shape = this.shapesById.get(id);
    if (shape === undefined) {
      throw new EditorError(`no such shape: ${id}`);
    }
    return shape;
  }

  parentOf(id: string): Shape | undefined {
    this.findShape(id);
    return this.parentsById.get(id);
  }

  addShape(shape: Shape, containerId?: string): void {
    let parent: Shape | undefined;
    if (containerId !== undefined) {
      parent = this.shapesById.get(containerId);
      if (parent === undefined) {
        throw new EditorError(`no such container: ${containerId}`);
      }
      if (!parent.isContainer) {
        throw new EditorError(`not a container: ${containerId}`);
      }
    }

    // Check every descendant before changing the hierarchy or either index.
    const entries: [Shape, Shape | undefined][] = [];
    this.collectNewSubtree(shape, parent, new Set<string>(), entries);
    if (parent === undefined) {
      this.rootChildren.push(shape);
    } else {
      parent.appendChild(shape, this.mutationKey);
    }
    for (const [node, nodeParent] of entries) {
      node.attachToDocument(this.mutationKey);
      this.shapesById.set(node.id, node);
      this.parentsById.set(node.id, nodeParent);
    }
  }

  resize(width: number, height: number): void {
    // Validate the entire change before assigning either dimension.
    this.validateDimension(width, "width");
    this.validateDimension(height, "height");
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  private validateDimension(value: number, name: string): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new EditorError(`canvas ${name} must be a finite positive number`);
    }
  }

  private collectNewSubtree(
    shape: Shape,
    parent: Shape | undefined,
    seenIds: Set<string>,
    entries: [Shape, Shape | undefined][],
  ): void {
    if (seenIds.has(shape.id) || this.shapesById.has(shape.id)) {
      throw new EditorError(`id already exists: ${shape.id}`);
    }
    shape.assertDetached();
    seenIds.add(shape.id);
    entries.push([shape, parent]);
    for (const child of shape.children) {
      this.collectNewSubtree(child, shape, seenIds, entries);
    }
  }
}
