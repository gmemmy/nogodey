package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReadMessagesJSON(t *testing.T) {
	// Create a temporary messages.json file
	tempDir := t.TempDir()
	messagesFile := filepath.Join(tempDir, "messages.json")

	testMessages := []Message{
		{
			Key:     "test-key-1",
			Default: "Test message 1",
			File:    "test.tsx",
			Loc: struct {
				Line   int `json:"line"`
				Column int `json:"column"`
			}{Line: 1, Column: 1},
		},
		{
			Key:     "test-key-2",
			Default: "Test message 2",
			File:    "test.tsx",
			Loc: struct {
				Line   int `json:"line"`
				Column int `json:"column"`
			}{Line: 2, Column: 1},
		},
	}

	data, err := json.Marshal(testMessages)
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(messagesFile, data, 0o644))

	// Test reading the file
	messages, err := readMessagesJSON(messagesFile)
	require.NoError(t, err)
	assert.Len(t, messages, 2)
	assert.Equal(t, "test-key-1", messages[0].Key)
	assert.Equal(t, "Test message 1", messages[0].Default)
}

func TestReadLocaleJSON(t *testing.T) {
	// Create a temporary locale file
	tempDir := t.TempDir()
	localeFile := filepath.Join(tempDir, "en.json")

	testTranslations := map[string]string{
		"key1": "Translation 1",
		"key2": "Translation 2",
	}

	data, err := json.Marshal(testTranslations)
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(localeFile, data, 0o644))

	// Test reading the file
	translations, err := readLocaleJSON(localeFile)
	require.NoError(t, err)
	assert.Len(t, translations, 2)
	assert.Equal(t, "Translation 1", translations["key1"])
	assert.Equal(t, "Translation 2", translations["key2"])
}

func TestWriteLocaleJSON(t *testing.T) {
	tempDir := t.TempDir()
	localeFile := filepath.Join(tempDir, "locales", "test.json")

	testTranslations := map[string]string{
		"key1": "Value 1",
		"key2": "Value 2",
	}

	// Test writing the file
	err := writeLocaleJSON(localeFile, testTranslations)
	require.NoError(t, err)

	// Verify the file was created and contains correct data
	data, err := os.ReadFile(localeFile)
	require.NoError(t, err)

	var result map[string]string
	err = json.Unmarshal(data, &result)
	require.NoError(t, err)
	assert.Equal(t, testTranslations, result)
}

func TestDiffKeys(t *testing.T) {
	messages := []Message{
		{Key: "key1", Default: "Message 1"},
		{Key: "key2", Default: "Message 2"},
		{Key: "key3", Default: "Message 3"},
	}

	existingTranslations := map[string]string{
		"key1": "Existing translation 1",
		"key3": "Existing translation 3",
	}

	missing := diffKeys(messages, existingTranslations)
	assert.Len(t, missing, 1)
	assert.Equal(t, "key2", missing[0].Key)
	assert.Equal(t, "Message 2", missing[0].Default)
}

func TestBuildTranslationPrompt(t *testing.T) {
	batch := []Message{
		{Key: "key1", Default: "Hello"},
		{Key: "key2", Default: "World"},
	}

	prompt := buildTranslationPrompt(batch, "Spanish")

	assert.Contains(t, prompt, "Spanish")
	assert.Contains(t, prompt, "key1: \"Hello\"")
	assert.Contains(t, prompt, "key2: \"World\"")
	assert.Contains(t, prompt, "preserving placeholders")
}

func TestSyncConfigDefaults(t *testing.T) {
	config := SyncConfig{
		Locales:    []string{"en"},
		BatchSize:  200,
		MaxRetries: 3,
	}

	assert.Equal(t, []string{"en"}, config.Locales)
	assert.Equal(t, 200, config.BatchSize)
	assert.Equal(t, 3, config.MaxRetries)
}
