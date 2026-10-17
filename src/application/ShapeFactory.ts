import { EditorError } from "../domain/EditorError.js";
import { Circle } from "../domain/shapes/Circle.js";
import { Ellipse } from "../domain/shapes/Ellipse.js";
import { Group } from "../domain/shapes/Group.js";
import { Line } from "../domain/shapes/Line.js";
import { Rect } from "../domain/shapes/Rect.js";
import type { Shape } from "../domain/shapes/Shape.js";
import { Text } from "../domain/shapes/Text.js";
import { CommandArguments } from "./CommandArguments.js";

export class ShapeFactory {
  private readonly creators: ReadonlyMap<
    string,
    (id: string, args: readonly string[]) => Shape
  > = new Map<string, (id: string, args: readonly string[]) => Shape>([
    ["rect", this.createRect.bind(this)],
    ["circle", this.createCircle.bind(this)],
    ["ellipse", this.createEllipse.bind(this)],
    ["line", this.createLine.bind(this)],
    ["text", this.createText.bind(this)],
    ["g", this.createGroup.bind(this)],
  ]);

  create(type: string, id: string, args: readonly string[]): Shape {
    // The sole shape-type name dispatch point (future ShapeProvider boundary).
    const create = this.creators.get(type);
    if (create === undefined) {
      throw new EditorError(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
    return create(id, args);
  }

  describeTypes(): readonly string[] {
    return [
      "create rect <id> <x> <y> <w> <h> [fill]",
      "create circle <id> <cx> <cy> <r> [fill]",
      "create ellipse <id> <cx> <cy> <rx> <ry> [fill]",
      "create line <id> <x1> <y1> <x2> <y2> [stroke]",
      'create text <id> <x> <y> "content"',
      "create g <id>",
    ];
  }

  private createRect(id: string, args: readonly string[]): Shape {
    const parameters = new CommandArguments(args, "create rect <id> <x> <y> <w> <h> [fill]");
    parameters.expectCount(4, 5);
    return new Rect(
      id,
      parameters.number(0, "x"),
      parameters.number(1, "y"),
      parameters.number(2, "width"),
      parameters.number(3, "height"),
      args[4],
    );
  }

  private createCircle(id: string, args: readonly string[]): Shape {
    const parameters = new CommandArguments(args, "create circle <id> <cx> <cy> <r> [fill]");
    parameters.expectCount(3, 4);
    return new Circle(
      id,
      parameters.number(0, "cx"),
      parameters.number(1, "cy"),
      parameters.number(2, "r"),
      args[3],
    );
  }

  private createEllipse(id: string, args: readonly string[]): Shape {
    const parameters = new CommandArguments(args, "create ellipse <id> <cx> <cy> <rx> <ry> [fill]");
    parameters.expectCount(4, 5);
    return new Ellipse(
      id,
      parameters.number(0, "cx"),
      parameters.number(1, "cy"),
      parameters.number(2, "rx"),
      parameters.number(3, "ry"),
      args[4],
    );
  }

  private createLine(id: string, args: readonly string[]): Shape {
    const parameters = new CommandArguments(args, "create line <id> <x1> <y1> <x2> <y2> [stroke]");
    parameters.expectCount(4, 5);
    return new Line(
      id,
      parameters.number(0, "x1"),
      parameters.number(1, "y1"),
      parameters.number(2, "x2"),
      parameters.number(3, "y2"),
      args[4],
    );
  }

  private createText(id: string, args: readonly string[]): Shape {
    const parameters = new CommandArguments(args, 'create text <id> <x> <y> "content"');
    parameters.expectCount(3);
    return new Text(id, parameters.number(0, "x"), parameters.number(1, "y"), args[2]!);
  }

  private createGroup(id: string, args: readonly string[]): Shape {
    new CommandArguments(args, "create g <id>").expectCount(0);
    return new Group(id);
  }
}
