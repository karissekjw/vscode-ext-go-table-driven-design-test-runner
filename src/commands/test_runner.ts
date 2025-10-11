import * as vscode from 'vscode';
import path from 'path';
import { findTestInfo, buildTestName } from '../helpers/test_info';

export function runTest() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }

  const document = editor.document;
  const cursorLine = editor.selection.active.line;

  const result = findTestInfo(document, cursorLine);

  if (!result) {
    vscode.window.showErrorMessage("Could not detect test function");
    return;
  }
  let testPath = buildTestName(result);

  // Absolute directory path
  const absDirPath = path.dirname(document.uri.fsPath);

  // Final command
  const testCmd = `go test -timeout 30s -run ${testPath} -v ${absDirPath}`;

  // Run in terminal
  const terminal = vscode.window.terminals.find(t => t.name === "Go Subtest") || vscode.window.createTerminal("Go Subtest");
  terminal.show();
  terminal.sendText(testCmd);
}