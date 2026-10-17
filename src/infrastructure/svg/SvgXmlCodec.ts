import { SaxesParser } from "saxes";
import { NC_NAME_RE } from "xmlchars/xmlns/1.0/ed3.js";
import type { SvgCodec } from "../../application/ports/SvgCodec.js";
import { ShapeFactory } from "../../application/ShapeFactory.js";
import { SvgReadResult } from "../../application/SvgReadResult.js";
import { EditorError } from "../../domain/EditorError.js";
import { NumericValue } from "../../domain/NumericValue.js";
import { SvgDocument } from "../../domain/SvgDocument.js";
import type { Shape } from "../../domain/shapes/Shape.js";
import { SvgElement } from "./SvgElement.js";

export class SvgXmlCodec implements SvgCodec {
  private readonly svgNamespace = "http://www.w3.org/2000/svg";
  private readonly numberPattern = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?";

  constructor(private readonly factory: ShapeFactory) {}

  decode(xml: string): SvgReadResult {
    const root = this.parse(xml);
    const reservedIds = this.collectIds(root);
    const rootAttributes = new Map(root.attributes);
    const viewBox = this.viewBox(rootAttributes.get("viewBox"));
    if (viewBox !== undefined) {
      rootAttributes.set("viewBox", viewBox.join(" "));
    }
    const width = this.dimension(rootAttributes.get("width"), "width", viewBox?.[2] ?? 800);
    const height = this.dimension(rootAttributes.get("height"), "height", viewBox?.[3] ?? 600);
    rootAttributes.delete("width");
    rootAttributes.delete("height");
    rootAttributes.delete("xmlns");
    const document = new SvgDocument(width, height, rootAttributes);
    if (/[^ \t\r\n]/u.test(root.text)) {
      this.invalid("text is only supported inside text elements");
    }
    const counters = new Map<string, number>();
    const warnings: string[] = [];
    for (const child of root.children) {
      document.addShape(this.buildShape(child, reservedIds, counters, warnings));
    }
    return new SvgReadResult(document, warnings);
  }

  encode(document: SvgDocument): string {
    const rootAttributes = new Map<string, string>([["xmlns", this.svgNamespace], ...document.svgAttributes]);
    const attributes = this.encodeAttributes(rootAttributes);
    const children = document.children.map((shape) => this.encodeShape(shape, 1));
    const output = `<?xml version="1.0" encoding="UTF-8"?>\n<svg${attributes}>\n${children.length === 0 ? "" : `${children.join("\n")}\n`}</svg>\n`;
    // Namespace bindings and expanded attribute names must also form valid XML.
    // This validation does not construct a document or emit import warnings.
    this.validateSerializedXml(output);
    return output;
  }

  private parse(xml: string): SvgElement {
    const parser = this.parser();
    const stack: SvgElement[] = [];
    let root: SvgElement | undefined;
    parser.on("opentag", (tag) => {
      if (tag.uri !== "" && tag.uri !== this.svgNamespace) {
        this.invalid(`unsupported element namespace: ${tag.uri}`);
      }
      const attributes = new Map<string, string>();
      for (const attribute of Object.values(tag.attributes)) {
        this.validateAttribute(attribute.name, attribute.value);
        attributes.set(attribute.name, attribute.value);
      }
      // A moved node must retain the bindings required by its own attributes,
      // even when the original declaration belonged to an ancestor group.
      for (const attribute of Object.values(tag.attributes)) {
        if (attribute.prefix !== "" && attribute.prefix !== "xml" && attribute.prefix !== "xmlns") {
          attributes.set(`xmlns:${attribute.prefix}`, attribute.uri);
        }
      }
      const element = new SvgElement(tag.local, attributes);
      const parent = stack.at(-1);
      if (parent === undefined) {
        if (root !== undefined) {
          this.invalid("multiple root elements");
        }
        if (tag.local !== "svg") {
          this.invalid("root element must be svg");
        }
        root = element;
      } else {
        parent.appendChild(element);
      }
      stack.push(element);
    });
    parser.on("closetag", () => { stack.pop(); });
    const appendText = (text: string): void => {
      const current = stack.at(-1);
      if (current === undefined) {
        if (/[^ \t\r\n]/u.test(text)) {
          this.invalid("text outside the root element");
        }
      } else {
        current.appendText(text);
      }
    };
    parser.on("text", appendText);
    parser.on("cdata", appendText);
    this.parseWith(parser, xml);
    if (root === undefined) {
      this.invalid("missing svg root element");
    }
    return root;
  }

  private parser(): SaxesParser<{ xmlns: true; defaultXMLVersion: "1.0"; forceXMLVersion: true }> {
    const parser = new SaxesParser({ xmlns: true, defaultXMLVersion: "1.0", forceXMLVersion: true } as const);
    parser.on("error", (error) => { this.invalid(error.message); });
    parser.on("doctype", () => { this.invalid("DOCTYPE declarations are not supported"); });
    parser.on("processinginstruction", () => { this.invalid("processing instructions are not supported"); });
    parser.on("xmldecl", (declaration) => {
      if (declaration.version !== "1.0") {
        this.invalid("only XML 1.0 is supported");
      }
    });
    return parser;
  }

  private parseWith(parser: ReturnType<SvgXmlCodec["parser"]>, xml: string): void {
    try {
      parser.write(xml).close();
    } catch (error) {
      if (error instanceof EditorError) {
        throw error;
      }
      this.invalid(error instanceof Error ? error.message : "malformed XML");
    }
  }

  private validateSerializedXml(xml: string): void {
    this.parseWith(this.parser(), xml);
  }

