import { CommandArguments, NumericValue, Rect, Text, type Shape, type ShapeProvider } from "../../src/extensions/index.js";
import { Box } from "./Box.js";

/** 构造标题框模板，或从有标记的 SVG 分组恢复框体。 */
export class BoxProvider implements ShapeProvider {
  readonly usage = 'create box <id> <x> <y> <w> <h> "label"';
  readonly svgTag = "g";
  readonly container = true;
  readonly acceptsText = false;

  create(id: string, args: readonly string[]): Shape {
    const params = new CommandArguments(args, this.usage);
    params.expectCount(5);
    const x = params.number(0, "x"), y = params.number(1, "y");
    const width = params.number(2, "width"), height = params.number(3, "height");
    return Box.fromChildren(id, [
      new Rect(id + "-rect", x, y, width, height, "#4a90d9"),
      new Text(id + "-label", x + 20, y + height / 2 + 5, args[4]!),
    ]);
  }

  read(id: string, attributes: ReadonlyMap<string, string>, _text: string, readChildren: () => readonly Shape[]): Shape {
    let box: Shape = Box.fromChildren(id, readChildren());
    const extras = new Map(attributes);
    extras.delete("id");
    extras.delete("data-kind");
    for (const name of ["fill", "stroke", "stroke-width"]) {
      const value = extras.get(name);
      if (value === undefined) continue;
      const normalized = name === "stroke-width" ? String(NumericValue.parse(value.trim().replace(/px$/u, ""), name)) : value;
      box = box.withAttribute(name, normalized);
      extras.delete(name);
    }
    return box.withExtraAttributes(extras);
  }
}
