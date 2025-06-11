package syncer

import (
	"context"
	"errors"
	"testing"

	"github.com/sashabaranov/go-openai"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/you/nogodey/cmd/nogodey/logger"
)

// failOnceClient fails the first call then succeeds.
type failOnceClient struct {
	called bool
}

func (f *failOnceClient) CreateChatCompletion(ctx context.Context, req openai.ChatCompletionRequest) (openai.ChatCompletionResponse, error) {
	if !f.called {
		f.called = true
		return openai.ChatCompletionResponse{}, errors.New("temporary error")
	}
	return openai.ChatCompletionResponse{
		Choices: []openai.ChatCompletionChoice{{Message: openai.ChatCompletionMessage{Content: "key: \"Translated\""}}},
	}, nil
}

func TestTranslateBatch_RetriesAndSucceeds(t *testing.T) {
	log := logger.New()
	client := &failOnceClient{}
	batch := []Message{{Key: "key", Default: "Text"}}

	cfg := SyncConfig{MaxRetries: 2, OpenAIModel: "test"}

	translations, err := translateBatch(log, client, batch, "en", cfg)
	require.NoError(t, err)
	assert.Equal(t, map[string]string{"key": "Translated"}, translations)
	assert.True(t, client.called)
}

// alwaysFailClient always returns error.
type alwaysFailClient struct{}

func (alwaysFailClient) CreateChatCompletion(ctx context.Context, req openai.ChatCompletionRequest) (openai.ChatCompletionResponse, error) {
	return openai.ChatCompletionResponse{}, errors.New("fail")
}

func TestTranslateBatch_FailsAfterRetries(t *testing.T) {
	log := logger.New()
	client := alwaysFailClient{}
	batch := []Message{{Key: "k", Default: "T"}}
	cfg := SyncConfig{MaxRetries: 1, OpenAIModel: "test"}

	_, err := translateBatch(log, client, batch, "en", cfg)
	require.Error(t, err)
}
