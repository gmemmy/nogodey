package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDetectExpo(t *testing.T) {
	tmpDir := t.TempDir()

	// Case 1: app.json exists -> expect true
	expoDir := filepath.Join(tmpDir, "expo")
	if err := os.MkdirAll(expoDir, 0o755); err != nil {
		t.Fatalf("unable to create expo temp dir: %v", err)
	}
	appJsonPath := filepath.Join(expoDir, "app.json")
	if err := os.WriteFile(appJsonPath, []byte("{}"), 0o644); err != nil {
		t.Fatalf("unable to create app.json: %v", err)
	}

	if !detectExpo(expoDir) {
		t.Errorf("detectExpo should return true when app.json exists")
	}

	// Case 2: no app.json -> expect false
	bareDir := filepath.Join(tmpDir, "bare")
	if err := os.MkdirAll(bareDir, 0o755); err != nil {
		t.Fatalf("unable to create bare temp dir: %v", err)
	}

	if detectExpo(bareDir) {
		t.Errorf("detectExpo should return false when app.json is missing")
	}
}

func TestRunInstall_Expo(t *testing.T) {
	expoDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(expoDir, "app.json"), []byte("{}"), 0o644); err != nil {
		t.Fatalf("unable to create app.json: %v", err)
	}

	runInstall(expoDir)

	// Verify that the installation completed successfully
	expectedFiles := []string{"NogoLLM.swift", "NogoLLM-Bridging-Header.h"}
	for _, filename := range expectedFiles {
		destPath := filepath.Join(expoDir, "ios", "Plugins", "nogodey", filename)
		if _, err := os.Stat(destPath); os.IsNotExist(err) {
			t.Errorf("expected file %s was not copied to %s", filename, destPath)
		}
	}
}

func TestRunInstall_Bare(t *testing.T) {
	bareDir := t.TempDir()

	// Ensure 'pod' is not discoverable during test to skip actual pod install.
	originalPath := os.Getenv("PATH")
	_ = os.Setenv("PATH", "")
	t.Cleanup(func() { _ = os.Setenv("PATH", originalPath) })

	runInstall(bareDir)
}
