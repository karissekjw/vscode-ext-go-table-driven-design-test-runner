import * as vscode from 'vscode';

interface TestFunction {
  name: string;
  startLine: number;
  suiteType?: string;
}

export function findTestInfo(document: vscode.TextDocument, cursorLine: number) {
  // Step 1: Find the test function containing the cursor
  const testFunction = findTestFunction(document, cursorLine);
  if (!testFunction) {
    return null;
  }

  // Step 2: If it's a suite method, find the runner function
  const suiteRunnerName = testFunction.suiteType
    ? findSuiteRunner(document, testFunction.suiteType)
    : null;

  // Step 3: Find the subtest name (if cursor is within a test case)
  const subtestName = findSubtestName(document, cursorLine, testFunction.startLine);

  return {
    testMethodName: testFunction.name,
    suiteRunnerName,
    subtestName,
  };
}

function findTestFunction(
  document: vscode.TextDocument,
  cursorLine: number
): TestFunction | null {
  // Scan upward from cursor to find the enclosing test function
  for (let i = cursorLine; i >= 0; i--) {
    const line = document.lineAt(i).text.trim();

    // Try to match receiver method: func (s *SuiteType) TestMethod() {
    const receiverMatch = line.match(/func\s+\(\w+\s+\*\s*(\w+)\)\s+(Test\w+)\s*\(/);
    if (receiverMatch) {
      return {
        name: receiverMatch[2],
        startLine: i,
        suiteType: receiverMatch[1],
      };
    }

    // Try to match standalone test: func TestMethod(t *testing.T) {
    const funcMatch = line.match(/func\s+(Test\w+)\s*\(.*\*testing\.T\)/);
    if (funcMatch) {
      return {
        name: funcMatch[1],
        startLine: i,
      };
    }
  }

  return null;
}

function findSuiteRunner(document: vscode.TextDocument, suiteType: string): string | null {
  // Search the entire document for suite.Run(t, new(SuiteType))
  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i).text.trim();

    const suiteRunMatch = line.match(/.Run\s*\(\s*\w+\s*,\s*new\s*\(\s*(\w+)\s*\)\s*\)/);
    if (suiteRunMatch && suiteRunMatch[1] === suiteType) {
      // Found suite.Run, now find the test function it's inside
      return findEnclosingTestFunction(document, i);
    }
  }

  return null;
}

function findEnclosingTestFunction(document: vscode.TextDocument, fromLine: number): string | null {
  // Scan upward to find the test function containing this line
  for (let i = fromLine; i >= 0; i--) {
    const line = document.lineAt(i).text.trim();
    const funcMatch = line.match(/func\s+(Test\w+)\s*\(.*\*testing\.T\)/);
    if (funcMatch) {
      return funcMatch[1];
    }
  }

  return null;
}

function findSubtestName(
  document: vscode.TextDocument,
  cursorLine: number,
  testStartLine: number
): string | null {
  // Scan upward from cursor to test start, looking for test case name
  for (let i = cursorLine; i >= testStartLine; i--) {
    const line = document.lineAt(i).text.trim();

    // Map-based table tests: "test_name": {
    const mapKeyMatch = line.match(/"(.+?)":\s*{/);
    if (mapKeyMatch) {
      return mapKeyMatch[1];
    }

    // Slice-based table tests: name: "test_name",
    const sliceNameMatch = line.match(/name\s*:\s*"(.+?)"/);
    if (sliceNameMatch) {
      return sliceNameMatch[1];
    }
  }

  return null;
}

export function buildTestName(info: ReturnType<typeof findTestInfo> | null): string | null {
  if (!info) { return null; }
  const { testMethodName, suiteRunnerName, subtestName } = info;

  // Receiver method with suite runner: TestRunner/TestMethod/subtest
  if (suiteRunnerName && testMethodName && subtestName) {
    return `${suiteRunnerName}/${testMethodName}/${toSnakeCase(subtestName)}`;
  }

  // Receiver method with suite runner: TestRunner/TestMethod
  if (suiteRunnerName && testMethodName) {
    return `${suiteRunnerName}/${testMethodName}/`;
  }

  // Standalone test with subtest: TestFunc/subtest
  if (testMethodName && subtestName) {
    return `${testMethodName}/${toSnakeCase(subtestName)}`;
  }

  // Standalone test: TestFunc
  return testMethodName;
}

export function buildTestFunctionName(info: ReturnType<typeof findTestInfo> | null): string | null {
  if (!info) { return null; }
  const { testMethodName, suiteRunnerName } = info;

  // Receiver method with suite runner: TestRunner/TestMethod
  if (suiteRunnerName && testMethodName) {
    return `${suiteRunnerName}/${testMethodName}/`;
  }

  return testMethodName;
}

// Helper function to convert string to snake_case
export function toSnakeCase(input: string): string {
  // 1. Trim leading/trailing whitespace
  // 2. Replace spaces with underscores, but keep existing hyphens
  // 3. Collapse multiple spaces into a single underscore
  return input
    .trim()
    .replace(/\s+/g, '_'); // Replace one or more spaces with single underscore
}
