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

  if (!document.fileName.endsWith('_test.go')) {
    vscode.window.showErrorMessage('This command only works in Go test files (_test.go)');
    return;
  }

  const cursorLine = editor.selection.active.line;

  const result = findTestInfo(document, cursorLine);

  if (!result) {
    vscode.window.showErrorMessage("Could not detect test function");
    return;
  }
  let testPath = buildTestName(result);
  
  const absDirPath = path.dirname(document.uri.fsPath);

  const testCmd = `go test -timeout 30s -run ${testPath} -v ${absDirPath}`;

  // Run in terminal
  const terminal = vscode.window.terminals.find(t => t.name === "Go Subtest") || vscode.window.createTerminal("Go Subtest");
  terminal.show();
  terminal.sendText(testCmd);
}