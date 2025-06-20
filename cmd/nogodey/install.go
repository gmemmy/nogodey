package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

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
// TODO: need to take some time to figure out how best to improve this heuristic ----- this suffices for now, lol
func detectExpo(root string) bool {
	appJsonPath := filepath.Join(root, "app.json")
	if _, err := os.Stat(appJsonPath); err == nil {
		return true
	}
	return false
}

// installExpoPlugin installs the Nogodey Expo plugin.
func installExpoPlugin(root string) error {
	log := logger.New()
	log.Info("installing expo-plugin-nogodey", "root", root)

	destDir := filepath.Join(root, "ios", "Plugins", "nogodey")
	if err := os.MkdirAll(destDir, 0o755); err != nil {
		log.Error("failed to create destination directory", "dir", destDir, "error", err.Error())
		return err
	}
	log.Info("created destination directory", "path", destDir)

	templates, err := getTemplatesPath()
	if err != nil {
		log.Error("failed to get templates path", "error", err.Error())
		return err
	}

	for _, name := range []string{"NogoLLM.swift", "NogoLLM-Bridging-Header.h"} {
		src := filepath.Join(templates, name)
		dst := filepath.Join(destDir, name)

		if err := copyFile(src, dst); err != nil {
			log.Error("failed to copy template file", "src", src, "dst", dst, "error", err.Error())
			return err
		}
		log.Info("copied template", "file", name, "to", dst)
	}

	// Update app.json configuration
	appJsonPath := filepath.Join(root, "app.json")
	file, err := os.ReadFile(appJsonPath)
	if err != nil {
		log.Error("failed to read app.json", "path", appJsonPath, "error", err.Error())
		return err
	}

	var appJson map[string]interface{}
	if err := json.Unmarshal(file, &appJson); err != nil {
		log.Error("failed to parse app.json", "error", err.Error())
		return err
	}

	expo, ok := appJson["expo"].(map[string]interface{})
	if !ok {
		expo = make(map[string]interface{})
		appJson["expo"] = expo
		log.Info("created expo configuration object in app.json")
	}

	// Ensure plugins array exists and add the plugin if not present
	plugins, ok := expo["plugins"].([]interface{})
	if !ok {
		plugins = make([]interface{}, 0)
	}

	pluginExists := false
	for _, plugin := range plugins {
		if plugin == "expo-plugin-nogodey" {
			pluginExists = true
			break
		}
	}

	if !pluginExists {
		plugins = append(plugins, "expo-plugin-nogodey")
		expo["plugins"] = plugins
		log.Info("added expo-plugin-nogodey to expo.plugins")
	} else {
		log.Info("expo-plugin-nogodey already in expo.plugins")
	}

	// Ensure ios object and entitlements exist
	ios, ok := expo["ios"].(map[string]interface{})
	if !ok {
		ios = make(map[string]interface{})
		expo["ios"] = ios
	}

	entitlements, ok := ios["entitlements"].(map[string]interface{})
	if !ok {
		entitlements = make(map[string]interface{})
		ios["entitlements"] = entitlements
	}

	// Set ML model inference entitlement
	entitlements["com.apple.developer.ml.model-inference"] = true
	log.Info("set ML model inference entitlement")

	// Write updated app.json back to disk
	updatedJson, err := json.MarshalIndent(appJson, "", "  ")
	if err != nil {
		log.Error("failed to marshal updated app.json", "error", err.Error())
		return err
	}

	if err := os.WriteFile(appJsonPath, updatedJson, 0o644); err != nil {
		log.Error("failed to write updated app.json", "error", err.Error())
		return err
	}
	log.Info("updated app.json configuration")

	log.Info("expo-plugin-nogodey installed successfully")
	return nil
}

// installBareRN installs the Nogodey native module for bare React-Native projects.
func installBareRN(root string) error {
	log := logger.New()

	destDir := filepath.Join(root, "ios", "Plugins", "nogodey")
	if err := os.MkdirAll(destDir, 0o755); err != nil {
		log.Error("failed to create destination directory", "dir", destDir, "error", err.Error())
		return err
	}

	templates, err := getTemplatesPath()
	if err != nil {
		log.Error("failed to get templates path", "error", err.Error())
		return err
	}

	for _, name := range []string{"NogoLLM.swift", "NogoLLM-Bridging-Header.h"} {
		src := filepath.Join(templates, name)
		dst := filepath.Join(destDir, name)

		if err := copyFile(src, dst); err != nil {
			log.Error("failed to copy template file", "src", src, "dst", dst, "error", err.Error())
			return err
		}
		log.Info("copied template", "file", name)
	}

	podfilePath := filepath.Join(root, "ios", "Podfile")
	if err := appendPodfileLines(podfilePath, log); err != nil {
		return err
	}

	// Run `pod install` if cocoapods is available
	if podPath, err := exec.LookPath("pod"); err == nil {
		cmd := exec.Command(podPath, "install")
		cmd.Dir = filepath.Join(root, "ios")
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr

		log.Info("running pod install", "dir", cmd.Dir)

		if err := cmd.Run(); err != nil {
			log.Error("pod install failed", "error", err.Error())
			return err
		}

		log.Info("pod install completed successfully")
	} else {
		log.Warn("cocoapods not found; skipping pod install")
	}

	log.Info(">> bare RN nogodey native module installed", "root", root)
	return nil
}

// copyFile copies a file from src to dst. If dst exists it will be overwritten.
func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer func() {
		_ = out.Close()
		if err != nil {
			_ = os.Remove(dst)
		}
	}()

	if _, err = io.Copy(out, in); err != nil {
		return err
	}

	return out.Sync()
}

// appendPodfileLines appends the nogodey pod lines to the Podfile if they are
// not already present.
func appendPodfileLines(podfilePath string, log *logger.Logger) error {
	// Ensure Podfile exists, create if missing
	file, err := os.OpenFile(podfilePath, os.O_RDWR|os.O_CREATE, 0o644)
	if err != nil {
		log.Error("unable to open Podfile", "path", podfilePath, "error", err.Error())
		return err
	}
	defer file.Close()

	// Check for existing entry to avoid duplicates
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.Contains(line, "pod 'nogodey'") {
			log.Info("Podfile already contains nogodey entry")
			return nil
		}
	}
	if err := scanner.Err(); err != nil {
		log.Error("error reading Podfile", "error", err.Error())
		return err
	}

	if _, err := file.WriteString("\n# nogodey native module\n" + "pod 'nogodey', :path => './Plugins/nogodey'\n"); err != nil {
		log.Error("failed to write to Podfile", "error", err.Error())
		return err
	}
	log.Info("appended nogodey pod entry to Podfile")
	return nil
}

// getTemplatesPath returns the absolute path to the templates directory
func getTemplatesPath() (string, error) {
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}

	if _, err := os.Stat(filepath.Join(wd, "go.mod")); err == nil {
		return filepath.Join(wd, "cmd", "nogodey", "internal", "templates"), nil
	}

	// If not in project root, try to find it by going up directories
	for {
		if _, err := os.Stat(filepath.Join(wd, "go.mod")); err == nil {
			return filepath.Join(wd, "cmd", "nogodey", "internal", "templates"), nil
		}
		parent := filepath.Dir(wd)
		if parent == wd {
			break
		}
		wd = parent
	}

	// Fallback to relative path
	return filepath.Join("cmd", "nogodey", "internal", "templates"), nil
}
