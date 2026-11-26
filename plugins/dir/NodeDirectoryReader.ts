/** Adapt process.cwd and Node Dirent records to the directory reader contract. */
import { readdirSync } from "node:fs";
import type { DirectoryEntry, DirectoryReader, EntryKind } from "./DirectoryReader.js";

export class NodeDirectoryReader implements DirectoryReader {
  currentPath(): string { return process.cwd(); }

  list(path: string): readonly DirectoryEntry[] {
    return readdirSync(path, { withFileTypes: true }).map(entry => {
      let kind: EntryKind = "OTHER";
      if (entry.isDirectory()) kind = "DIR";
      else if (entry.isFile()) kind = "FILE";
      else if (entry.isSymbolicLink()) kind = "LINK";
      return { name: entry.name, kind };
    });
  }
}
