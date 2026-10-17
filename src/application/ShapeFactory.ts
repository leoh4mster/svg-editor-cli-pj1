import { EditorError } from "../domain/EditorError.js";
import { NumericValue } from "../domain/NumericValue.js";
import { Circle } from "../domain/shapes/Circle.js";
import { Ellipse } from "../domain/shapes/Ellipse.js";
import { Group } from "../domain/shapes/Group.js";
import { Line } from "../domain/shapes/Line.js";
import { Rect } from "../domain/shapes/Rect.js";
import type { Shape } from "../domain/shapes/Shape.js";
import { Text } from "../domain/shapes/Text.js";
import { CommandArguments } from "./CommandArguments.js";

type ShapeRecipe = {
  readonly create: (id: string, args: readonly string[]) => Shape;
  readonly geometry: readonly string[];
  readonly content: boolean;
  readonly usage: string;
};

export class ShapeFactory {
  private readonly recipes: ReadonlyMap<string, ShapeRecipe> = new Map<string, ShapeRecipe>([
    ["rect", { create: this.createRect.bind(this), geometry: ["x", "y", "width", "height"],
      content: false, usage: "create rect <id> <x> <y> <w> <h> [fill]" }],
    ["circle", { create: this.createCircle.bind(this), geometry: ["cx", "cy", "r"],
      content: false, usage: "create circle <id> <cx> <cy> <r> [fill]" }],
    ["ellipse", { create: this.createEllipse.bind(this), geometry: ["cx", "cy", "rx", "ry"],
      content: false, usage: "create ellipse <id> <cx> <cy> <rx> <ry> [fill]" }],
    ["line", { create: this.createLine.bind(this), geometry: ["x1", "y1", "x2", "y2"],
      content: false, usage: "create line <id> <x1> <y1> <x2> <y2> [stroke]" }],
    ["text", { create: this.createText.bind(this), geometry: ["x", "y"],
      content: true, usage: 'create text <id> <x> <y> "content"' }],
    ["g", { create: this.createGroup.bind(this), geometry: [],
      content: false, usage: "create g <id>" }],
  ]);

  create(type: string, id: string, args: readonly string[]): Shape {
    return this.requireRecipe(type).create(id, args);
  }

  fromSvg(type: string, id: string, attributes: ReadonlyMap<string, string>, content: string): Shape {
    const recipe = this.requireRecipe(type);
    const args = recipe.geometry.map((name) => this.svgNumber(attributes.get(name) ?? "0", name));
    if (recipe.content) {
      args.push(content);
    }
    let shape = recipe.create(id, args);
    for (const name of ["fill", "stroke", "stroke-width"]) {
      const value = attributes.get(name);
      if (value !== undefined) {
        shape = shape.withAttribute(name, name === "stroke-width" ? this.svgNumber(value, name) : value);
      }
    }
    const canonicalNames = new Set(["id", ...recipe.geometry, "fill", "stroke", "stroke-width"]);
    return shape.withExtraAttributes(new Map([...attributes].filter(([name]) => !canonicalNames.has(name))));
  }

  describeTypes(): readonly string[] {
    return [...this.recipes.values()].map((recipe) => recipe.usage);
  }

  private requireRecipe(type: string): ShapeRecipe {
    // The sole shape-type name dispatch point, shared by CLI and SVG input.
    const recipe = this.recipes.get(type);
    if (recipe === undefined) {
      throw new EditorError(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
    return recipe;
  }

  private svgNumber(value: string, name: string): string {
    return String(NumericValue.parse(value.trim().replace(/px$/u, ""), name));
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
