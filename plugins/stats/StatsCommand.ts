import { Command, CommandArguments, type EditorSession } from "../../src/extensions/index.js";

export class StatsCommand extends Command {
  constructor() {
    super("stats", "Count leaf shapes by type and count containers.");
  }

  override execute(args: readonly string[], session: EditorSession): string {
    new CommandArguments(args, this.usage).expectCount(0);
    const counts = new Map<string, number>();
    let containers = 0;
    let total = 0;
    for (const root of session.requireDocument().children) {
      for (const shape of root.walk()) {
        if (shape.isContainer) {
          containers++;
        } else {
          counts.set(shape.type, (counts.get(shape.type) ?? 0) + 1);
          total++;
        }
      }
    }
    const fields = [...counts].map(([type, count]) => `${type}: ${count}`);
    fields.push(`(total ${total}, containers ${containers})`);
    return fields.join("  ");
  }
}
