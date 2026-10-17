import { EditorError } from "../../domain/EditorError.js";
import { CommandArguments } from "../CommandArguments.js";
import type { EditorSession } from "../EditorSession.js";
import type { SvgCodec } from "../ports/SvgCodec.js";
import type { TextFileStore } from "../ports/TextFileStore.js";
import { Command } from "./Command.js";

export class SaveCommand extends Command {
  constructor(private readonly files: TextFileStore, private readonly codec: SvgCodec) {
    super("save [file.svg]", "Save SVG; omit the path to reuse the last successful read/save path.");
  }

  override execute(args: readonly string[], session: EditorSession): string {
    const document = session.requireDocument();
    new CommandArguments(args, this.usage).expectCount(0, 1);
    const path = args[0] ?? session.currentPath;
    if (path === undefined) {
      throw new EditorError("no file path. use 'save <file.svg>' first");
    }
    const xml = this.codec.encode(document);
    const count = document.children.flatMap((shape) => shape.walk()).length;
    try {
      this.files.writeText(path, xml);
    } catch {
      throw new EditorError(`cannot write file: ${path}`);
    }
    session.markSaved(path);
    return `saved to ${path} (${count} elements)`;
  }
}
