import { createRequire } from "node:module";
import dir from "../../plugins/dir/DirPlugin.js";
import stats from "../../plugins/stats/StatsPlugin.js";
import type { CodePlugin } from "./loader/PluginLoader.js";

const manifest = createRequire(import.meta.url);
export const codePlugins: readonly CodePlugin[] = [
  { plugin: stats, manifest: manifest("../../plugins/stats/package.json") },
  { plugin: dir, manifest: manifest("../../plugins/dir/package.json") },
];
