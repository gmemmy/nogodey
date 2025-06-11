package syncer

import (
	"fmt"
	"math"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/you/nogodey/cmd/nogodey/logger"
	"github.com/you/nogodey/internal/llm"
	"github.com/you/nogodey/internal/locales"
	"github.com/you/nogodey/internal/messages"
)

// Message is an alias for messages.Message
type Message = messages.Message

// ChatClient alias for llm.ChatClient.
type ChatClient = llm.ChatClient

// SyncConfig holds configuration for the sync command.
type SyncConfig struct {
	Locales     []string
	BatchSize   int
	MaxRetries  int
	OpenAIKey   string
	OpenAIModel string
	Client      llm.ChatClient // allows tests to inject a stub
}

// loadEnvConfig loads environment variables from a .env file if present.
func loadEnvConfig() { _ = godotenv.Load() }

// GetEnvConfig builds a SyncConfig from CLI flags + environment variables.
func GetEnvConfig(flagLocales []string, flagBatchSize, flagMaxRetries int) SyncConfig {
	loadEnvConfig()

	cfg := SyncConfig{
		Locales:     flagLocales,
		BatchSize:   flagBatchSize,
		MaxRetries:  flagMaxRetries,
		OpenAIKey:   os.Getenv("OPENAI_API_KEY"),
		OpenAIModel: getEnvWithDefault("OPENAI_MODEL", "gpt-3.5-turbo"),
	}

	if v := os.Getenv("SYNC_BATCH_SIZE"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			cfg.BatchSize = n
		}
	}
	if v := os.Getenv("SYNC_MAX_RETRIES"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			cfg.MaxRetries = n
		}
	}
	if envLocales := os.Getenv("SYNC_DEFAULT_LOCALES"); envLocales != "" && len(flagLocales) == 1 && flagLocales[0] == "pidgin" {
		parts := strings.Split(envLocales, ",")
		for i, p := range parts {
			parts[i] = strings.TrimSpace(p)
		}
		cfg.Locales = parts
	}
	return cfg
}

func getEnvWithDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// SyncCommand is the public entry used by the CLI.
func SyncCommand(cfg SyncConfig) error {
	log := logger.New()
	syncTimer := logger.StartTimer("sync_process")
	defer syncTimer.ObserveWithLogger(log)

	log.Info("starting sync process", "locales", cfg.Locales, "batch_size", cfg.BatchSize, "model", cfg.OpenAIModel, "has_api_key", cfg.OpenAIKey != "")

	if cfg.OpenAIKey == "" {
		log.Error("OpenAI API key not found", "help", "Set OPENAI_API_KEY environment variable or create a .env file")
		return fmt.Errorf("OPENAI_API_KEY not found in environment variables or .env file")
	}

	messagesSlice, err := messages.Read("js/dist/messages.json")
	if err != nil {
		log.Error("failed to read messages.json", "error", err.Error())
		return fmt.Errorf("reading messages.json: %w", err)
	}
	log.Info("loaded messages", "count", len(messagesSlice))

	for _, locale := range cfg.Locales {
		if err := syncLocale(log, messagesSlice, locale, cfg); err != nil {
			log.Error("failed to sync locale", "locale", locale, "error", err.Error())
			return fmt.Errorf("syncing locale %s: %w", locale, err)
		}
	}

	log.Info("sync process completed successfully")
	return nil
}

func syncLocale(log *logger.Logger, messages []Message, locale string, cfg SyncConfig) error {
	timer := logger.StartTimer("sync_locale_" + locale)
	defer timer.ObserveWithLogger(log)

	log.Info("syncing locale", "locale", locale)

	localeFile := fmt.Sprintf("js/locales/%s.json", locale)
	existingTranslations, err := locales.Read(localeFile)
	if err != nil {
		log.Warn("failed to read existing locale file, starting fresh", "locale", locale, "error", err.Error())
		existingTranslations = make(map[string]string)
	}
	log.Info("loaded existing translations", "locale", locale, "count", len(existingTranslations))

	missing := diffKeys(messages, existingTranslations)
	if len(missing) == 0 {
		log.Info("no missing keys for locale", "locale", locale)
		return nil
	}
	log.Info("found missing keys", "locale", locale, "count", len(missing))

	var client ChatClient
	if cfg.Client != nil {
		client = cfg.Client
	} else {
		client = llm.NewClient(cfg.OpenAIKey)
	}

	for i := 0; i < len(missing); i += cfg.BatchSize {
		end := i + cfg.BatchSize
		if end > len(missing) {
			end = len(missing)
		}
		batch := missing[i:end]
		batchNum := (i / cfg.BatchSize) + 1
		totalBatches := int(math.Ceil(float64(len(missing)) / float64(cfg.BatchSize)))

		log.Info("processing batch", "locale", locale, "batch", batchNum, "total_batches", totalBatches, "keys_in_batch", len(batch))

		translations, err := translateBatch(log, client, batch, locale, cfg)
		if err != nil {
			return fmt.Errorf("translating batch %d for locale %s: %w", batchNum, locale, err)
		}

		for k, v := range translations {
			existingTranslations[k] = v
		}
		log.Info("batch completed", "locale", locale, "batch", batchNum, "translations_added", len(translations))
	}

	if err := locales.Write(localeFile, existingTranslations); err != nil {
		return fmt.Errorf("writing locale file %s: %w", localeFile, err)
	}
	log.Info("locale sync completed", "locale", locale, "total_keys", len(existingTranslations))
	return nil
}

func translateBatch(log *logger.Logger, client ChatClient, batch []Message, locale string, cfg SyncConfig) (map[string]string, error) {
	prompt := buildTranslationPrompt(batch, locale)
	var lastErr error
	for attempt := 1; attempt <= cfg.MaxRetries; attempt++ {
		if attempt > 1 {
			backoff := time.Duration(math.Pow(2, float64(attempt-1))) * time.Second
			log.Info("retrying translation", "locale", locale, "attempt", attempt, "backoff_seconds", backoff.Seconds())
			time.Sleep(backoff)
		}
		translations, err := llm.Call(log, client, prompt, cfg.OpenAIModel)
		if err != nil {
			lastErr = err
			log.Warn("translation attempt failed", "locale", locale, "attempt", attempt, "error", err.Error())
			continue
		}
		log.Info("translation successful", "locale", locale, "attempt", attempt, "translations_count", len(translations))
		return translations, nil
	}
	return nil, fmt.Errorf("translation failed after %d attempts: %w", cfg.MaxRetries, lastErr)
}

func diffKeys(messages []Message, existing map[string]string) []Message {
	var missing []Message
	for _, m := range messages {
		if _, ok := existing[m.Key]; !ok {
			missing = append(missing, m)
		}
	}
	return missing
}

func buildTranslationPrompt(batch []Message, locale string) string {
	var b strings.Builder
	b.WriteString(fmt.Sprintf("Translate these UI strings into %s preserving placeholders and maintaining the same tone and context. Return only the translations in the format KEY: \"Translation\":\n\n", locale))
	for _, m := range batch {
		b.WriteString(fmt.Sprintf("%s: \"%s\"\n", m.Key, m.Default))
	}
	return b.String()
}
