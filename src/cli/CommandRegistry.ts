import type { EditorSession } from "../application/EditorSession.js";
import type { Command } from "../application/commands/Command.js";
import type { CommandCatalog } from "../application/ports/CommandCatalog.js";
import { EditorError } from "../domain/EditorError.js";

export class CommandRegistry implements CommandCatalog {
  private readonly commands = new Map<string, Command>();

  register(name: string, command: Command): void {
    if (this.commands.has(name)) {
      throw new EditorError(`command already registered: ${name}`);
    }
    this.commands.set(name, command);
  }

  execute(name: string, args: readonly string[], session: EditorSession): string {
    // The only command-name dispatch point; implementations use polymorphism.
    const command = this.commands.get(name);
    if (command === undefined) {
      throw new EditorError(`unknown command: ${name}`);
    }
    return command.execute(args, session);
  }

  describeCommands(): readonly string[] {
    return Array.from(
      this.commands.values(),
      (command) => `  ${command.usage.padEnd(20)} ${command.description}`,
    );
  }
}
