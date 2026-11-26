import { EditorError } from "../domain/EditorError.js";
import type { Shape } from "../domain/shapes/Shape.js";
import type { ShapeProvider } from "../extensions/Contracts.js";

export class ShapeFactory {
  constructor(private readonly providers: ReadonlyMap<string, ShapeProvider>) {}

  create(type: string, id: string, args: readonly string[]): Shape {
    const shape = this.requireProvider(type).create(id, args);
    if (shape?.id !== id) throw new EditorError(`provider must retain shape id: ${id}`);
    return shape;
  }

  svgProvider(tag: string, kind: string | undefined): ShapeProvider {
    const specialized = kind === undefined ? undefined : this.providers.get(kind);
    if (specialized?.svgTag === tag) return specialized;
    const provider = this.requireProvider(tag);
    if (provider.svgTag !== tag) throw new EditorError(`unsupported SVG tag: ${tag}`);
    return provider;
  }

  describeTypes(): readonly string[] {
    return [...this.providers.values()].map(provider => provider.usage);
  }

  private requireProvider(name: string): ShapeProvider {
    const provider = this.providers.get(name);
    if (!provider) throw new EditorError(`unknown shape type: ${name} (is the plugin loaded?)`);
    return provider;
  }
}
