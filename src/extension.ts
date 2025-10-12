// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { runTest } from './commands/test_runner';
import { runTestDebugger, cleanupDebugSession } from './commands/test_debugger';
import * as constants from './constants';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const runSubtest = vscode.commands.registerCommand('goTDDRunner.runTest', async () => {
		runTest();
	});

	const debugCmd = vscode.commands.registerCommand('goTDDRunner.debugTest', async () => {
		await runTestDebugger();
	});

	// Listen for debug session termination to dispose terminal and free port
	const debugSessionListener = vscode.debug.onDidTerminateDebugSession((session) => {
		if (session.name === constants.SESSION_NAME) {
			const terminal = vscode.window.terminals.find(t => t.name === constants.DEBUG_TERMINAL_NAME);
			if (terminal) {
				console.log('Debug session ended, disposing terminal to free port');
				terminal.dispose();
			}

			cleanupDebugSession(session.name);
		}
	});

	context.subscriptions.push(runSubtest, debugCmd, debugSessionListener);
}

// This method is called when your extension is deactivated
export function deactivate() { }
