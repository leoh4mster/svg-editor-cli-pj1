import { Shape } from "./Shape.js";

export class Rect extends Shape {
  private readonly x: number;
  private readonly y: number;
  private readonly width: number;
  private readonly height: number;
  private readonly fill: string | undefined;

  constructor(id: string, x: number, y: number, width: number, height: number, fill?: string) {
    super(id);
    this.x = this.coordinate(x, "x");
    this.y = this.coordinate(y, "y");
    this.width = this.length(width, "width");
    this.height = this.length(height, "height");
    this.fill = fill;
  }

  override get type(): string {
    return "rect";
  }

  override summary(): string {
    return [this.label, `x=${this.x} y=${this.y} w=${this.width} h=${this.height}`,
      ...this.appearance("fill", this.fill)].join(" ");
  }

  override details(): readonly string[] {
    return [`x=${this.x} y=${this.y} width=${this.width} height=${this.height}`,
      ...this.appearance("fill", this.fill)];
  }
}
