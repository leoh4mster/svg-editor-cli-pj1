import { Shape } from "./Shape.js";
import { NumericValue } from "../NumericValue.js";

export class Line extends Shape {
  private readonly x1: number;
  private readonly y1: number;
  private readonly x2: number;
  private readonly y2: number;

  constructor(id: string, x1: number, y1: number, x2: number, y2: number, stroke?: string) {
    super(id, undefined, stroke);
    this.x1 = this.coordinate(x1, "x1");
    this.y1 = this.coordinate(y1, "y1");
    this.x2 = this.coordinate(x2, "x2");
    this.y2 = this.coordinate(y2, "y2");
  }

  override get type(): string {
    return "line";
  }

  override summary(): string {
    return [this.label, `(${this.x1},${this.y1}) -> (${this.x2},${this.y2})`,
      ...this.appearanceDetails()].join(" ");
  }

  override details(): readonly string[] {
    return [`x1=${this.x1} y1=${this.y1} x2=${this.x2} y2=${this.y2}`,
      ...this.appearanceDetails()];
  }

  override clone(): Line {
    return this.copyAppearanceTo(new Line(this.id, this.x1, this.y1, this.x2, this.y2));
  }

  override moved(dx: number, dy: number): Line {
    this.validateTranslation(dx, dy);
    return this.copyAppearanceTo(new Line(this.id, this.x1 + dx, this.y1 + dy, this.x2 + dx, this.y2 + dy));
  }

  override scaled(factor: number): Line {
    this.validateScale(factor);
    return this.copyAppearanceTo(new Line(this.id, this.x1 * factor, this.y1 * factor,
      this.x2 * factor, this.y2 * factor));
  }

  protected override geometryAttributes(): ReadonlyMap<string, string> {
    return new Map([["x1", String(this.x1)], ["y1", String(this.y1)],
      ["x2", String(this.x2)], ["y2", String(this.y2)]]);
  }

  protected override withGeometryAttribute(name: string, value: string): Line {
    const geometry = { x1: this.x1, y1: this.y1, x2: this.x2, y2: this.y2 };
    if (!Object.hasOwn(geometry, name)) {
      return this.unknownAttribute(name);
    }
    geometry[name as keyof typeof geometry] = NumericValue.parse(value, name);
    return this.copyAppearanceTo(new Line(this.id, geometry.x1, geometry.y1, geometry.x2, geometry.y2));
  }
}
