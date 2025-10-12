import * as vscode from 'vscode';
import path from 'path';
import { findTestInfo, buildTestName, buildTestFunctionName } from '../helpers/test_info';
import { TERMINAL_NAME } from '../constants';

export function runTest() {
  if (!validTestFile()) { return; }

  const editor = vscode.window.activeTextEditor!!;
  const document = editor.document;

  const cursorLine = editor.selection.active.line;

  const result = findTestInfo(document, cursorLine);

  if (!result) {
    vscode.window.showErrorMessage("Could not detect test function");
    return;
  }
  let testPath = buildTestName(result);

  const absDirPath = path.dirname(document.uri.fsPath);

  const testCmd = `go test -run ${testPath} -v ${absDirPath}`;

  const terminal = vscode.window.terminals.find(t => t.name === TERMINAL_NAME) || vscode.window.createTerminal(TERMINAL_NAME);
  terminal.show();
  terminal.sendText(testCmd);
}

export function runTestFunction() {
  if (!validTestFile()) { return; }

  const editor = vscode.window.activeTextEditor!!;
  const document = editor.document;

  const cursorLine = editor.selection.active.line;

  const result = findTestInfo(document, cursorLine);

  if (!result) {
    vscode.window.showErrorMessage("Could not detect test function");
    return;
  }

  let testPath = buildTestFunctionName(result);

  const absDirPath = path.dirname(document.uri.fsPath);

  const testCmd = `go test -run ${testPath} -v ${absDirPath}`;

  const terminal = vscode.window.terminals.find(t => t.name === TERMINAL_NAME) || vscode.window.createTerminal(TERMINAL_NAME);
  terminal.show();
  terminal.sendText(testCmd);
}

function validTestFile(): boolean {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return false;
  }

  const document = editor.document;

  if (!document.fileName.endsWith('_test.go')) {
    vscode.window.showErrorMessage('This command only works in Go test files (_test.go)');
    return false;
  }

  return true;
}