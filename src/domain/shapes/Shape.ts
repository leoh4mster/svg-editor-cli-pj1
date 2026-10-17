import { EditorError } from "../EditorError.js";

export abstract class Shape {
  private readonly shapeId: string;
  private ownerKey: symbol | undefined;

  protected constructor(id: string) {
    if (id.length === 0 || /[\s\u0000-\u001f\u007f]/u.test(id)) {
      throw new EditorError("id must be nonempty and contain no whitespace or control characters");
    }
    this.shapeId = id;
  }

  get id(): string {
    return this.shapeId;
  }

  abstract get type(): string;

  get label(): string {
    return `${this.type}#${this.id}`;
  }

  get isContainer(): boolean {
    return false;
  }

  get children(): readonly Shape[] {
    return [];
  }

  abstract summary(): string;

  abstract details(): readonly string[];

  walk(): readonly Shape[] {
    return [this, ...this.children.flatMap((child) => child.walk())];
  }

  appendChild(_shape: Shape, _key?: symbol): void {
    throw new EditorError(`not a container: ${this.id}`);
  }

  assertDetached(): void {
    if (this.ownerKey !== undefined) {
      throw new EditorError(`shape already belongs to a document: ${this.id}`);
    }
  }

  attachToDocument(key: symbol): void {
    // Attachment protocol: only the document retains the key needed to edit its tree.
    this.assertDetached();
    this.ownerKey = key;
  }

  protected assertCanModify(key?: symbol): void {
    if (this.ownerKey !== undefined && this.ownerKey !== key) {
      throw new EditorError(`attached container must be modified through its document: ${this.id}`);
    }
  }

  protected coordinate(value: number, name: string): number {
    if (!Number.isFinite(value)) {
      throw new EditorError(`${this.type} ${name} must be a finite number`);
    }
    return value;
  }

  protected length(value: number, name: string): number {
    if (!Number.isFinite(value) || value < 0) {
      throw new EditorError(`${this.type} ${name} must be a finite nonnegative number`);
    }
    return value;
  }

  protected appearance(name: string, value: string | undefined): readonly string[] {
    return value === undefined ? [] : [`${name}=${value}`];
  }
}
