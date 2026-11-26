import { Circle, CommandArguments, Ellipse, Group, Line, Rect, Text, type Shape } from "../../src/extensions/index.js";
import { BasicShapeProvider } from "./BasicShapeProvider.js";

export class BuiltinShapes {
  providers(): BasicShapeProvider[] {
    return [
      new BasicShapeProvider("rect", "create rect <id> <x> <y> <w> <h> [fill]",
        ["x", "y", "width", "height"], false, false, this.createRect),
      new BasicShapeProvider("circle", "create circle <id> <cx> <cy> <r> [fill]",
        ["cx", "cy", "r"], false, false, this.createCircle),
      new BasicShapeProvider("ellipse", "create ellipse <id> <cx> <cy> <rx> <ry> [fill]",
        ["cx", "cy", "rx", "ry"], false, false, this.createEllipse),
      new BasicShapeProvider("line", "create line <id> <x1> <y1> <x2> <y2> [stroke]",
        ["x1", "y1", "x2", "y2"], false, false, this.createLine),
      new BasicShapeProvider("text", 'create text <id> <x> <y> "content"',
        ["x", "y"], true, false, this.createText),
      new BasicShapeProvider("g", "create g <id>",
        [], false, true, this.createGroup),
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
