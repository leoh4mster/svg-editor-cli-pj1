import { Shape } from "./Shape.js";
import { NumericValue } from "../NumericValue.js";

export class Circle extends Shape {
  private readonly cx: number;
  private readonly cy: number;
  private readonly r: number;

  constructor(id: string, cx: number, cy: number, r: number, fill?: string) {
    super(id, fill);
    this.cx = this.coordinate(cx, "cx");
    this.cy = this.coordinate(cy, "cy");
    this.r = this.length(r, "r");
  }

  override get type(): string {
    return "circle";
  }

  override summary(): string {
    return [this.label, ...this.details()].join(" ");
  }

  override details(): readonly string[] {
    return [`cx=${this.cx} cy=${this.cy} r=${this.r}`, ...this.appearanceDetails()];
  }

  override clone(): Circle {
    return this.copyAppearanceTo(new Circle(this.id, this.cx, this.cy, this.r));
  }

  override moved(dx: number, dy: number): Circle {
    this.validateTranslation(dx, dy);
    return this.copyAppearanceTo(new Circle(this.id, this.cx + dx, this.cy + dy, this.r));
  }

  override scaled(factor: number): Circle {
    this.validateScale(factor);
    return this.copyAppearanceTo(new Circle(this.id, this.cx * factor, this.cy * factor, this.r * factor));
  }

  protected override withGeometryAttribute(name: string, value: string): Circle {
    const geometry = { cx: this.cx, cy: this.cy, r: this.r };
    if (!Object.hasOwn(geometry, name)) {
      return this.unknownAttribute(name);
    }
    geometry[name as keyof typeof geometry] = NumericValue.parse(value, name);
    return this.copyAppearanceTo(new Circle(this.id, geometry.cx, geometry.cy, geometry.r));
  }
}
