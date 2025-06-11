package syncer

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

type stubClient struct{ resp openai.ChatCompletionResponse }

func (s stubClient) CreateChatCompletion(_ context.Context, _ openai.ChatCompletionRequest) (openai.ChatCompletionResponse, error) {
	return s.resp, nil
}

func TestSyncIntegration(t *testing.T) {
	tmp := t.TempDir()
	msgsPath := filepath.Join(tmp, "js", "dist")
	require.NoError(t, os.MkdirAll(msgsPath, 0o755))

	messages := []Message{{Key: "a", Default: "Text A"}, {Key: "b", Default: "Text B"}}
	data, _ := json.Marshal(messages)
	require.NoError(t, os.WriteFile(filepath.Join(msgsPath, "messages.json"), data, 0o644))

	localePath := filepath.Join(tmp, "js", "locales")
	require.NoError(t, os.MkdirAll(localePath, 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(localePath, "en.json"), []byte(`{"a":"Text A"}`), 0o644))

	stubResp := openai.ChatCompletionResponse{Choices: []openai.ChatCompletionChoice{{Message: openai.ChatCompletionMessage{Content: "b: \"Translated B\""}}}}
	client := stubClient{resp: stubResp}

	cwd, _ := os.Getwd()
	t.Cleanup(func() { _ = os.Chdir(cwd) })
	require.NoError(t, os.Chdir(tmp))

	cfg := SyncConfig{Locales: []string{"en"}, BatchSize: 10, MaxRetries: 1, OpenAIKey: "test", OpenAIModel: "gpt-test", Client: client}

	err := SyncCommand(cfg)
	require.NoError(t, err)

	updatedData, _ := os.ReadFile(filepath.Join(localePath, "en.json"))
	var got map[string]string
	require.NoError(t, json.Unmarshal(updatedData, &got))
	assert.Equal(t, map[string]string{"a": "Text A", "b": "Translated B"}, got)
}
