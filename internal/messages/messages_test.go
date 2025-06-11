package messages

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRead_Success(t *testing.T) {
	tmp := t.TempDir()
	file := filepath.Join(tmp, "messages.json")
	msgs := []Message{{Key: "a", Default: "Hello"}, {Key: "b", Default: "World"}}
	data, _ := json.Marshal(msgs)
	require.NoError(t, os.WriteFile(file, data, 0o644))

	got, err := Read(file)
	require.NoError(t, err)
	assert.Equal(t, msgs, got)
}

func TestRead_Malformed(t *testing.T) {
	tmp := t.TempDir()
	file := filepath.Join(tmp, "messages.json")
	require.NoError(t, os.WriteFile(file, []byte("not json"), 0o644))
	_, err := Read(file)
	require.Error(t, err)
}
