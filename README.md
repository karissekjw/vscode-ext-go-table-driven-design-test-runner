# Go Table Driven Design Test Runner

This VSCode extension enables the following key bindings to run and debug Go table-driven design tests.

| Execution | Keybinding | Description
|---|---|---|
| Run test | cmd+j | Run the test that I'm looking at (context-aware). Great for targeting a single test.
| Run test function | cmd+u | Run all the tests within the test function
| Run test debugger | cmd+shift+j | Works similar to Run test. Except, it runs with the debugger

### Run Test
The extension executes the test with `go test`

![alt text](https://raw.githubusercontent.com/karissekjw/image-cloud/0ac38cca6f9f369ea9a7c55a3077387099bd6a10/test_runner_vscode_ext.gif)

### Run Test Debugger

The extension launches a debugger processor and hooks up with the VSCode IDE.

![alt text](https://raw.githubusercontent.com/karissekjw/image-cloud/0ac38cca6f9f369ea9a7c55a3077387099bd6a10/test_debugger_vscode_ext.gif)

## Features

This extension runs table-driven design tests that are most compatible if you are using the https://github.com/stretchr/testify package for your TDD testing. In general, it is aligned with the following conventions:
1. Using a Map to Store Test Cases
```go
testCases := map[string]struct {
  preFn     func()
  testInput input
  expected  int
}{
  "test case 1": {
    testInput: input{a: 1, b: 2},
    expected:  3,
    preFn:     func() {},
  },
  "test case 2": {
    testInput: input{a: 3, b: 2},
    expected:  5,
    preFn:     func() {},
  },
}

for name, tc := range testCases {
  s.Run(name, func() {
    tc.preFn()
    actual := addition(tc.testInput.a, tc.testInput.b)
    s.Equal(tc.expected, actual)
  })
}
```

2. Using a Slice with `name` to Store Test Cases
```go
testCases := []struct {
  name      string
  preFn     func()
  testInput input
  expected  int
}{
  {
    name:      "test case 1",
    testInput: input{a: 1, b: 2},
    expected:  3,
    preFn:     func() {},
  },
  {
    name:      "test case 2",
    testInput: input{a: 3, b: 2},
    expected:  5,
    preFn:     func() {},
  },
}

for _, tc := range testCases {
  s.Run(tc.name, func() {
    tc.preFn()
    actual := addition(tc.testInput.a, tc.testInput.b)
    s.Equal(tc.expected, actual)
  })
}
```

### How does it work?
Based on where your cursor is, the test runner will execute the test method accordingly
```go
func (s *Suite) TestMethod() {
  testCases := map[string]struct{    // ← cmd+j Cursor here: runs Suite/TestMethod/
      // ...
  }{
    "test case 1": {               // ← cmd+j Cursor here: runs Suite/TestMethod/test_case_1
      field: "value",             // ← cmd+u Cursor here: runs Suite/TestMethod/
    },
  }

  for name, tc := range testCases {
    s.Run(name, func() {
      tc.preFn()
    })
  }
}

func TestSuite(t *testing.T) {
	suite.Run(t, new(Suite)) // ← cmd+j Cursor here: runs Suite
}
```

## Requirements

- delve https://github.com/go-delve/delve
  - This is required to run the debugger.

## Keybindings
You can edit the keybindings by pasting this in Code -> Preferences > Keyboard Shortcuts -> keybindings.json

```json
{
  "command": "goTDDRunner.runTest",
  "key": "cmd+m",
  "when": "editorLangId == go"
},
{
  "command": "goTDDRunner.debugTest",
  "key": "cmd+shift+m",
  "when": "editorTextFocus && editorLangId == 'go'"
},
{
  "command": "goTDDRunner.runTestFunction",
  "key": "cmd+b",
  "when": "editorLangId == 'go'"
}
```

## Contributions
This project is still in its early stages so contributions are welcome 🤗

Feel free to create an issue if you have any feature requests ✍️ or bugs to report 🐛. If you're up for it you can open a PR to make a contribution!


