import * as vscode from 'vscode';
import { findTestInfo, buildTestName, buildTestFunctionName, toSnakeCase } from './test_info';

function createMockDocument(content: string): vscode.TextDocument {
	const lines = content.split('\n');
	return {
		lineCount: lines.length,
		lineAt: (line: number) => ({
			text: lines[line] || '',
		}),
	} as vscode.TextDocument;
}

describe('#findTestInfo', () => {
	describe('Standalone Test Functions', () => {
		it('should detect standalone test function', () => {
			const content = `package mypackage

func TestMyFunction(t *testing.T) {
	// test code
}`;
			const doc = createMockDocument(content);
			const info = findTestInfo(doc, 3);
			const testName = buildTestName(info);

			expect(testName).toBe('TestMyFunction');
		});

		it('should build test name for standalone function', () => {
			const content = `package mypackage

func TestMyFunction(t *testing.T) {
	// test code
}`;
			const doc = createMockDocument(content);
			const info = findTestInfo(doc, 3);
			const testName = buildTestName(info);

			expect(testName).toBe('TestMyFunction');
		});
	});

	describe('Standalone Test with Map-Based Subtests', () => {
		it('should detect subtest name from map key', () => {
			const content = `package mypackage

func TestMyFunction(t *testing.T) {
	testCases := map[string]struct{
			input string
			result string
	}{
		"subtest 1": {
			input: "input",
			output: "value",
		},
		"subtest 2": {
			input: "input2,
			output: "value2",
		},
	}
}`;
			const doc = createMockDocument(content);
			const info = findTestInfo(doc, 9);
			const testName = buildTestName(info);

			expect(testName).toBe('TestMyFunction/subtest_1');
		});

		it('should build test name with snake_case subtest', () => {
			const content = `package mypackage

func TestMyFunction(t *testing.T) {
	testCases := map[string]struct{
		"test case 1": {
			expected: "value",
		},
	}
}`;
			const doc = createMockDocument(content);
			const info = findTestInfo(doc, 5);
			const testName = buildTestName(info);

			expect(testName).toBe('TestMyFunction/test_case_1');
		});
	});

	describe('Standalone Test with Slice-Based Subtests', () => {
		it('should detect subtest name from slice struct name field', () => {
			const content = `package mypackage

func TestMyFunction(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "test case 1",
			input:    "foo",
			expected: "bar",
		},
	}
}`;
			const doc = createMockDocument(content);
			const info = findTestInfo(doc, 9);
			const testName = buildTestName(info);

			expect(testName).toBe('TestMyFunction/test_case_1');
		});

		it('should build test name with slice-based subtest', () => {
			const content = `package mypackage

func TestMyFunction(t *testing.T) {
	tests := []struct {
		name string
	}{
		{
			name: "do nothing when empty",
		},
	}
}`;
			const doc = createMockDocument(content);
			const info = findTestInfo(doc, 8);
			const testName = buildTestName(info);

			expect(testName).toBe('TestMyFunction/do_nothing_when_empty');
		});
	});

	describe('Test Suite with Receiver Methods', () => {
		it('should detect receiver method and suite type', () => {
			const content = `package mypackage

func (s *MyTestSuite) TestSomething() {
	// test code
}`;
			const doc = createMockDocument(content);
			const info = findTestInfo(doc, 3);
			const testName = buildTestName(info);

			expect(testName).toBe('TestSomething');
		});

		it('should find suite runner function', () => {
			const content = `package mypackage

func (s *MySuite) TestNoError() {
	// test code
}

func TestMySuite(t *testing.T) {
	s.Run(t, new(MySuite))
}`;
			const doc = createMockDocument(content);
			const info = findTestInfo(doc, 3);
			const testName = buildTestName(info);

			expect(testName).toBe('TestMySuite/TestNoError/');
		});

		it('should build test name with suite runner', () => {
			const content = `package mypackage

func (s *TriggerAttributeTestSuite) TestGetAllAttributesEmptyNoError() {
	// test code
}

func TestNewTriggerAttributeService(t *testing.T) {
	suite.Run(t, new(TriggerAttributeTestSuite))
}`;
			const doc = createMockDocument(content);
			const info = findTestInfo(doc, 3);
			const testName = buildTestName(info);

			expect(testName).toBe('TestNewTriggerAttributeService/TestGetAllAttributesEmptyNoError/');
		});
	});

	describe('Test Suite with Map-Based Subtests', () => {
		it('should detect suite runner with subtest', () => {
			const content = `package mypackage

func (s *MyTestSuite) TestWithSubtests() {
	testCases := map[string]struct{
			input string
			result string
	}{
		"subtest 1": {
			input: "input",
			output: "value",
		},
		"subtest 2": {
			input: "input2,
			output: "value2",
		},
	}
}

func TestMySuite(t *testing.T) {
	suite.Run(t, new(MyTestSuite))
}`;
			const doc = createMockDocument(content);
			const info = findTestInfo(doc, 9);
			const testName = buildTestName(info);

			expect(testName).toBe('TestMySuite/TestWithSubtests/subtest_1');
		});

		it('should build test name with suite runner and subtest', () => {
			const content = `package mypackage

func (s *MyTestSuite) TestWithSubtests() {
	testCases := map[string]struct{
		"subtest 1": {
			value: 123,
		},
	}
}

func TestMySuite(t *testing.T) {
	suite.Run(t, new(MyTestSuite))
}`;
			const doc = createMockDocument(content);
			const info = findTestInfo(doc, 5);
			const testName = buildTestName(info);

			expect(testName).toBe('TestMySuite/TestWithSubtests/subtest_1');
		});
	});

	describe('Test Suite with Slice-Based Subtests', () => {
		it('should detect suite runner with slice-based subtest', () => {
			const content = `package mypackage

func (s *TicketSuite) TestUpdate() {
	tests := []struct {
		name     string
		preFn    func()
		input    string
	}{
		{
			name:  "do nothing - when is testing",
			preFn: func() {},
			input: "test",
		},
	}
}

func TestTicketSuite(t *testing.T) {
	suite.Run(t, new(TicketSuite))
}`;
			const doc = createMockDocument(content);
			const info = findTestInfo(doc, 10);
			const testName = buildTestName(info);

			expect(testName).toBe('TestTicketSuite/TestUpdate/do_nothing_-_when_is_testing');
		});

		it('should build test name with suite runner and slice subtest', () => {
			const content = `package mypackage

func (s *MySuite) TestUpdate() {
	tests := []struct {
		name  string
	}{
		{
			name: "do nothing - when is testing",
		},
	}
}

func TestMyTestSuite(t *testing.T) {
	suite.Run(t, new(MySuite))
}`;
			const doc = createMockDocument(content);
			const info = findTestInfo(doc, 8);
			const testName = buildTestName(info);

			expect(testName).toBe('TestMyTestSuite/TestUpdate/do_nothing_-_when_is_testing');
		});
	});

	describe('Multiple Suite.Run Calls', () => {
		it('should find correct suite runner when multiple suites exist', () => {
			const content = `package mypackage

func (s *FirstSuite) TestFirst() {
	// test code
}

func (s *SecondSuite) TestSecond() {
	// test code
}

func TestFirstSuiteRunner(t *testing.T) {
	suite.Run(t, new(FirstSuite))
}

func TestSecondSuiteRunner(t *testing.T) {
	suite.Run(t, new(SecondSuite))
}`;
			const doc = createMockDocument(content);
			const info = findTestInfo(doc, 3);
			const testName = buildTestName(info);

			expect(testName).toBe('TestFirstSuiteRunner/TestFirst/');
		});
	});
});

