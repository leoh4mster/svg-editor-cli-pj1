import { RegistrationError } from "./RegistrationError.js";
import type { Contributions, PluginContext } from "../../extensions/Contracts.js";

export const categories = ["shapes", "commands", "decorators", "attributes"] as const;
export type Category = keyof Contributions;
export type Registry = { [K in Category]: Map<string, Contributions[K]> };
export type Manifest = { readonly name: string; readonly contributes: Partial<Record<Category, readonly string[]>> };

export class Registration implements PluginContext {
  static empty(): Registry {
    return { shapes: new Map(), commands: new Map(), decorators: new Map(), attributes: new Map() };
  }

  private readonly staged = Registration.empty();
  private fault: Error | undefined;
  private open = true;

  constructor(private readonly installed: Registry) {}

  register<K extends Category>(category: K, name: string, extension: Contributions[K]): void {
    if (!this.open) throw new Error("registration is closed");
    try {
      if (!categories.includes(category) || typeof name !== "string" || !name || /\s/u.test(name)) {
        throw new Error("invalid registration name or category");
      }
      if (this.installed[category].has(name) || this.staged[category].has(name)) {
        throw RegistrationError.duplicate(category, name);
      }
      this.checkContract(category, extension);
      this.staged[category].set(name, extension);
    } catch (error) {
      this.fault = error instanceof Error ? error : new Error(String(error));
      throw this.fault;
    }
  }

  close(): void {
    this.open = false;
  }

  commit(manifest: Manifest): void {
    this.close();
    if (this.fault) throw this.fault;
    const declared = manifest.contributes === undefined ? {} : manifest.contributes;
    const valid = declared && typeof declared === "object" && !Array.isArray(declared)
      && Object.keys(declared).every(key => categories.includes(key as Category))
      && categories.every(key => declared[key] === undefined ||
        (Array.isArray(declared[key]) && declared[key].every(name => typeof name === "string")));
    const names = (items: readonly string[]): string[] => [...new Set(items)].sort();
    const actual = Object.fromEntries(categories.map(key => [key, names([...this.staged[key].keys()])]));
    const expected = valid && Object.fromEntries(categories.map(key => [key, names(declared[key] ?? [])]));
    if (!valid || JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw RegistrationError.mismatch(manifest.name, JSON.stringify(expected || declared), JSON.stringify(actual));
    }

    // Recheck the entire batch before publishing, including registrations that finished while activate awaited.
    for (const key of categories) {
      for (const name of this.staged[key].keys()) {
        if (this.installed[key].has(name)) throw RegistrationError.duplicate(key, name);
      }
    }
    const publish = <K extends Category>(key: K): void => {
      for (const [name, value] of this.staged[key]) this.installed[key].set(name, value);
    };
    categories.forEach(publish);
  }

  private checkContract(category: Category, value: unknown): void {
    const fields = {
      shapes: { usage: "string", svgTag: "string", container: "boolean", acceptsText: "boolean", create: "function", read: "function" },
      commands: { usage: "string", description: "string", execute: "function" },
      attributes: { handles: "function", apply: "function" },
      decorators: { labels: "function" },
    } as const;
    if (!value || typeof value !== "object" || Object.entries(fields[category])
      .some(([field, type]) => typeof Reflect.get(value, field) !== type)) {
      throw new Error(`invalid extension contract: ${category}`);
    }
  }
}
