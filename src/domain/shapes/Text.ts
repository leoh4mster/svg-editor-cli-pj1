import { Shape } from "./Shape.js";
import { NumericValue } from "../NumericValue.js";

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
    return [this.label, `(${this.x},${this.y})`, JSON.stringify(this.content), ...this.appearanceDetails()].join(" ");
  }

  override details(): readonly string[] {
    return [`x=${this.x} y=${this.y}`, `text=${JSON.stringify(this.content)}`, ...this.appearanceDetails()];
  }

  override clone(): Text {
    return this.copyAppearanceTo(new Text(this.id, this.x, this.y, this.content));
  }

  override moved(dx: number, dy: number): Text {
    this.validateTranslation(dx, dy);
    return this.copyAppearanceTo(new Text(this.id, this.x + dx, this.y + dy, this.content));
  }

  override scaled(factor: number): Text {
    this.validateScale(factor);
    return this.copyAppearanceTo(new Text(this.id, this.x * factor, this.y * factor, this.content));
  }

  protected override withGeometryAttribute(name: string, value: string): Text {
    if (name === "text") {
      return this.copyAppearanceTo(new Text(this.id, this.x, this.y, value));
    }
    const geometry = { x: this.x, y: this.y };
    if (!Object.hasOwn(geometry, name)) {
      return this.unknownAttribute(name);
    }
    geometry[name as keyof typeof geometry] = NumericValue.parse(value, name);
    return this.copyAppearanceTo(new Text(this.id, geometry.x, geometry.y, this.content));
  }
}
