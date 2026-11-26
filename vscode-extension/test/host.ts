import assert = require("node:assert/strict");
import * as vscode from "vscode";
import { SvgBadgeProvider } from "../src/SvgBadgeProvider";

export async function run(): Promise<void> {
  const folder = vscode.workspace.workspaceFolders![0]!.uri;
  const uri = vscode.Uri.joinPath(folder, "example.svg");
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.extensions.getExtension("leoh4mster.pj1-svg-outline")!.activate();
  const events = new vscode.EventEmitter<vscode.Uri>();
  try {
    const badges = new SvgBadgeProvider(events.event);
    const before = await vscode.workspace.fs.readFile(uri);
    assert.equal((await badges.provideFileDecoration(uri))?.badge, "[]");
    for (const name of ["notes.txt", "assets.svg", "missing.svg"]) {
      assert.equal(await badges.provideFileDecoration(vscode.Uri.joinPath(folder, name)), undefined);
    }
    assert.deepEqual(await vscode.workspace.fs.readFile(uri), before);
  } finally {
    events.dispose();
  }
  const symbols = async () => (await vscode.commands.executeCommand<vscode.DocumentSymbol[] | undefined>(
    "vscode.executeDocumentSymbolProvider", uri)) ?? [];
  const [root] = await symbols();
  assert.equal(root!.name, "svg");
  const group = root!.children[0]!;
  assert.equal(group.name, "g#flowchart");
  const node = group.children[0]!;
  assert.equal(node.name, "g#node");
  assert.deepEqual(node.children.map(child => child.name), ["rect#start", "text"]);
  const rect = node.children[0]!;
  assert.equal(rect.selectionRange.start.line, 3);
  assert.equal(document.getText(rect.selectionRange), "rect");
  assert.ok(document.getText(group.range).endsWith("</g>"));

  const original = document.getText();
  async function replace(text: string): Promise<void> {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), text);
    assert.ok(await vscode.workspace.applyEdit(edit));
  }
  try {
    await replace('<svg><ellipse id="edited"/></svg>');
    assert.equal((await symbols())[0]!.children[0]!.name, "ellipse#edited");
    await replace("<svg><ellipse");
    assert.deepEqual(await symbols(), []);
    await replace("<svg><line/></svg>");
    assert.equal((await symbols())[0]!.children[0]!.name, "line");
  } finally {
    await replace(original);
    await document.save();
  }
  console.log("PASS: SVG badge, unchanged file, excluded directory, nested outline, source selection, live edits, malformed XML and recovery");
}
