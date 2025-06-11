package locales

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReadWrite(t *testing.T) {
	tmp := t.TempDir()
	file := filepath.Join(tmp, "sub", "en.json")
	translations := map[string]string{"a": "A", "b": "B"}

	require.NoError(t, Write(file, translations))
	got, err := Read(file)
	require.NoError(t, err)
	assert.Equal(t, translations, got)
}

func TestRead_Malformed(t *testing.T) {
	tmp := t.TempDir()
	file := filepath.Join(tmp, "bad.json")
	require.NoError(t, os.WriteFile(file, []byte("{"), 0o644))
	_, err := Read(file)
	require.Error(t, err)
}
