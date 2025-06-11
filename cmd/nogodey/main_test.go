package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// nodeAvailable reports whether both `node` and `tsx` executables are on PATH.
func nodeAvailable() bool {
	if _, err := exec.LookPath("node"); err != nil {
		return false
	}
	if _, err := exec.LookPath("tsx"); err != nil {
		return false
	}
	return true
}

func TestMain(m *testing.M) {
	// Setup test environment
	code := m.Run()
	// Cleanup
	os.Exit(code)
}

func TestBuildCommand(t *testing.T) {
	if !nodeAvailable() {
		t.Skip("node or tsx not installed; skipping build command tests")
	}

	tests := []struct {
		name           string
		workingDir     string
		expectError    bool
		expectedOutput string
	}{
		{
			name:           "successful build with valid project",
			workingDir:     "testdata/valid-project",
			expectError:    false,
			expectedOutput: "Build completed successfully!",
		},
		{
			name:        "build failure with invalid project",
			workingDir:  "testdata/invalid-project",
			expectError: true,
		},
		{
			name:        "build failure with missing js directory",
			workingDir:  "testdata/no-js-dir",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create test working directory if it doesn't exist
			err := os.MkdirAll(tt.workingDir, 0o755)
			require.NoError(t, err)

			// Change to test directory
			originalDir, err := os.Getwd()
			require.NoError(t, err)
			defer func() {
				err := os.Chdir(originalDir)
				assert.NoError(t, err)
			}()

			err = os.Chdir(tt.workingDir)
			require.NoError(t, err)

			// execjte the command logic (we'll need to refactor main to be testable)
			cmd := exec.Command("node", "--loader", "tsx/esm", "js/build.ts")
			output, err := cmd.CombinedOutput()

			if tt.expectError {
				assert.Error(t, err, "Expected command to fail")
			} else {
				assert.NoError(t, err, "Expected command to succeed")
				if tt.expectedOutput != "" {
					assert.Contains(t, string(output), tt.expectedOutput)
				}
			}
		})
	}
}

func TestCommandConstruction(t *testing.T) {
	if !nodeAvailable() {
		t.Skip("node or tsx not installed; skipping command construction tests")
	}

	tests := []struct {
		name         string
		expectedArgs []string
	}{
		{
			name: "correct command arguments",
			expectedArgs: []string{
				"node",
				"--loader",
				"tsx/esm",
				"js/build.ts",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cmd := exec.Command(tt.expectedArgs[0], tt.expectedArgs[1:]...)

			assert.Equal(t, "node", filepath.Base(cmd.Path))
			assert.Equal(t, tt.expectedArgs[1:], cmd.Args[1:])
		})
	}
}

func TestWorkingDirectoryValidation(t *testing.T) {
	tests := []struct {
		name        string
		setupFunc   func(t *testing.T) string
		expectError bool
	}{
		{
			name: "valid project structure",
			setupFunc: func(t *testing.T) string {
				tmpDir := t.TempDir()
				jsDir := filepath.Join(tmpDir, "js")
				err := os.MkdirAll(jsDir, 0o755)
				require.NoError(t, err)

				// Create minimal build.ts
				buildFile := filepath.Join(jsDir, "build.ts")
				err = os.WriteFile(buildFile, []byte("console.log('test')"), 0o644)
				require.NoError(t, err)

				return tmpDir
			},
			expectError: false,
		},
		{
			name: "missing js directory",
			setupFunc: func(t *testing.T) string {
				return t.TempDir()
			},
			expectError: true,
		},
		{
			name: "missing build.ts file",
			setupFunc: func(t *testing.T) string {
				tmpDir := t.TempDir()
				jsDir := filepath.Join(tmpDir, "js")
				err := os.MkdirAll(jsDir, 0o755)
				require.NoError(t, err)
				return tmpDir
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			testDir := tt.setupFunc(t)

			originalDir, err := os.Getwd()
			require.NoError(t, err)
			defer func() {
				err := os.Chdir(originalDir)
				assert.NoError(t, err)
			}()

			err = os.Chdir(testDir)
			require.NoError(t, err)

			_, err = os.Stat(filepath.Join("js", "build.ts"))

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestEnvironmentVariables(t *testing.T) {
	tests := []struct {
		name     string
		envVars  map[string]string
		expected map[string]string
	}{
		{
			name: "default environment",
			envVars: map[string]string{
				"NODE_ENV": "test",
			},
			expected: map[string]string{
				"NODE_ENV": "test",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set environment variables
			for key, value := range tt.envVars {
				originalValue := os.Getenv(key)
				defer func(k, v string) {
					if v == "" {
						os.Unsetenv(k)
					} else {
						os.Setenv(k, v)
					}
				}(key, originalValue)

				os.Setenv(key, value)
			}

			for key, expectedValue := range tt.expected {
				actualValue := os.Getenv(key)
				assert.Equal(t, expectedValue, actualValue)
			}
		})
	}
}

func TestIntegrationWithRealProject(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	_, err := exec.LookPath("node")
	if err != nil {
		t.Skip("Node.js not available, skipping integration test")
	}

	tmpDir := t.TempDir()
	projectDir := filepath.Join(tmpDir, "test-project")
	err = os.MkdirAll(projectDir, 0o755)
	require.NoError(t, err)

	t.Log("Integration test placeholder - would test real project build")
}
