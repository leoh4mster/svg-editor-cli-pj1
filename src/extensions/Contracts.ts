import type { Command } from "../application/commands/Command.js";
import type { SvgDocument } from "../domain/SvgDocument.js";
import type { Shape } from "../domain/shapes/Shape.js";

export interface ShapeProvider {
  readonly usage: string;
  readonly svgTag: string;
  readonly container: boolean;
  readonly acceptsText: boolean;
  create(id: string, args: readonly string[]): Shape;
  read(id: string, attributes: ReadonlyMap<string, string>, text: string, readChildren: () => readonly Shape[]): Shape;
}

export type DocumentView = Pick<SvgDocument, "width" | "height" | "svgAttributes" | "children" | "findShape" | "parentOf">;

export interface TreeDecorator {
  /** One calculation per render. The undefined key addresses the canvas row. */
  labels(document: DocumentView, saved: DocumentView | undefined): ReadonlyMap<string | undefined, string>;
}

export interface AttributeHandler {
  handles(shape: Shape, attribute: string): boolean;
  apply(draft: SvgDocument, shape: Shape, attribute: string, value: string): string;
}

export interface ShapeCatalog {
  create(type: string, id: string, args: readonly string[]): Shape;
  describeTypes(): readonly string[];
}

export interface AttributeSetter {
  apply(document: SvgDocument, id: string, name: string, value: string): string;
}

export interface TreeDisplay {
  format(document: SvgDocument, id?: string, saved?: () => SvgDocument | undefined): string;
}

export interface ShapeDisplay {
  format(document: SvgDocument, id: string): string;
}

export interface Contributions {
  shapes: ShapeProvider;
  commands: Command;
  decorators: TreeDecorator;
  attributes: AttributeHandler;
}

export interface PluginContext {
  register<K extends keyof Contributions>(category: K, name: string, extension: Contributions[K]): void;
}

export type PluginOptions = Readonly<Record<string, unknown>>;

export interface Plugin {
  activate(context: PluginContext, options: PluginOptions): void | Promise<void>;
}
