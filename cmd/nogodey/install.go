package main

import (
	"flag"
	"os"
	"path/filepath"

	"github.com/you/nogodey/cmd/nogodey/logger"
)

// runInstallCommand is the entry point for the `nogodey install` sub-command.
// It parses CLI flags and delegates to runInstall.
func runInstallCommand() {
	installFlags := flag.NewFlagSet("install", flag.ExitOnError)
	projectRoot := installFlags.String("project", ".", "Path to the Expo / React-Native project root")

	// Parse the flags following the "install" token.
	installFlags.Parse(os.Args[2:])

	// Resolve the absolute path for consistency.
	root, err := filepath.Abs(*projectRoot)
	if err != nil {
		root = *projectRoot // fallback – will fail later if truly invalid
	}

	runInstall(root)
}

// runInstall orchestrates the installation logic for RN / Expo projects.
// It logs start & end events, detects the project type, and forwards to the
// appropriate installer. On error, it logs and terminates the program with
// exit-code 1.
func runInstall(root string) {
	log := logger.New()
	log.Info("starting install process", "root", root)

	var err error
	if detectExpo(root) {
		err = installExpoPlugin(root)
	} else {
		err = installBareRN(root)
	}

	if err != nil {
		log.Error("installation failed", "error", err.Error())
		os.Exit(1)
	}

	log.Info("installation completed successfully", "root", root)
}

// detectExpo returns true when an Expo project is detected at the given root.
// The heuristic is simple for now: the presence of an app.json file.
func detectExpo(root string) bool {
	appJsonPath := filepath.Join(root, "app.json")
	if _, err := os.Stat(appJsonPath); err == nil {
		return true
	}
	return false
}

// installExpoPlugin installs the Nogodey Expo plugin (stub implementation).
func installExpoPlugin(root string) error {
	log := logger.New()
	log.Info(">> expo-plugin-nogodey installed (stub)", "root", root)
	return nil
}

// installBareRN installs the Nogodey native module for bare React-Native projects (stub).
func installBareRN(root string) error {
	log := logger.New()
	log.Info(">> bare RN nogodey native module installed (stub)", "root", root)
	return nil
}
