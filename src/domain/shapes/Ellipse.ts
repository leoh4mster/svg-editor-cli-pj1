import { Shape } from "./Shape.js";

export class Ellipse extends Shape {
  private readonly cx: number;
  private readonly cy: number;
  private readonly rx: number;
  private readonly ry: number;
  private readonly fill: string | undefined;

  constructor(id: string, cx: number, cy: number, rx: number, ry: number, fill?: string) {
    super(id);
    this.cx = this.coordinate(cx, "cx");
    this.cy = this.coordinate(cy, "cy");
    this.rx = this.length(rx, "rx");
    this.ry = this.length(ry, "ry");
    this.fill = fill;
  }

  override get type(): string {
    return "ellipse";
  }

  override summary(): string {
    return [this.label, ...this.details()].join(" ");
  }

  override details(): readonly string[] {
    return [`cx=${this.cx} cy=${this.cy} rx=${this.rx} ry=${this.ry}`,
      ...this.appearance("fill", this.fill)];
  }
}
