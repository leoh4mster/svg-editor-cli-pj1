import { EditorError } from "./EditorError.js";
import { Group } from "./shapes/Group.js";
import type { Shape } from "./shapes/Shape.js";

export class SvgDocument {
  private canvasWidth = 800;
  private canvasHeight = 600;
  private rootChildren: Shape[] = [];
  private shapesById = new Map<string, Shape>();
  private parentsById = new Map<string, Shape | undefined>();
  private mutationKey = Symbol("document mutation");
  private rootMetadata = new Map<string, string>();

  constructor(width = 800, height = 600, rootMetadata: ReadonlyMap<string, string> = new Map()) {
    this.resize(width, height);
    for (const [name, value] of rootMetadata) {
      if (name === "width" || name === "height" || name === "xmlns") {
        throw new EditorError(`root metadata must not redefine ${name}`);
      }
      if (name === "id" && (value.length === 0 || /[\s\u0000-\u001f\u007f]/u.test(value))) {
        throw new EditorError("id must be nonempty and contain no whitespace or control characters");
      }
      this.rootMetadata.set(name, value);
    }
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

  get svgAttributes(): ReadonlyMap<string, string> {
    return new Map([["width", String(this.width)], ["height", String(this.height)], ...this.rootMetadata]);
  }

  clone(): SvgDocument {
    const copy = new SvgDocument(this.width, this.height, this.rootMetadata);
    for (const shape of this.rootChildren) {
      copy.addShape(shape.clone());
    }
    return copy;
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

  moveShape(id: string, dx: number, dy: number): Shape {
    return this.replaceShape(id, this.findShape(id).moved(dx, dy));
  }

  scaleShape(id: string, factor: number): Shape {
    return this.replaceShape(id, this.findShape(id).scaled(factor));
  }

  setAttribute(id: string, name: string, value: string): Shape {
    return this.replaceShape(id, this.findShape(id).withAttribute(name, value));
  }

  deleteShape(id: string): Shape {
    const shape = this.findShape(id);
    this.replaceSubtree(shape, undefined);
    return shape;
  }

  groupShapes(newId: string, ids: readonly string[]): Shape {
    const group = new Group(newId);
    if (this.shapesById.has(newId) || this.rootMetadata.get("id") === newId) {
      throw new EditorError(`id already exists: ${newId}`);
    }
    if (ids.length < 2) {
      throw new EditorError("group requires at least two shapes");
    }
    const selectedIds = new Set<string>();
    for (const id of ids) {
      if (selectedIds.has(id)) {
        throw new EditorError(`shape selected more than once: ${id}`);
      }
      this.findShape(id);
      selectedIds.add(id);
    }

    // Document preorder, rather than argument order, defines the stable selection order.
    const selected = this.rootChildren.flatMap((root) => root.walk())
      .filter((shape) => selectedIds.has(shape.id));
    for (const shape of selected) {
      if (shape.walk().slice(1).some((descendant) => selectedIds.has(descendant.id))) {
        throw new EditorError(`cannot group a container into its own descendant: ${shape.id}`);
      }
    }

    const parent = this.commonParentOf(selected);
    const siblings = this.childrenOf(parent);
    const affectedBranches = new Set(selected.map((shape) => this.branchUnder(shape, parent)));
    const insertionIndex = siblings.findIndex((shape) => affectedBranches.has(shape));
    if (insertionIndex < 0) {
      throw new EditorError("inconsistent document structure");
    }

    const overrides = new Map<string | undefined, readonly Shape[]>();
    for (const shape of selected) {
      const oldParent = this.parentsById.get(shape.id);
      const remaining = overrides.get(oldParent?.id) ?? this.childrenOf(oldParent);
      overrides.set(oldParent?.id, remaining.filter((child) => child.id !== shape.id));
    }
    const groupedSiblings: Shape[] = [];
    siblings.forEach((shape, index) => {
      if (index === insertionIndex) {
        groupedSiblings.push(group);
      }
      if (!selectedIds.has(shape.id)) {
        groupedSiblings.push(shape);
      }
    });
    overrides.set(parent?.id, groupedSiblings);
    overrides.set(newId, selected);
    this.rewriteStructure(overrides);
    return this.findShape(newId);
  }

  ungroupShape(id: string): readonly Shape[] {
    const group = this.findShape(id);
    if (!group.isContainer) {
      throw new EditorError(`not a container: ${id}`);
    }
    const parent = this.parentsById.get(id);
    if (parent === undefined) {
      throw new EditorError(`cannot ungroup top-level container: ${id}`);
    }
    const promotedIds = group.children.map((child) => child.id);
    const siblings = parent.children.flatMap((child) => child.id === id ? group.children : [child]);
    this.rewriteStructure(new Map([[parent.id, siblings]]));
    return promotedIds.map((childId) => this.findShape(childId));
  }

  addTo(containerId: string, id: string): Shape {
    const parent = this.requireContainer(containerId);
    const shape = this.findShape(id);
    if (parent === shape || this.isAncestor(shape, parent)) {
      throw new EditorError(`cannot add a container into its own descendant: ${id}`);
    }
    const oldParent = this.parentsById.get(id);
    const overrides = new Map<string | undefined, readonly Shape[]>();
    overrides.set(oldParent?.id, this.childrenOf(oldParent).filter((child) => child.id !== id));
    const targetChildren = overrides.get(containerId) ?? parent.children;
    overrides.set(containerId, [...targetChildren, shape]);
    this.rewriteStructure(overrides);
    return this.findShape(id);
  }

  bringToFront(id: string): Shape {
    return this.reorderShape(id, true);
  }

  sendToBack(id: string): Shape {
    return this.reorderShape(id, false);
  }

  resize(width: number, height: number): void {
    // Validate the entire change before assigning either dimension.
    this.validateDimension(width, "width");
    this.validateDimension(height, "height");
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.rootMetadata.set("viewBox", `0 0 ${width} ${height}`);
  }

  private validateDimension(value: number, name: string): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new EditorError(`canvas ${name} must be a finite positive number`);
    }
  }

