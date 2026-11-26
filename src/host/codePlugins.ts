import type { CodePlugin } from "./loader/PluginLoader.js";

// Optional code assembly, in activation order. Config assembly reads the JSON list instead.
export const codePlugins: readonly CodePlugin[] = [];
