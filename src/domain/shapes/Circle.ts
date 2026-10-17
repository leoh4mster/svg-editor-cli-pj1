import { Shape } from "./Shape.js";

export class Circle extends Shape {
  private readonly cx: number;
  private readonly cy: number;
  private readonly r: number;
  private readonly fill: string | undefined;

  constructor(id: string, cx: number, cy: number, r: number, fill?: string) {
    super(id);
    this.cx = this.coordinate(cx, "cx");
    this.cy = this.coordinate(cy, "cy");
    this.r = this.length(r, "r");
    this.fill = fill;
  }

  override get type(): string {
    return "circle";
  }

  override summary(): string {
    return [this.label, ...this.details()].join(" ");
  }

  override details(): readonly string[] {
    return [`cx=${this.cx} cy=${this.cy} r=${this.r}`, ...this.appearance("fill", this.fill)];
  }
}
