package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/sashabaranov/go-openai"
	"github.com/you/nogodey/cmd/nogodey/logger"
)

// Message represents a single localization message
type Message struct {
	Key     string `json:"key"`
	Default string `json:"default"`
	File    string `json:"file"`
	Loc     struct {
		Line   int `json:"line"`
		Column int `json:"column"`
	} `json:"loc"`
}

// SyncConfig holds configuration for the sync command
type SyncConfig struct {
	Locales     []string
	BatchSize   int
	MaxRetries  int
	OpenAIKey   string
	OpenAIModel string
	Client      ChatClient
}

// ChatClient is an interface that wraps the CreateChatCompletion method
type ChatClient interface {
	CreateChatCompletion(ctx context.Context, req openai.ChatCompletionRequest) (openai.ChatCompletionResponse, error)
}

// loadEnvConfig loads configuration from environment variables and .env file
func loadEnvConfig() {
	// Try to load .env file (ignore errors if file doesn't exist)
	_ = godotenv.Load()
}

// getEnvConfig creates a SyncConfig with values from environment variables
func getEnvConfig(flagLocales []string, flagBatchSize, flagMaxRetries int) SyncConfig {
	// Load environment configuration first
	loadEnvConfig()

	config := SyncConfig{
		Locales:     flagLocales,
		BatchSize:   flagBatchSize,
		MaxRetries:  flagMaxRetries,
		OpenAIKey:   os.Getenv("OPENAI_API_KEY"),
		OpenAIModel: getEnvWithDefault("OPENAI_MODEL", "gpt-3.5-turbo"),
	}

	// Override with env vars if they exist
	if envBatchSize := os.Getenv("SYNC_BATCH_SIZE"); envBatchSize != "" {
		if size, err := strconv.Atoi(envBatchSize); err == nil {
			config.BatchSize = size
		}
	}

	if envMaxRetries := os.Getenv("SYNC_MAX_RETRIES"); envMaxRetries != "" {
		if retries, err := strconv.Atoi(envMaxRetries); err == nil {
			config.MaxRetries = retries
		}
	}

	if envLocales := os.Getenv("SYNC_DEFAULT_LOCALES"); envLocales != "" && len(flagLocales) == 1 && flagLocales[0] == "pidgin" {
		// Only use env default if user didn't specify locales
		config.Locales = strings.Split(envLocales, ",")
		for i, locale := range config.Locales {
			config.Locales[i] = strings.TrimSpace(locale)
		}
	}

	return config
}

// getEnvWithDefault returns environment variable value or default if not set
func getEnvWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// syncCommand implements the sync subcommand
func syncCommand(config SyncConfig) error {
	log := logger.New()
	syncTimer := logger.StartTimer("sync_process")
	defer syncTimer.ObserveWithLogger(log)

	log.Info("starting sync process",
		"locales", config.Locales,
		"batch_size", config.BatchSize,
		"model", config.OpenAIModel,
		"has_api_key", config.OpenAIKey != "",
	)

	if config.OpenAIKey == "" {
		log.Error("OpenAI API key not found",
			"help", "Set OPENAI_API_KEY environment variable or create a .env file")
		return fmt.Errorf("OPENAI_API_KEY not found in environment variables or .env file")
	}

	// Step 1: Read messages.json
	messages, err := readMessagesJSON("js/dist/messages.json")
	if err != nil {
		log.Error("failed to read messages.json", "error", err.Error())
		return fmt.Errorf("reading messages.json: %w", err)
	}

	log.Info("loaded messages", "count", len(messages))

	// Step 2: Process each locale
	for _, locale := range config.Locales {
		if err := syncLocale(log, messages, locale, config); err != nil {
			log.Error("failed to sync locale", "locale", locale, "error", err.Error())
			return fmt.Errorf("syncing locale %s: %w", locale, err)
		}
	}

	log.Info("sync process completed successfully")
	return nil
}

// syncLocale syncs a single locale
func syncLocale(log *logger.Logger, messages []Message, locale string, config SyncConfig) error {
	localeTimer := logger.StartTimer(fmt.Sprintf("sync_locale_%s", locale))
	defer localeTimer.ObserveWithLogger(log)

	log.Info("syncing locale", "locale", locale)

	// Load existing locale file
	localeFile := fmt.Sprintf("js/locales/%s.json", locale)
	existingTranslations, err := readLocaleJSON(localeFile)
	if err != nil {
		log.Warn("failed to read existing locale file, starting fresh", "locale", locale, "error", err.Error())
		existingTranslations = make(map[string]string)
	}

	log.Info("loaded existing translations", "locale", locale, "count", len(existingTranslations))

	// Find missing keys
	missingKeys := diffKeys(messages, existingTranslations)
	if len(missingKeys) == 0 {
		log.Info("no missing keys for locale", "locale", locale)
		return nil
	}

	log.Info("found missing keys", "locale", locale, "count", len(missingKeys))

	var client ChatClient
	if config.Client != nil {
		client = config.Client
	} else {
		client = openai.NewClient(config.OpenAIKey)
	}

	for i := 0; i < len(missingKeys); i += config.BatchSize {
		end := i + config.BatchSize
		if end > len(missingKeys) {
			end = len(missingKeys)
		}

		batch := missingKeys[i:end]
		batchNum := (i / config.BatchSize) + 1
		totalBatches := int(math.Ceil(float64(len(missingKeys)) / float64(config.BatchSize)))

		log.Info("processing batch", "locale", locale, "batch", batchNum, "total_batches", totalBatches, "keys_in_batch", len(batch))

		translations, err := translateBatch(log, client, batch, locale, config)
		if err != nil {
			return fmt.Errorf("translating batch %d for locale %s: %w", batchNum, locale, err)
		}

		// Merge translations
		for key, translation := range translations {
			existingTranslations[key] = translation
		}

		log.Info("batch completed", "locale", locale, "batch", batchNum, "translations_added", len(translations))
	}

	// Write updated locale file
	if err := writeLocaleJSON(localeFile, existingTranslations); err != nil {
		return fmt.Errorf("writing locale file %s: %w", localeFile, err)
	}

	log.Info("locale sync completed", "locale", locale, "total_keys", len(existingTranslations))
	return nil
}

