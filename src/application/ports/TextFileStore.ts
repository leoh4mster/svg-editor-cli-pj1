export interface TextFileStore {
  readText(path: string): string;
  writeText(path: string, content: string): void;
}