  private requireContainer(id: string): Shape {
    const shape = this.shapesById.get(id);
    if (shape === undefined) {
      throw new EditorError(`no such container: ${id}`);
    }
    if (!shape.isContainer) {
      throw new EditorError(`not a container: ${id}`);
    }
    return shape;
  }

  private childrenOf(parent: Shape | undefined): readonly Shape[] {
    return parent === undefined ? this.rootChildren : parent.children;
  }

  private isAncestor(ancestor: Shape, shape: Shape): boolean {
    let parent = this.parentsById.get(shape.id);
    while (parent !== undefined) {
      if (parent === ancestor) {
        return true;
      }
      parent = this.parentsById.get(parent.id);
    }
    return false;
  }

  private commonParentOf(shapes: readonly Shape[]): Shape | undefined {
    const first = shapes[0];
    if (first === undefined) {
      throw new EditorError("group requires at least two shapes");
    }
    let parent = this.parentsById.get(first.id);
    while (parent !== undefined) {
      const candidate = parent;
      if (shapes.every((shape) => this.isAncestor(candidate, shape))) {
        return candidate;
      }
      parent = this.parentsById.get(candidate.id);
    }
    return undefined;
  }

  private branchUnder(shape: Shape, parent: Shape | undefined): Shape {
    let branch = shape;
    while (this.parentsById.get(branch.id) !== parent) {
      const ancestor = this.parentsById.get(branch.id);
      if (ancestor === undefined) {
        throw new EditorError("inconsistent document structure");
      }
      branch = ancestor;
    }
    return branch;
  }

  private reorderShape(id: string, front: boolean): Shape {
    const shape = this.findShape(id);
    const parent = this.parentsById.get(id);
    const others = this.childrenOf(parent).filter((child) => child.id !== id);
    // SVG paints later siblings on top of earlier siblings.
    const siblings = front ? [...others, shape] : [shape, ...others];
    this.rewriteStructure(new Map([[parent?.id, siblings]]));
    return this.findShape(id);
  }

