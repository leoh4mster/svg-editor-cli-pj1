import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin, PluginOptions } from "../../extensions/Contracts.js";
import { PluginPackage } from "./PluginPackage.js";
import { RegistrationError } from "./RegistrationError.js";
import { Registration, type Manifest, type Registry } from "./Registration.js";

export interface CodePlugin {
  readonly manifest: Manifest;
  readonly plugin: Plugin;
  readonly options?: PluginOptions;
}

interface ConfigEntry {
  module: string;
  enabled?: boolean;
  options?: PluginOptions;
}

export class PluginLoader {
  constructor(private readonly registry: Registry, private readonly report: (line: string) => void) {}

  async activate({ manifest, plugin, options = {} }: CodePlugin): Promise<void> {
    const registration = new Registration(this.registry);
    try {
      await plugin.activate(Object.freeze({ register: registration.register.bind(registration) }), options);
      registration.commit(manifest);
    } catch (error) {
      if (error instanceof RegistrationError) this.error(error.message);
      else this.failed(manifest.name, error);
    } finally {
      registration.close();
    }
  }

  async fromConfig(path: string): Promise<void> {
    let entries: ConfigEntry[];
    try {
      const config = JSON.parse(readFileSync(path, "utf8"));
      if (!Array.isArray(config?.plugins) || !config.plugins.every((item: unknown) => this.validEntry(item))) {
        throw new Error("invalid config");
      }
      entries = config.plugins;
    } catch {
      this.error("invalid plugin config");
      return;
    }
    for (const entry of entries) {
      if (entry.enabled === false) continue;
      let name = entry.module;
      try {
        const pkg = PluginPackage.find(entry.module, resolve(path));
        if (!pkg) {
          this.error(`plugin not found: ${entry.module}`);
          continue;
        }
        name = pkg.manifest.name;
        const module = await import(pkg.entry);
        if (!Object.hasOwn(module, "default")) {
          this.error(`plugin has no default export: ${entry.module}`);
          continue;
        }
        await this.activate({ manifest: pkg.manifest, plugin: module.default, options: entry.options ?? {} });
      } catch (error) {
        this.failed(name, error);
      }
    }
  }

  private validEntry(item: unknown): item is ConfigEntry {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const entry = item as Record<string, unknown>;
    return typeof entry.module === "string" && entry.module.trim().length > 0
      && (entry.enabled === undefined || typeof entry.enabled === "boolean")
      && (entry.options === undefined || (!!entry.options && typeof entry.options === "object" && !Array.isArray(entry.options)));
  }

  private failed(name: string, error: unknown): void {
    this.error(`plugin failed to activate: ${name} (${error instanceof Error ? error.message : String(error)})`);
  }

  private error(message: string): void {
    this.report(`error: ${message.replace(/[\r\n]+/gu, " ")}`);
  }
}
