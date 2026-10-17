import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import type { EditorSession } from "../application/EditorSession.js";
import type { CommandLineParser } from "./CommandLineParser.js";
import type { CommandRegistry } from "./CommandRegistry.js";

export class Cli {
  constructor(
    private readonly registry: CommandRegistry,
    private readonly parser: CommandLineParser,
    private readonly session: EditorSession,
    private readonly input: Readable,
    private readonly output: Writable,
    private readonly errorOutput: Writable,
    private readonly interactive: boolean,
  ) {}

  async run(): Promise<void> {
    const lines = createInterface({
      input: this.input,
      output: this.output,
      terminal: this.interactive,
    });

    if (this.interactive) {
      this.output.write("svg-editor 0.1 — type 'help' for commands\n");
      lines.setPrompt("svg> ");
      lines.prompt();
    }

    try {
      for await (const line of lines) {
        try {
          const tokens = this.parser.parse(line);
          const name = tokens[0];
          if (name !== undefined) {
            const result = this.registry.execute(name, tokens.slice(1), this.session);
            this.output.write(`${result}\n`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "unexpected failure";
          this.errorOutput.write(`error: ${message.replace(/[\r\n]+/g, " ")}\n`);
        }
        if (this.interactive) {
          lines.prompt();
        }
      }
    } finally {
      lines.close();
    }
  }
}
