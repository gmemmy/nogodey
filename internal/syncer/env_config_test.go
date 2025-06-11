package syncer

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetEnvConfig_Overrides(t *testing.T) {
	t.Setenv("OPENAI_MODEL", "gpt-4")
	t.Setenv("SYNC_BATCH_SIZE", "50")
	t.Setenv("SYNC_MAX_RETRIES", "5")
	t.Setenv("SYNC_DEFAULT_LOCALES", "en,fr")

	cfg := GetEnvConfig([]string{"pidgin"}, 200, 3)

	assert.Equal(t, "gpt-4", cfg.OpenAIModel)
	assert.Equal(t, 50, cfg.BatchSize)
	assert.Equal(t, 5, cfg.MaxRetries)
	assert.Equal(t, []string{"en", "fr"}, cfg.Locales)
}

func TestGetEnvConfig_FlagPrecedence(t *testing.T) {
	t.Setenv("SYNC_BATCH_SIZE", "99")
	cfg := GetEnvConfig([]string{"en"}, 123, 7)
	// Env overrides batch size (per current implementation), but maxRetries keeps flag value since no env override.
	assert.Equal(t, 99, cfg.BatchSize)
	assert.Equal(t, 7, cfg.MaxRetries)
}
