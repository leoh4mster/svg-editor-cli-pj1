import { Shape } from "./Shape.js";

export class Text extends Shape {
  private readonly x: number;
  private readonly y: number;
  private readonly content: string;

  constructor(id: string, x: number, y: number, content: string) {
    super(id);
    this.x = this.coordinate(x, "x");
    this.y = this.coordinate(y, "y");
    this.content = content;
  }

  override get type(): string {
    return "text";
  }

  override summary(): string {
    return `${this.label} (${this.x},${this.y}) ${JSON.stringify(this.content)}`;
  }

  override details(): readonly string[] {
    return [`x=${this.x} y=${this.y}`, `text=${JSON.stringify(this.content)}`];
  }
}
