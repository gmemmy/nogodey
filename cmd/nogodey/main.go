package main

import (
	"os"
	"os/exec"
	"path/filepath"

	"github.com/you/nogodey/cmd/nogodey/logger"
)

func main() {
	log := logger.New()

	log.Info("starting nogodey build process")

	buildTimer := logger.StartTimer("build_process")

	tsTimer := logger.StartTimer("typescript_build")

	// Change to js directory where package.json and tsx are located
	jsDir := filepath.Join("js")

	log.Info("executing TypeScript build command",
		"command", "node",
		"args", []string{"--import", "tsx/esm", "build.ts"},
		"workdir", jsDir,
	)

	cmd := exec.Command("node", "--import", "tsx/esm", "build.ts")
	cmd.Dir = jsDir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		tsTimer.ObserveWithLogger(log)
		buildTimer.ObserveWithLogger(log)
		log.Error("TypeScript build failed",
			"error", err.Error(),
			"exit_code", cmd.ProcessState.ExitCode(),
			"workdir", jsDir,
		)
		os.Exit(1)
	}

	tsTimer.ObserveWithLogger(log)

	log.Info("build completed successfully",
		"status", "success",
		"workdir", jsDir,
	)

	buildTimer.ObserveWithLogger(log)
}
