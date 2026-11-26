import { SaxesParser } from "saxes";

export interface OutlineElement {
  readonly label: string;
  readonly start: number;
  readonly tagName: string;
  end: number;
  readonly children: OutlineElement[];
}

/** Offsets refer to the original UTF-16 document, including CRLF line endings. */
export class SvgOutlineParser {
  parse(source: string): OutlineElement[] {
    const parser = new SaxesParser({ xmlns: true });
    const roots: OutlineElement[] = [];
    const stack: OutlineElement[] = [];
    let start = 0;
    let isSvg = false;
    const invalidXml = new Error("Invalid XML");

    parser.on("opentagstart", () => {
      // At this event only the name and its delimiter have been consumed.
      start = source.lastIndexOf("<", parser.position - 1);
    });
    parser.on("opentag", (tag) => {
      const id = tag.attributes.id?.value;
      const node: OutlineElement = {
        label: id ? `${tag.name}#${id}` : tag.name,
        tagName: tag.name, start, end: parser.position, children: [],
      };
      const parent = stack.at(-1);
      if (parent) {
        parent.children.push(node);
      } else {
        isSvg = tag.local === "svg";
        roots.push(node);
      }
      stack.push(node);
    });
    parser.on("closetag", () => {
      stack.pop()!.end = parser.position;
    });
    parser.on("error", () => { throw invalidXml; });
    try {
      parser.write(source).close();
    } catch (error) {
      if (error === invalidXml) return [];
      throw error;
    }
    return isSvg ? roots : [];
  }
}
