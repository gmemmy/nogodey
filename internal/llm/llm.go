package llm

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/sashabaranov/go-openai"
	"github.com/you/nogodey/cmd/nogodey/logger"
)

// ChatClient is the subset of the LLM SDK we rely on.
type ChatClient interface {
	CreateChatCompletion(ctx context.Context, req openai.ChatCompletionRequest) (openai.ChatCompletionResponse, error)
}

// NewClient returns the real LLM SDK client.
func NewClient(apiKey string) ChatClient { return openai.NewClient(apiKey) }

// Call performs the chat completion and parses response lines of the form
// KEY: "Value" into a map.
func Call(log *logger.Logger, client ChatClient, prompt, model string) (map[string]string, error) {
	apiTimer := logger.StartTimer("openai_api_call")
	defer apiTimer.ObserveWithLogger(log)

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	req := openai.ChatCompletionRequest{
		Model: model,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: "You are a professional translator. Translate UI strings accurately while preserving placeholders, formatting, and context. Return only the requested format."},
			{Role: openai.ChatMessageRoleUser, Content: prompt},
		},
		MaxTokens:   2000,
		Temperature: 0.3,
	}

	resp, err := client.CreateChatCompletion(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("LLM API call failed: %w", err)
	}
	if len(resp.Choices) == 0 {
		return nil, fmt.Errorf("no response choices returned from LLM")
	}

	content := resp.Choices[0].Message.Content
	log.Info("received LLM response", "response_length", len(content), "usage_tokens", resp.Usage.TotalTokens)

	translations := make(map[string]string)
	for _, line := range strings.Split(content, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		if idx := strings.Index(line, ":"); idx != -1 {
			key := strings.TrimSpace(line[:idx])
			val := strings.TrimSpace(line[idx+1:])
			if len(val) >= 2 && val[0] == '"' && val[len(val)-1] == '"' {
				val = val[1 : len(val)-1]
			}
			if key != "" && val != "" {
				translations[key] = val
			}
		}
	}
	if len(translations) == 0 {
		return nil, fmt.Errorf("failed to parse any translations from response: %s", content)
	}
	return translations, nil
}
