import * as vscode from "vscode";

export class SvgBadgeProvider implements vscode.FileDecorationProvider {
  constructor(readonly onDidChangeFileDecorations: vscode.Event<vscode.Uri>) {}

  async provideFileDecoration(uri: vscode.Uri): Promise<vscode.FileDecoration | undefined> {
    if (!/\.svg$/i.test(uri.path)) return undefined;
    try {
      const { type } = await vscode.workspace.fs.stat(uri);
      if (type & vscode.FileType.File) return new vscode.FileDecoration("[]", "SVG 文件");
    } catch {
      // Explorer can request a decoration while the file is being removed.
    }
    return undefined;
  }
}
