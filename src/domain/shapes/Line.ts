import { Shape } from "./Shape.js";

export class Line extends Shape {
  private readonly x1: number;
  private readonly y1: number;
  private readonly x2: number;
  private readonly y2: number;
  private readonly stroke: string | undefined;

  constructor(id: string, x1: number, y1: number, x2: number, y2: number, stroke?: string) {
    super(id);
    this.x1 = this.coordinate(x1, "x1");
    this.y1 = this.coordinate(y1, "y1");
    this.x2 = this.coordinate(x2, "x2");
    this.y2 = this.coordinate(y2, "y2");
    this.stroke = stroke;
  }

  override get type(): string {
    return "line";
  }

  override summary(): string {
    return [this.label, `(${this.x1},${this.y1}) -> (${this.x2},${this.y2})`,
      ...this.appearance("stroke", this.stroke)].join(" ");
  }

  override details(): readonly string[] {
    return [`x1=${this.x1} y1=${this.y1} x2=${this.x2} y2=${this.y2}`,
      ...this.appearance("stroke", this.stroke)];
  }
}
