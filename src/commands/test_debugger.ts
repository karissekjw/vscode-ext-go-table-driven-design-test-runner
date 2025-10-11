import * as vscode from 'vscode';
import * as net from 'net';
import * as fs from 'fs';
import path from 'path';
import { findTestInfo, buildTestName } from '../helpers/test_info';
import { DEBUG_TERMINAL_NAME, SESSION_NAME } from '../constants';

const debugSessionDirs = new Map<string, string>();

export async function runTestDebugger() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { return; }
  const document = editor.document;
  const cursorLine = editor.selection.active.line;

  const info = findTestInfo(document, cursorLine);
  const testName = buildTestName(info);

  if (!testName) {
    vscode.window.showErrorMessage('Could not determine test to debug');
    return;
  }

  try {
    const port = await findAvailablePort();
    console.log(`Using port ${port} for Delve debugger`);

    const { terminal, testDir } = runDelveInTerminal(document, testName, port);

    await waitForDelveAndAttach(terminal, port, testDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to start debugger: ${message}`);
  }
}

export function cleanupDebugSession(sessionName: string): void {
  const testDir = debugSessionDirs.get(sessionName);
  if (!testDir) {
    return;
  }

  try {
    const files = fs.readdirSync(testDir);
    const debugTestFiles = files.filter(file => file.startsWith('debug.test') || file.startsWith('__debug_bin'));

    for (const file of debugTestFiles) {
      const filePath = path.join(testDir, file);
      try {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up debug file: ${filePath}`);
      } catch (err) {
        console.error(`Failed to delete debug file ${filePath}:`, err);
      }
    }

    debugSessionDirs.delete(sessionName);
  } catch (err) {
    console.error(`Failed to clean up debug files in ${testDir}:`, err);
  }
}

function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        const port = address.port;
        server.close(() => {
          resolve(port);
        });
      } else {
        server.close();
        reject(new Error('Failed to get port from server'));
      }
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
}

function runDelveInTerminal(document: vscode.TextDocument, testName: string, port: number): { terminal: vscode.Terminal; testDir: string } {
  const absDir = path.dirname(document.uri.fsPath);

  let terminal = vscode.window.terminals.find(t => t.name === DEBUG_TERMINAL_NAME);
  if (terminal) {
    terminal.dispose();
  }

  terminal = vscode.window.createTerminal({
    name: DEBUG_TERMINAL_NAME,
    cwd: absDir,
  });

  terminal.show(true);

  // Adds --headless to run in headless mode
  // Adds --accept-multiclient to allow reconnections (useful for debugging)
  const cmd = `dlv test --headless --listen=:${port} --accept-multiclient -- -test.run "${testName}"`;

  terminal.sendText(cmd);

  return { terminal, testDir: absDir };
}

async function waitForDelveAndAttach(terminal: vscode.Terminal, port: number, testDir: string): Promise<void> {
  const DLV_HOST = '127.0.0.1';
  const MAX_RETRIES = 20;
  const INITIAL_DELAY_MS = 5000;

  try {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Starting Delve debugger...",
      cancellable: true
    }, async (progress, token) => {
      progress.report({ message: "Waiting for Delve to start..." });
      await sleep(INITIAL_DELAY_MS);

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (token.isCancellationRequested) {
          throw new Error('Connection cancelled by user');
        }

        progress.report({ message: `Attempting to connect (${attempt + 1}/${MAX_RETRIES})...` });
        const connected = await tryConnectToDelve(DLV_HOST, port);

        if (connected) {
          progress.report({ message: "Connected! Starting debug session..." });

          const debugConfig: vscode.DebugConfiguration = {
            name: SESSION_NAME,
            type: 'go',
            debugAdapter: 'dlv-dap', // This is required for as VSCode relies on DAP protocol to connect the Go program an debugger
            request: 'attach',
            mode: 'remote',
            port: port,
            host: DLV_HOST
          };

          const session = await vscode.debug.startDebugging(vscode.workspace.workspaceFolders?.[0], debugConfig);
          if (session) {
            debugSessionDirs.set(SESSION_NAME, testDir);
          }
          return;
        }

        const delayMs = 500;
        await sleep(delayMs);
      }

      throw new Error(`Failed to connect to Delve after ${MAX_RETRIES} attempts. Ensure dlv is running on port ${port}.`);
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Debug connection failed: ${message}`);
  }
}

function tryConnectToDelve(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        client.destroy();
      }
    };

    client.setTimeout(5000);

    client.on('connect', () => {
      console.log(`Successfully connected to Delve at ${host}:${port}`);
      cleanup();
      resolve(true);
    });

    client.on('error', (err) => {
      console.log(`Connection error to ${host}:${port}:`, err.message);
      cleanup();
      resolve(false);
    });

    client.on('timeout', () => {
      console.log(`Connection timeout to ${host}:${port}`);
      cleanup();
      resolve(false);
    });

    client.connect(port, host);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}