  private rewriteStructure(overrides: ReadonlyMap<string | undefined, readonly Shape[]>): void {
    const prepared = new SvgDocument(this.width, this.height, this.rootMetadata);
    const seenIds = new Set<string>();
    const ancestors = new Set<Shape>();
    for (const root of overrides.get(undefined) ?? this.rootChildren) {
      const replacement = this.prepareShape(root, overrides, seenIds, ancestors);
      prepared.addShape(replacement);
    }

    // Preparation owns only fresh nodes. Nothing above can mutate the live tree,
    // so even a late validation failure leaves its topology and indexes intact.
    this.rootChildren = prepared.rootChildren;
    this.shapesById = prepared.shapesById;
    this.parentsById = prepared.parentsById;
    this.mutationKey = prepared.mutationKey;
  }

  private prepareShape(
    shape: Shape,
    overrides: ReadonlyMap<string | undefined, readonly Shape[]>,
    seenIds: Set<string>,
    ancestors: Set<Shape>,
  ): Shape {
    if (ancestors.has(shape)) {
      throw new EditorError(`cannot add a container into its own descendant: ${shape.id}`);
    }
    if (seenIds.has(shape.id)) {
      throw new EditorError(`id already exists: ${shape.id}`);
    }
    seenIds.add(shape.id);
    ancestors.add(shape);
    const children = (overrides.get(shape.id) ?? shape.children)
      .map((child) => this.prepareShape(child, overrides, seenIds, ancestors));
    const replacement = shape.isContainer ? shape.withChildren(children) : shape.clone();
    ancestors.delete(shape);
    return replacement;
  }

  private collectNewSubtree(
    shape: Shape,
    parent: Shape | undefined,
    seenIds: Set<string>,
    entries: [Shape, Shape | undefined][],
    replacedIds: ReadonlySet<string> = new Set<string>(),
  ): void {
    if (seenIds.has(shape.id) || this.rootMetadata.get("id") === shape.id
      || (this.shapesById.has(shape.id) && !replacedIds.has(shape.id))) {
      throw new EditorError(`id already exists: ${shape.id}`);
    }
    shape.assertDetached();
    seenIds.add(shape.id);
    entries.push([shape, parent]);
    for (const child of shape.children) {
      this.collectNewSubtree(child, shape, seenIds, entries, replacedIds);
    }
  }

  private replaceShape(id: string, replacement: Shape): Shape {
    const original = this.findShape(id);
    if (replacement.id !== id) {
      throw new EditorError(`replacement must retain shape id: ${id}`);
    }
    this.replaceSubtree(original, replacement);
    return replacement;
  }

  private replaceSubtree(original: Shape, replacement: Shape | undefined): void {
    const parent = this.parentsById.get(original.id);
    const removed = original.walk();
    const replacedIds = new Set(removed.map((shape) => shape.id));
    const entries: [Shape, Shape | undefined][] = [];
    if (replacement !== undefined) {
      this.collectNewSubtree(replacement, parent, new Set<string>(), entries, replacedIds);
    }

    if (parent === undefined) {
      const index = this.rootChildren.indexOf(original);
      if (index < 0) {
        throw new EditorError("inconsistent document structure");
      }
      if (replacement === undefined) {
        this.rootChildren.splice(index, 1);
      } else {
        this.rootChildren[index] = replacement;
      }
    } else {
      parent.replaceChild(original.id, replacement, this.mutationKey);
    }

    for (const shape of removed) {
      this.shapesById.delete(shape.id);
      this.parentsById.delete(shape.id);
    }
    for (const [shape, shapeParent] of entries) {
      shape.attachToDocument(this.mutationKey);
      this.shapesById.set(shape.id, shape);
      this.parentsById.set(shape.id, shapeParent);
    }
  }
}
