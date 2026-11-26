import { NumericValue, type Shape, type ShapeProvider } from "../../src/extensions/index.js";

export class BasicShapeProvider implements ShapeProvider {
  constructor(
    readonly svgTag: string,
    readonly usage: string,
    private readonly geometry: readonly string[],
    readonly acceptsText: boolean,
    readonly container: boolean,
    readonly create: (id: string, args: readonly string[]) => Shape,
  ) {}

  read(id: string, attributes: ReadonlyMap<string, string>, text: string, readChildren: () => readonly Shape[]): Shape {
    const args = this.geometry.map(name => this.number(attributes.get(name) ?? "0", name));
    if (this.acceptsText) args.push(text);
    let shape = this.create(id, args);
    for (const name of ["fill", "stroke", "stroke-width"]) {
      const value = attributes.get(name);
      if (value !== undefined) shape = shape.withAttribute(name, name === "stroke-width" ? this.number(value, name) : value);
    }
    const known = new Set(["id", ...this.geometry, "fill", "stroke", "stroke-width"]);
    shape = shape.withExtraAttributes(new Map([...attributes].filter(([name]) => !known.has(name))));
    return this.container ? shape.withChildren(readChildren()) : shape;
  }

  private number(value: string, name: string): string {
    return String(NumericValue.parse(value.trim().replace(/px$/u, ""), name));
  }
}
