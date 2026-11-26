import { Text, type Shape, type ShapeProvider } from "../../../src/extensions/index.js";
import { ProbeGroup } from "./ProbeGroup.js";

export class ProbeProvider implements ShapeProvider {
  readonly usage = "create probe <id>";
  readonly svgTag = "g";
  readonly container = true;
  readonly acceptsText = false;
  create(id: string): Shape {
    return new ProbeGroup(id).withChildren([new Text(id + "-t", 0, 0, "initial")]);
  }
  read(id: string, _attributes: ReadonlyMap<string, string>, _text: string, children: () => readonly Shape[]): Shape {
    return new ProbeGroup(id).withChildren(children());
  }
}
