import { EditorError } from "../EditorError.js";
import { NumericValue } from "../NumericValue.js";

export abstract class Shape {
  private readonly shapeId: string;
  private ownerKey: symbol | undefined;
  private fill: string | undefined;
  private stroke: string | undefined;
  private strokeWidth: number | undefined;

  protected constructor(id: string, fill?: string, stroke?: string) {
    if (id.length === 0 || /[\s\u0000-\u001f\u007f]/u.test(id)) {
      throw new EditorError("id must be nonempty and contain no whitespace or control characters");
    }
    this.shapeId = id;
    this.fill = fill;
    this.stroke = stroke;
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

  abstract clone(): Shape;

  abstract moved(dx: number, dy: number): Shape;

  abstract scaled(factor: number): Shape;

  withAttribute(name: string, value: string): Shape {
    if (name === "fill" || name === "stroke" || name === "stroke-width") {
      const copy = this.clone();
      if (name === "fill") {
        copy.fill = value;
      } else if (name === "stroke") {
        copy.stroke = value;
      } else {
        copy.strokeWidth = this.length(NumericValue.parse(value, name), name);
      }
      return copy;
    }
    return this.withGeometryAttribute(name, value);
  }

  walk(): readonly Shape[] {
    return [this, ...this.children.flatMap((child) => child.walk())];
  }

  appendChild(_shape: Shape, _key?: symbol): void {
    throw new EditorError(`not a container: ${this.id}`);
  }

  replaceChild(_id: string, _replacement: Shape | undefined, _key?: symbol): Shape {
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

  protected appearanceDetails(): readonly string[] {
    return [...this.appearance("fill", this.fill), ...this.appearance("stroke", this.stroke),
      ...(this.strokeWidth === undefined ? [] : [`stroke-width=${this.strokeWidth}`])];
  }

  protected copyAppearanceTo<T extends Shape>(copy: T): T {
    copy.fill = this.fill;
    copy.stroke = this.stroke;
    copy.strokeWidth = this.strokeWidth;
    return copy;
  }

  protected validateTranslation(dx: number, dy: number): void {
    this.coordinate(dx, "dx");
    this.coordinate(dy, "dy");
  }

  protected validateScale(factor: number): void {
    if (!Number.isFinite(factor) || factor <= 0) {
      throw new EditorError("scale factor must be positive");
    }
  }

  protected withGeometryAttribute(name: string, _value: string): Shape {
    return this.unknownAttribute(name);
  }

  protected unknownAttribute(name: string): never {
    throw new EditorError(`unknown attribute: ${name}`);
  }
}
