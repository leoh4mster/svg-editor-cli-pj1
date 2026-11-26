import { Command, CommandArguments, EditorError } from "../../src/extensions/index.js";
import type { DirectoryEntry, DirectoryReader } from "./DirectoryReader.js";

export class DirCommand extends Command {
  constructor(private readonly reader: DirectoryReader) {
    super("dir", "List entries in the current working directory.");
  }

  override execute(args: readonly string[]): string {
    new CommandArguments(args, this.usage).expectCount(0);
    const path = this.reader.currentPath();
    let entries: readonly DirectoryEntry[];
    try {
      entries = this.reader.list(path);
    } catch {
      throw new EditorError(`cannot read directory: ${path}`);
    }
    const visible = entries.filter(entry => entry.name !== "." && entry.name !== "..");
    visible.sort((a, b) => {
      if ((a.kind === "DIR") !== (b.kind === "DIR")) return a.kind === "DIR" ? -1 : 1;
      if (a.name === b.name) return 0;
      return a.name < b.name ? -1 : 1;
    });
    if (!visible.length) return "(empty directory)";
    return visible.map(({ kind, name }) => {
      const display = name.replaceAll("\\", "\\\\").replaceAll("\r", "\\r").replaceAll("\n", "\\n");
      return `[${kind}]  ${display}`;
    }).join("\n");
  }
}
