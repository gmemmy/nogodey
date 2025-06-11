package main

import (
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/you/nogodey/cmd/nogodey/logger"
	"github.com/you/nogodey/internal/syncer"
)

func main() {
	log := logger.New()

	if len(os.Args) < 2 {
		runBuildCommand(log)
		return
	}

	command := os.Args[1]
	switch command {
	case "sync":
		if err := runSyncCommand(); err != nil {
			log.Error("sync command failed", "error", err.Error())
			os.Exit(1)
		}
	case "build":
		runBuildCommand(log)
	case "help", "--help", "-h":
		printHelp()
	default:
		log.Error("unknown command", "command", command)
		printHelp()
		os.Exit(1)
	}
}

func runSyncCommand() error {
	// Parse sync-specific flags
	syncFlags := flag.NewFlagSet("sync", flag.ExitOnError)
	localesFlag := syncFlags.String("locales", "pidgin", "Comma-separated list of locales to sync (e.g., 'pidgin,en,fr')")
	batchSizeFlag := syncFlags.Int("batch-size", 200, "Number of keys to process in each batch")
	maxRetriesFlag := syncFlags.Int("max-retries", 3, "Maximum number of retry attempts for failed API calls")

	syncFlags.Parse(os.Args[2:])

	// parse locales
	locales := strings.Split(*localesFlag, ",")
	for i, locale := range locales {
		locales[i] = strings.TrimSpace(locale)
	}

	// Get configuration from environment variables and flags
	config := syncer.GetEnvConfig(locales, *batchSizeFlag, *maxRetriesFlag)

	return syncer.SyncCommand(config)
}

func runBuildCommand(log *logger.Logger) {
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

func printHelp() {
	fmt.Println(`nogodey - Zero-boilerplate localization toolkit

USAGE:
    nogodey <command> [options]

COMMANDS:
    build                    Build the JavaScript plugin (default)
    sync                     Sync translations using OpenAI
    help                     Show this help message

SYNC OPTIONS:
    --locales <locales>      Comma-separated list of locales (default: "pidgin")
    --batch-size <size>      Keys per batch for translation (default: 200)
    --max-retries <count>    Max retry attempts for API calls (default: 3)

EXAMPLES:
    nogodey build                     # Build plugin and extract strings
    nogodey sync                      # Sync pidgin locale
    nogodey sync --locales pidgin,en  # Sync multiple locales
    nogodey sync --batch-size 100     # Use smaller batches

WORKFLOW:
    1. Run 'nogodey build' to extract strings to js/dist/messages.json
    2. Run 'nogodey sync' to translate missing keys using OpenAI
    3. Translation files are saved to js/locales/{lang}.json

ENVIRONMENT:
    OPENAI_API_KEY                    Required for sync command
    OPENAI_MODEL                      OpenAI model to use (default: gpt-3.5-turbo)
    SYNC_BATCH_SIZE                   Default batch size for translations
    SYNC_MAX_RETRIES                  Default max retry attempts
    SYNC_DEFAULT_LOCALES              Default locales to sync

CONFIGURATION:
    Create a .env file in the project root with your settings:
    
    OPENAI_API_KEY=your-api-key-here
    OPENAI_MODEL=gpt-4
    SYNC_BATCH_SIZE=150
    SYNC_DEFAULT_LOCALES=pidgin,en`)
}
