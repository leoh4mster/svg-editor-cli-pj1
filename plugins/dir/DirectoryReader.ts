/** Directory access contract consumed by the dir command. */
export type EntryKind = "DIR" | "FILE" | "LINK" | "OTHER";

export interface DirectoryEntry {
  readonly name: string;
  readonly kind: EntryKind;
}

export interface DirectoryReader {
  currentPath(): string;
  list(path: string): readonly DirectoryEntry[];
}
