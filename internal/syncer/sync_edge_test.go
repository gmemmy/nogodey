package syncer

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/you/nogodey/cmd/nogodey/logger"
	"github.com/you/nogodey/internal/locales"
	"github.com/you/nogodey/internal/messages"
)

func TestSyncCommand_NoAPIKey(t *testing.T) {
	cfg := SyncConfig{Locales: []string{"en"}, BatchSize: 10, MaxRetries: 1, OpenAIKey: "", OpenAIModel: "gpt"}
	err := SyncCommand(cfg)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "OPENAI_API_KEY")
}

func TestSyncLocale_NoMissingKeys(t *testing.T) {
	log := logger.New()
	messages := []Message{{Key: "a", Default: "Text A"}}

	tmp := t.TempDir()
	localeDir := filepath.Join(tmp, "js", "locales")
	require.NoError(t, os.MkdirAll(localeDir, 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(localeDir, "en.json"), []byte(`{"a":"Text A"}`), 0o644))

	cwd, _ := os.Getwd()
	t.Cleanup(func() { _ = os.Chdir(cwd) })
	require.NoError(t, os.Chdir(tmp))

	err := syncLocale(log, messages, "en", SyncConfig{BatchSize: 5, MaxRetries: 1})
	assert.NoError(t, err)
}

func TestReadMessagesJSON_Malformed(t *testing.T) {
	f := filepath.Join(t.TempDir(), "messages.json")
	require.NoError(t, os.WriteFile(f, []byte("not json"), 0o644))
	_, err := messages.Read(f)
	require.Error(t, err)
}

func TestReadLocaleJSON_Malformed(t *testing.T) {
	f := filepath.Join(t.TempDir(), "en.json")
	require.NoError(t, os.WriteFile(f, []byte("{"), 0o644))
	_, err := locales.Read(f)
	require.Error(t, err)
}

func TestWriteLocaleJSON_DirError(t *testing.T) {
	dir := t.TempDir()
	collision := filepath.Join(dir, "locales")
	require.NoError(t, os.WriteFile(collision, []byte("file"), 0o644))
	err := locales.Write(filepath.Join(collision, "en.json"), map[string]string{"a": "b"})
	require.Error(t, err)
}
