import { Group } from "../../../src/extensions/index.js";

export class ProbeGroup extends Group {
  override get type(): string { return "probe"; }
  override get svgTag(): string { return "g"; }
  override get canUngroup(): boolean { return false; }
  protected override emptyCopy(): Group { return new ProbeGroup(this.id); }
  override get svgAttributes(): ReadonlyMap<string, string> {
    return new Map([...super.svgAttributes, ["data-kind", this.type]]);
  }
}