// translateBatch translates a batch of keys using the LLM
func translateBatch(log *logger.Logger, client ChatClient, batch []Message, locale string, config SyncConfig) (map[string]string, error) {
	prompt := buildTranslationPrompt(batch, locale)

	var lastErr error
	for attempt := 1; attempt <= config.MaxRetries; attempt++ {
		if attempt > 1 {
			backoffDuration := time.Duration(math.Pow(2, float64(attempt-1))) * time.Second
			log.Info("retrying translation", "locale", locale, "attempt", attempt, "backoff_seconds", backoffDuration.Seconds())
			time.Sleep(backoffDuration)
		}

		translations, err := callLLM(log, client, prompt, config.OpenAIModel)
		if err != nil {
			lastErr = err
			log.Warn("translation attempt failed", "locale", locale, "attempt", attempt, "error", err.Error())
			continue
		}

		log.Info("translation successful", "locale", locale, "attempt", attempt, "translations_count", len(translations))
		return translations, nil
	}

	return nil, fmt.Errorf("translation failed after %d attempts: %w", config.MaxRetries, lastErr)
}

// readMessagesJSON reads and parses the messages.json file
func readMessagesJSON(filepath string) ([]Message, error) {
	file, err := os.Open(filepath)
	if err != nil {
		return nil, fmt.Errorf("opening file: %w", err)
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("reading file: %w", err)
	}

	var messages []Message
	if err := json.Unmarshal(data, &messages); err != nil {
		return nil, fmt.Errorf("parsing JSON: %w", err)
	}

	return messages, nil
}

// readLocaleJSON reads and parses a locale JSON file
func readLocaleJSON(filepath string) (map[string]string, error) {
	file, err := os.Open(filepath)
	if err != nil {
		return nil, fmt.Errorf("opening file: %w", err)
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("reading file: %w", err)
	}

	var translations map[string]string
	if err := json.Unmarshal(data, &translations); err != nil {
		return nil, fmt.Errorf("parsing JSON: %w", err)
	}

	return translations, nil
}

// writeLocaleJSON writes translations to a locale JSON file
func writeLocaleJSON(filepath string, translations map[string]string) error {
	// Ensure directory exists
	dir := filepath[:strings.LastIndex(filepath, "/")]
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("creating directory: %w", err)
	}

	data, err := json.MarshalIndent(translations, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling JSON: %w", err)
	}

	if err := os.WriteFile(filepath, data, 0o644); err != nil {
		return fmt.Errorf("writing file: %w", err)
	}

	return nil
}

// diffKeys finds keys that exist in messages but not in existing translations
func diffKeys(messages []Message, existingTranslations map[string]string) []Message {
	var missing []Message
	for _, msg := range messages {
		if _, exists := existingTranslations[msg.Key]; !exists {
			missing = append(missing, msg)
		}
	}
	return missing
}

// buildTranslationPrompt creates a prompt for the LLM
func buildTranslationPrompt(batch []Message, locale string) string {
	var builder strings.Builder

	builder.WriteString(fmt.Sprintf("Translate these UI strings into %s preserving placeholders and maintaining the same tone and context. Return only the translations in the format KEY: \"Translation\":\n\n", locale))

	for _, msg := range batch {
		builder.WriteString(fmt.Sprintf("%s: \"%s\"\n", msg.Key, msg.Default))
	}

	return builder.String()
}

// callLLM makes a request to the LLM and parses the response
func callLLM(log *logger.Logger, client ChatClient, prompt, model string) (map[string]string, error) {
	apiTimer := logger.StartTimer("openai_api_call")
	defer apiTimer.ObserveWithLogger(log)

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	req := openai.ChatCompletionRequest{
		Model: model,
		Messages: []openai.ChatCompletionMessage{
			{
				Role:    openai.ChatMessageRoleSystem,
				Content: "You are a professional translator. Translate UI strings accurately while preserving placeholders, formatting, and context. Return only the requested format.",
			},
			{
				Role:    openai.ChatMessageRoleUser,
				Content: prompt,
			},
		},
		MaxTokens:   2000,
		Temperature: 0.3,
	}

	resp, err := client.CreateChatCompletion(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("OpenAI API call failed: %w", err)
	}

	if len(resp.Choices) == 0 {
		return nil, fmt.Errorf("no response choices returned from OpenAI")
	}

	content := resp.Choices[0].Message.Content
	log.Info("received LLM response", "response_length", len(content), "usage_tokens", resp.Usage.TotalTokens)

	// Parse the response
	translations := make(map[string]string)
	lines := strings.Split(content, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Look for pattern: KEY: "Translation"
		if colonIndex := strings.Index(line, ":"); colonIndex != -1 {
			key := strings.TrimSpace(line[:colonIndex])
			value := strings.TrimSpace(line[colonIndex+1:])

			// Remove quotes if present
			if len(value) >= 2 && value[0] == '"' && value[len(value)-1] == '"' {
				value = value[1 : len(value)-1]
			}

			if key != "" && value != "" {
				translations[key] = value
			}
		}
	}

	if len(translations) == 0 {
		return nil, fmt.Errorf("failed to parse any translations from response: %s", content)
	}

	return translations, nil
}
