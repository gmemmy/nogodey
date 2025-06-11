package llm

import (
	"context"
	"errors"
	"testing"

	"github.com/sashabaranov/go-openai"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/you/nogodey/cmd/nogodey/logger"
)

type stubClient struct {
	resp openai.ChatCompletionResponse
	err  error
}

func (s stubClient) CreateChatCompletion(ctx context.Context, req openai.ChatCompletionRequest) (openai.ChatCompletionResponse, error) {
	if s.err != nil {
		return openai.ChatCompletionResponse{}, s.err
	}
	return s.resp, nil
}

func TestCall_ParsesTranslations(t *testing.T) {
	content := "a: \"A\"\nb: \"B\""
	resp := openai.ChatCompletionResponse{Choices: []openai.ChatCompletionChoice{{Message: openai.ChatCompletionMessage{Content: content}}}}
	client := stubClient{resp: resp}
	log := logger.New()
	got, err := Call(log, client, "prompt", "model")
	require.NoError(t, err)
	assert.Equal(t, map[string]string{"a": "A", "b": "B"}, got)
}

func TestCall_ParseFailure(t *testing.T) {
	content := "nothing parsable"
	resp := openai.ChatCompletionResponse{Choices: []openai.ChatCompletionChoice{{Message: openai.ChatCompletionMessage{Content: content}}}}
	client := stubClient{resp: resp}
	_, err := Call(logger.New(), client, "p", "m")
	require.Error(t, err)
}

func TestCall_ClientErrorPropagates(t *testing.T) {
	client := stubClient{err: errors.New("boom")}
	_, err := Call(logger.New(), client, "p", "m")
	require.Error(t, err)
}
