import * as vscode from 'vscode';

export function findTestInfo(document: vscode.TextDocument, cursorLine: number) {
  let suiteType: string | null = null;
  let suiteMethod: string | null = null;
  let suiteStartLine = -1;
  let subtestName: string | null = null;

  // Scan upwards from cursor to find:
  // 1. Receiver suite method: func (s *SuiteType) TestMethod() {
  // 2. Standalone test function: func TestMethod(t *testing.T) {
  for (let i = cursorLine; i >= 0; i--) {
    const line = document.lineAt(i).text.trim();

    const receiverMatch = line.match(/func\s+\(\w+\s+\*\s*(\w+)\)\s+(Test\w+)\s*\(/);
    if (receiverMatch && !suiteMethod) {
      suiteType = receiverMatch[1];
      suiteMethod = receiverMatch[2];
      suiteStartLine = i;
      break;
    }

    const funcMatch = line.match(/func\s+(Test\w+)\s*\(.*\*testing\.T\)/);
    if (funcMatch && !suiteMethod) {
      suiteMethod = funcMatch[1];
      suiteStartLine = i;
      break;
    }
  }

  if (!suiteMethod) {
    return null;
  }

  // Scan for subtest name **only inside the suite method**
  for (let i = cursorLine; i >= suiteStartLine; i--) {
    const line = document.lineAt(i).text.trim();

    const mapKeyMatch = line.match(/"(.+?)":\s*{/);
    if (mapKeyMatch) {
      subtestName = mapKeyMatch[1];
      break;
    }

    // Struct field style: name: "..."
    const structNameMatch = line.match(/name\s*:\s*"(.+?)"/);
    if (structNameMatch) {
      subtestName = structNameMatch[1];
      break;
    }
  }

  return { suiteType, suiteMethod, subtestName };
}

export function buildTestName(info: ReturnType<typeof findTestInfo> | null): string | null {
	if (!info) {return null;}
	const { suiteType, suiteMethod, subtestName } = info;

	if (suiteType && suiteMethod && subtestName) {
		return `${suiteType}/${suiteMethod}/${toSnakeCase(subtestName)}`;
	} else if (suiteType && suiteMethod) {
		return `${suiteType}/${suiteMethod}`;
	} else if (suiteMethod) {
		return suiteMethod;
	}

	return null;
}

// Helper function to convert string to snake_case
function toSnakeCase(input: string): string {
	// 1. Trim leading/trailing whitespace
	// 2. Replace spaces with underscores, but keep existing hyphens
	// 3. Collapse multiple spaces into a single underscore
	return input
		.trim()
		.replace(/\s+/g, '_'); // Replace one or more spaces with single underscore
}
