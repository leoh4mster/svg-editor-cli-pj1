import { BuiltinShapes } from "../../plugins/builtin/BuiltinShapes.js";
import { ShapeFactory } from "../../src/application/ShapeFactory.js";

export function builtinFactory(): ShapeFactory {
  return new ShapeFactory(new Map(new BuiltinShapes().providers().map(p => [p.svgTag, p])));
}
