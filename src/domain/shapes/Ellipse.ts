import { Shape } from "./Shape.js";
import { NumericValue } from "../NumericValue.js";

export class Ellipse extends Shape {
  private readonly cx: number;
  private readonly cy: number;
  private readonly rx: number;
  private readonly ry: number;

  constructor(id: string, cx: number, cy: number, rx: number, ry: number, fill?: string) {
    super(id, fill);
    this.cx = this.coordinate(cx, "cx");
    this.cy = this.coordinate(cy, "cy");
    this.rx = this.length(rx, "rx");
    this.ry = this.length(ry, "ry");
  }

  override get type(): string {
    return "ellipse";
  }

  override summary(): string {
    return [this.label, ...this.details()].join(" ");
  }

  override details(): readonly string[] {
    return [`cx=${this.cx} cy=${this.cy} rx=${this.rx} ry=${this.ry}`,
      ...this.appearanceDetails()];
  }

  override clone(): Ellipse {
    return this.copyAppearanceTo(new Ellipse(this.id, this.cx, this.cy, this.rx, this.ry));
  }

  override moved(dx: number, dy: number): Ellipse {
    this.validateTranslation(dx, dy);
    return this.copyAppearanceTo(new Ellipse(this.id, this.cx + dx, this.cy + dy, this.rx, this.ry));
  }

  override scaled(factor: number): Ellipse {
    this.validateScale(factor);
    return this.copyAppearanceTo(new Ellipse(this.id, this.cx * factor, this.cy * factor,
      this.rx * factor, this.ry * factor));
  }

  protected override withGeometryAttribute(name: string, value: string): Ellipse {
    const geometry = { cx: this.cx, cy: this.cy, rx: this.rx, ry: this.ry };
    if (!Object.hasOwn(geometry, name)) {
      return this.unknownAttribute(name);
    }
    geometry[name as keyof typeof geometry] = NumericValue.parse(value, name);
    return this.copyAppearanceTo(new Ellipse(this.id, geometry.cx, geometry.cy, geometry.rx, geometry.ry));
  }
}
