import { readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { resolve as resolveModule } from "import-meta-resolve";
import type { Manifest } from "./Registration.js";

export class PluginPackage {
  private constructor(readonly manifest: Manifest, private readonly resolveEntry: () => string) {}

  get entry(): string { return this.resolveEntry(); }

  static find(specifier: string, config: string): PluginPackage | undefined {
    const base = dirname(config);
    const relative = specifier.startsWith("./") || specifier.startsWith("../") || isAbsolute(specifier);
    let root: string | undefined;
    let file: string | undefined;
    if (relative) {
      const path = resolve(base, specifier);
      const stat = statSync(path, { throwIfNoEntry: false });
      if (!stat) return undefined;
      if (stat.isDirectory()) root = path;
      else {
        file = path;
        root = this.nearestManifest(dirname(path));
      }
    } else {
      const parts = specifier.split("/");
      const packageName = parts.slice(0, specifier.startsWith("@") ? 2 : 1).join("/");
      root = this.packageRoot(base, packageName);
      if (!root) return undefined;
    }
    if (!root) throw new Error("missing package.json");
    const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    if (typeof manifest?.name !== "string" || !manifest.name) throw new Error("invalid package name");
    const packageRoot = root;
    return new PluginPackage(manifest, () => {
      if (!relative) return resolveModule(specifier, pathToFileURL(config).href);
      if (file) return pathToFileURL(file).href;
      if (manifest.exports) {
        return resolveModule(manifest.name, pathToFileURL(join(packageRoot, "package.json")).href);
      }
      return pathToFileURL(resolve(packageRoot, manifest.main ?? "index.js")).href;
    });
  }

  private static packageRoot(base: string, name: string): string | undefined {
    // Node gives the enclosing package's self-reference precedence over node_modules.
    const own = this.nearestManifest(base);
    if (own) {
      const manifest = JSON.parse(readFileSync(join(own, "package.json"), "utf8"));
      if (manifest.name === name && manifest.exports) return own;
    }
    for (let dir = base; ; dir = dirname(dir)) {
      const candidate = join(dir, "node_modules", name);
      if (statSync(candidate, { throwIfNoEntry: false })?.isDirectory()) return candidate;
      if (dir === dirname(dir)) return undefined;
    }
  }

  private static nearestManifest(base: string): string | undefined {
    for (let dir = base; ; dir = dirname(dir)) {
      if (statSync(join(dir, "package.json"), { throwIfNoEntry: false })?.isFile()) return dir;
      if (dir === dirname(dir)) return undefined;
    }
  }
}