  private collectIds(root: SvgElement): Set<string> {
    const ids = new Set<string>();
    for (const element of root.preorder()) {
      const id = element.attributes.get("id");
      if (id === undefined || id === "") {
        continue;
      }
      if (/[\s\u0000-\u001f\u007f]/u.test(id)) {
        throw new EditorError("id must be nonempty and contain no whitespace or control characters");
      }
      if (ids.has(id)) {
        throw new EditorError(`id already exists: ${id}`);
      }
      ids.add(id);
    }
    return ids;
  }

  private buildShape(
    element: SvgElement,
    reservedIds: Set<string>,
    counters: Map<string, number>,
    warnings: string[],
  ): Shape {
    const attributes = element.attributes;
    let id = attributes.get("id");
    if (id === undefined || id === "") {
      let counter = counters.get(element.type) ?? 1;
      while (reservedIds.has(`${element.type}${counter}`)) {
        counter += 1;
      }
      id = `${element.type}${counter}`;
      counters.set(element.type, counter + 1);
      reservedIds.add(id);
      warnings.push(`warning: assigned id ${id} to unnamed <${element.type}>`);
    }
    let shape = this.factory.fromSvg(element.type, id, attributes, element.text);
    if (shape.textContent === undefined && /[^ \t\r\n]/u.test(element.text)) {
      this.invalid(`text is not supported inside <${element.type}>`);
    }
    if (!shape.isContainer && element.children.length !== 0) {
      this.invalid(`child elements are not supported inside <${element.type}>`);
    }
    if (shape.isContainer) {
      const children = element.children.map((child) => this.buildShape(child, reservedIds, counters, warnings));
      shape = shape.withChildren(children);
    }
    return shape;
  }

  private viewBox(text: string | undefined): readonly number[] | undefined {
    if (text === undefined) {
      return undefined;
    }
    const separator = "(?:[ \\t\\r\\n]*,[ \\t\\r\\n]*|[ \\t\\r\\n]+)";
    const pattern = new RegExp(`^(${this.numberPattern})${separator}(${this.numberPattern})${separator}(${this.numberPattern})${separator}(${this.numberPattern})$`);
    const match = pattern.exec(text.trim());
    if (match === null) {
      this.invalid("viewBox must contain four finite numbers");
    }
    const values = match.slice(1).map((value) => NumericValue.parse(value, "viewBox"));
    if (values[2]! <= 0 || values[3]! <= 0) {
      this.invalid("viewBox width and height must be positive");
    }
    return values;
  }

  private dimension(text: string | undefined, name: string, fallback: number): number {
    if (text === undefined) {
      return fallback;
    }
    const match = new RegExp(`^(${this.numberPattern})(?:px)?$`).exec(text.trim());
    if (match === null) {
      this.invalid(`${name} must be a positive number in px`);
    }
    const value = NumericValue.parse(match[1], name);
    if (value <= 0) {
      this.invalid(`${name} must be positive`);
    }
    return value;
  }

  private encodeShape(shape: Shape, depth: number): string {
    this.validateName(shape.type);
    const indent = "  ".repeat(depth);
    const attributes = this.encodeAttributes(shape.svgAttributes);
    if (shape.textContent !== undefined) {
      if (shape.children.length !== 0) {
        this.invalid(`child elements are not supported inside <${shape.type}>`);
      }
      return `${indent}<${shape.type}${attributes}>${this.encodeText(shape.textContent)}</${shape.type}>`;
    }
    if (shape.children.length === 0) {
      return `${indent}<${shape.type}${attributes}/>`;
    }
    if (!shape.isContainer) {
      this.invalid(`child elements are not supported inside <${shape.type}>`);
    }
    const children = shape.children.map((child) => this.encodeShape(child, depth + 1));
    return `${indent}<${shape.type}${attributes}>\n${children.join("\n")}\n${indent}</${shape.type}>`;
  }

  private encodeAttributes(attributes: ReadonlyMap<string, string>): string {
    return [...attributes].map(([name, value]) => {
      this.validateAttribute(name, value);
      return ` ${name}="${this.encodeText(value).replaceAll('"', "&quot;").replaceAll("'", "&apos;").replaceAll("\t", "&#9;").replaceAll("\n", "&#10;")}"`;
    }).join("");
  }

  private encodeText(text: string): string {
    for (const character of text) {
      const point = character.codePointAt(0)!;
      if (!(point === 9 || point === 10 || point === 13 || (point >= 0x20 && point <= 0xd7ff)
        || (point >= 0xe000 && point <= 0xfffd) || (point >= 0x10000 && point <= 0x10ffff))) {
        this.invalid("text contains a character forbidden in XML 1.0");
      }
    }
    return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\r", "&#13;");
  }

  private validateAttribute(name: string, value: string): void {
    this.validateName(name);
    if (name === "xmlns") {
      if (value !== this.svgNamespace) {
        this.invalid(`unsupported default namespace: ${value}`);
      }
      return;
    }
    if (name.startsWith("xmlns:")) {
      return;
    }
    const localName = name.split(":").at(-1)!.toLowerCase();
    if (localName === "transform" || localName === "style" || localName === "href" || localName.startsWith("on")) {
      this.invalid(`unsupported attribute: ${name}`);
    }
  }

  private validateName(name: string): void {
    const parts = name.split(":");
    if (parts.length > 2 || parts.some((part) => !NC_NAME_RE.test(part))) {
      this.invalid(`invalid XML name: ${name}`);
    }
  }

  private invalid(message: string): never {
    throw new EditorError(`invalid SVG: ${message}`);
  }
}
