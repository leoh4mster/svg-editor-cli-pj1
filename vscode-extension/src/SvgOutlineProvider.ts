import * as vscode from "vscode";
import { SvgOutlineParser, type OutlineElement } from "./SvgOutlineParser";

export class SvgOutlineProvider implements vscode.DocumentSymbolProvider {
  constructor(private readonly parser = new SvgOutlineParser()) {}

  provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.DocumentSymbol[] {
    if (token.isCancellationRequested) return [];
    const result: vscode.DocumentSymbol[] = [];
    const pending: { nodes: OutlineElement[]; symbols: vscode.DocumentSymbol[] }[] = [
      { nodes: this.parser.parse(document.getText()), symbols: result },
    ];
    while (pending.length) {
      const { nodes, symbols } = pending.pop()!;
      for (const node of nodes) {
        const range = new vscode.Range(document.positionAt(node.start), document.positionAt(node.end));
        const selection = new vscode.Range(document.positionAt(node.start + 1),
          document.positionAt(node.start + 1 + node.tagName.length));
        const kind = node.children.length ? vscode.SymbolKind.Object : vscode.SymbolKind.Field;
        const symbol = new vscode.DocumentSymbol(node.label, "", kind, range, selection);
        symbols.push(symbol);
        if (node.children.length) pending.push({ nodes: node.children, symbols: symbol.children });
      }
    }
    return result;
  }
}
