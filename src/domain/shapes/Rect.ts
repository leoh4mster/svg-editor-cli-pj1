import { Shape } from "./Shape.js";
import { NumericValue } from "../NumericValue.js";

export class Rect extends Shape {
  private readonly x: number;
  private readonly y: number;
  private readonly width: number;
  private readonly height: number;

  constructor(id: string, x: number, y: number, width: number, height: number, fill?: string) {
    super(id, fill);
    this.x = this.coordinate(x, "x");
    this.y = this.coordinate(y, "y");
    this.width = this.length(width, "width");
    this.height = this.length(height, "height");
  }

  override get type(): string {
    return "rect";
  }

  override summary(): string {
    return [this.label, `x=${this.x} y=${this.y} w=${this.width} h=${this.height}`,
      ...this.appearanceDetails()].join(" ");
  }

  override details(): readonly string[] {
    return [`x=${this.x} y=${this.y} width=${this.width} height=${this.height}`,
      ...this.appearanceDetails()];
  }

  override clone(): Rect {
    return this.copyAppearanceTo(new Rect(this.id, this.x, this.y, this.width, this.height));
  }

  override moved(dx: number, dy: number): Rect {
    this.validateTranslation(dx, dy);
    return this.copyAppearanceTo(new Rect(this.id, this.x + dx, this.y + dy, this.width, this.height));
  }

  override scaled(factor: number): Rect {
    this.validateScale(factor);
    return this.copyAppearanceTo(new Rect(this.id, this.x * factor, this.y * factor,
      this.width * factor, this.height * factor));
  }

  protected override geometryAttributes(): ReadonlyMap<string, string> {
    return new Map([["x", String(this.x)], ["y", String(this.y)],
      ["width", String(this.width)], ["height", String(this.height)]]);
  }

  protected override withGeometryAttribute(name: string, value: string): Rect {
    const geometry = { x: this.x, y: this.y, width: this.width, height: this.height };
    if (!Object.hasOwn(geometry, name)) {
      return this.unknownAttribute(name);
    }
    geometry[name as keyof typeof geometry] = NumericValue.parse(value, name);
    return this.copyAppearanceTo(new Rect(this.id, geometry.x, geometry.y, geometry.width, geometry.height));
  }
}