describe('#toSnakeCase', () => {
	it('should convert single space to underscore', () => {
		expect(toSnakeCase('test case')).toBe('test_case');
	});

	it('should convert multiple spaces to single underscore', () => {
		expect(toSnakeCase('test   case   1')).toBe('test_case_1');
	});

	it('should preserve hyphens', () => {
		expect(toSnakeCase('test-case-1')).toBe('test-case-1');
	});

	it('should handle mixed spaces and hyphens', () => {
		expect(toSnakeCase('test case-with-hyphens')).toBe('test_case-with-hyphens');
	});

	it('should trim leading whitespace', () => {
		expect(toSnakeCase('  test case')).toBe('test_case');
	});

	it('should trim trailing whitespace', () => {
		expect(toSnakeCase('test case  ')).toBe('test_case');
	});

	it('should trim leading and trailing whitespace', () => {
		expect(toSnakeCase('  test case  ')).toBe('test_case');
	});

	it('should handle empty string', () => {
		expect(toSnakeCase('')).toBe('');
	});

	it('should handle string with only spaces', () => {
		expect(toSnakeCase('   ')).toBe('');
	});

	it('should handle string with no spaces', () => {
		expect(toSnakeCase('testcase')).toBe('testcase');
	});

	it('should handle complex test name with spaces and hyphens', () => {
		expect(toSnakeCase('do nothing - when is testing ticket')).toBe('do_nothing_-_when_is_testing_ticket');
	});

	it('should handle test name with numbers', () => {
		expect(toSnakeCase('test case 1 2 3')).toBe('test_case_1_2_3');
	});

	it('should handle special characters with spaces', () => {
		expect(toSnakeCase('test (case) [1]')).toBe('test_(case)_[1]');
	});
});

describe('#buildTestFunctionName', () => {
	it('should return standalone test function name', () => {
		const content = `package mypackage

func TestMyFunction(t *testing.T) {
	// test code
}`;
		const doc = createMockDocument(content);
		const info = findTestInfo(doc, 3);
		const testName = buildTestFunctionName(info);

		expect(testName).toBe('TestMyFunction');
	});

	it('should return standalone function name even with subtest in cursor', () => {
		const content = `package mypackage

func TestMyFunction(t *testing.T) {
	testCases := map[string]struct{
		"test case 1": {
			expected: "value",
		},
	}
}`;
		const doc = createMockDocument(content);
		const info = findTestInfo(doc, 5);
		const testName = buildTestFunctionName(info);

		expect(testName).toBe('TestMyFunction');
	});

	it('should return suite runner with test method', () => {
		const content = `package mypackage

func (s *TestSuite) TestNoError() {
	// test code
}

func TestService(t *testing.T) {
	suite.Run(t, new(TestSuite))
}`;
		const doc = createMockDocument(content);
		const info = findTestInfo(doc, 3);
		const testName = buildTestFunctionName(info);

		expect(testName).toBe('TestService/TestNoError/');
	});

	it('should return suite runner with test method even with subtest', () => {
		const content = `package mypackage

func (s *MyTestSuite) TestWithSubtests() {
	testCases := map[string]struct{
		"subtest 1": {
			value: 123,
		},
	}
}

func TestMySuite(t *testing.T) {
	suite.Run(t, new(MyTestSuite))
}`;
		const doc = createMockDocument(content);
		const info = findTestInfo(doc, 5);
		const testName = buildTestFunctionName(info);

		expect(testName).toBe('TestMySuite/TestWithSubtests/');
	});

	it('should return null when info is null', () => {
		const testName = buildTestFunctionName(null);
		expect(testName).toBe(null);
	});
});
