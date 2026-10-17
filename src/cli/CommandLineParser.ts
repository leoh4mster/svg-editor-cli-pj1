import { EditorError } from "../domain/EditorError.js";

export class CommandLineParser {
  parse(line: string): readonly string[] {
    if (line.trimStart().startsWith("#")) {
      return [];
    }

    const tokens: string[] = [];
    let current = "";
    let quoted = false;
    let started = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index]!;
      if (character === '"') {
        quoted = !quoted;
        started = true;
      } else if (
        quoted &&
        character === "\\" &&
        (line[index + 1] === '"' || line[index + 1] === "\\")
      ) {
        current += line[index + 1]!;
        index += 1;
      } else if (!quoted && /\s/u.test(character)) {
        if (started) {
          tokens.push(current);
          current = "";
          started = false;
        }
      } else {
        current += character;
        started = true;
      }
    }

    if (quoted) {
      throw new EditorError("unterminated double quote");
    }
    if (started) {
      tokens.push(current);
    }
    return tokens;
  }
}
