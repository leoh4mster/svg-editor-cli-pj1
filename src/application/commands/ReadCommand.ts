import { EditorError } from "../../domain/EditorError.js";
import { CommandArguments } from "../CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";
import type { SvgCodec } from "../ports/SvgCodec.js";
import type { TextFileStore } from "../ports/TextFileStore.js";
import { Command } from "./Command.js";

export class ReadCommand extends Command {
  constructor(private readonly files: TextFileStore, private readonly codec: SvgCodec) {
    super("read <file.svg>", "Read an SVG document, replacing the current document.");
  }

  override execute(args: readonly string[], session: EditorSession): string {
    new CommandArguments(args, this.usage).expectCount(1);
    const path = args[0]!;
    let xml: string;
    try {
      xml = this.files.readText(path);
    } catch {
      throw new EditorError(`cannot read file: ${path}`);
    }
    const result = this.codec.decode(xml);
    const document = session.loadDocument(result.copyDocument(), path);
    const count = document.children.flatMap((shape) => shape.walk()).length;
    return [...result.warnings, `read ${path} (${count} elements)`].join("\n");
  }
}
