package main

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/sashabaranov/go-openai"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// stubClient is a minimal implementation of ChatClient that returns a pre-defined response.
type stubClient struct {
	resp openai.ChatCompletionResponse
}

func (s stubClient) CreateChatCompletion(ctx context.Context, req openai.ChatCompletionRequest) (openai.ChatCompletionResponse, error) {
	return s.resp, nil
}

func TestSyncIntegration(t *testing.T) {
	// 1. Setup a temporary project structure
	tmpDir := t.TempDir()

	// Create js/dist/messages.json with two keys: a, b
	messagesPath := filepath.Join(tmpDir, "js", "dist")
	require.NoError(t, os.MkdirAll(messagesPath, 0o755))
	messagesFile := filepath.Join(messagesPath, "messages.json")

	messages := []Message{
		{Key: "a", Default: "Text A"},
		{Key: "b", Default: "Text B"},
	}
	data, err := json.Marshal(messages)
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(messagesFile, data, 0o644))

	// Create js/locales/en.json with only key "a"
	localePath := filepath.Join(tmpDir, "js", "locales")
	require.NoError(t, os.MkdirAll(localePath, 0o755))
	localeFile := filepath.Join(localePath, "en.json")

	existing := map[string]string{"a": "Text A"}
	locData, err := json.Marshal(existing)
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(localeFile, locData, 0o644))

	// 2. Prepare stub OpenAI response translating key "b"
	stubContent := "b: \"Translated B\""
	stubResp := openai.ChatCompletionResponse{
		Choices: []openai.ChatCompletionChoice{
			{
				Message: openai.ChatCompletionMessage{Content: stubContent},
			},
		},
	}
	client := stubClient{resp: stubResp}

	// 3. Change working directory to tmpDir for relative paths
	cwd, err := os.Getwd()
	require.NoError(t, err)
	t.Cleanup(func() { _ = os.Chdir(cwd) })
	require.NoError(t, os.Chdir(tmpDir))

	// 4. Run sync command with injected client
	cfg := SyncConfig{
		Locales:     []string{"en"},
		BatchSize:   10,
		MaxRetries:  1,
		OpenAIKey:   "test-key",
		OpenAIModel: "gpt-test",
		Client:      client,
	}

	err = syncCommand(cfg)
	require.NoError(t, err)

	// 5. Verify locale file now has both keys
	updatedData, err := os.ReadFile(localeFile)
	require.NoError(t, err)
	var updated map[string]string
	require.NoError(t, json.Unmarshal(updatedData, &updated))

	assert.Equal(t, map[string]string{
		"a": "Text A",
		"b": "Translated B",
	}, updated)
}
