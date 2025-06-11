package syncer

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/you/nogodey/internal/locales"
	"github.com/you/nogodey/internal/messages"
)

func TestReadMessagesJSON(t *testing.T) {
	tempDir := t.TempDir()
	messagesFile := filepath.Join(tempDir, "messages.json")

	testMessages := []messages.Message{{Key: "test-key-1", Default: "Test message 1"}, {Key: "test-key-2", Default: "Test message 2"}}
	data, err := json.Marshal(testMessages)
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(messagesFile, data, 0o644))

	msgs, err := messages.Read(messagesFile)
	require.NoError(t, err)
	assert.Len(t, msgs, 2)
	assert.Equal(t, "test-key-1", msgs[0].Key)
}

func TestReadLocaleJSON(t *testing.T) {
	tempDir := t.TempDir()
	localeFile := filepath.Join(tempDir, "en.json")
	translations := map[string]string{"key1": "Translation 1", "key2": "Translation 2"}
	data, _ := json.Marshal(translations)
	require.NoError(t, os.WriteFile(localeFile, data, 0o644))

	got, err := locales.Read(localeFile)
	require.NoError(t, err)
	assert.Equal(t, translations, got)
}

func TestWriteLocaleJSON(t *testing.T) {
	tempDir := t.TempDir()
	file := filepath.Join(tempDir, "locales", "test.json")
	translations := map[string]string{"a": "1", "b": "2"}

	require.NoError(t, locales.Write(file, translations))
	data, err := os.ReadFile(file)
	require.NoError(t, err)
	var got map[string]string
	require.NoError(t, json.Unmarshal(data, &got))
	assert.Equal(t, translations, got)
}

func TestDiffKeys(t *testing.T) {
	msgs := []Message{{Key: "a", Default: "A"}, {Key: "b", Default: "B"}}
	existing := map[string]string{"a": "A"}

	missing := diffKeys(msgs, existing)
	assert.Len(t, missing, 1)
	assert.Equal(t, "b", missing[0].Key)
}

func TestBuildTranslationPrompt(t *testing.T) {
	batch := []Message{{Key: "a", Default: "Hello"}, {Key: "b", Default: "World"}}
	prompt := buildTranslationPrompt(batch, "Spanish")
	assert.Contains(t, prompt, "Spanish")
	assert.Contains(t, prompt, "a: \"Hello\"")
	assert.Contains(t, prompt, "b: \"World\"")
}

func TestSyncConfigDefaults(t *testing.T) {
	cfg := SyncConfig{Locales: []string{"en"}, BatchSize: 200, MaxRetries: 3}
	assert.Equal(t, []string{"en"}, cfg.Locales)
	assert.Equal(t, 200, cfg.BatchSize)
	assert.Equal(t, 3, cfg.MaxRetries)
}
