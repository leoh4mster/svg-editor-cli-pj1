import { Command } from "../../../src/extensions/index.js";

export class ProbeCommand extends Command {
  constructor(private readonly message: string) { super("probe-info", "Display configured text."); }
  execute(): string { return this.message; }
}
