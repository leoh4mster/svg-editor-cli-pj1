import * as vscode from "vscode";
import { SvgBadgeProvider } from "./SvgBadgeProvider";
import { SvgOutlineProvider } from "./SvgOutlineProvider";

export function activate(context: vscode.ExtensionContext): void {
  const pattern = "**/*.[sS][vV][gG]";
  const changed = new vscode.EventEmitter<vscode.Uri>();
  const watcher = vscode.workspace.createFileSystemWatcher(pattern, false, true, false);
  context.subscriptions.push(
    changed, watcher,
    watcher.onDidCreate(uri => changed.fire(uri)),
    watcher.onDidDelete(uri => changed.fire(uri)),
    vscode.window.registerFileDecorationProvider(new SvgBadgeProvider(changed.event)),
    vscode.languages.registerDocumentSymbolProvider({ pattern }, new SvgOutlineProvider()),
  );
}
