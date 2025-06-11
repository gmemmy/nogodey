package locales

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"
)

// Read parses a locale JSON file and returns its key-value map.
func Read(path string) (map[string]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("opening file: %w", err)
	}
	defer f.Close()
	data, err := io.ReadAll(f)
	if err != nil {
		return nil, fmt.Errorf("reading file: %w", err)
	}
	var translations map[string]string
	if err := json.Unmarshal(data, &translations); err != nil {
		return nil, fmt.Errorf("parsing JSON: %w", err)
	}
	return translations, nil
}

// Write pretty-prints the translations to the given file path, creating
// parent directories as necessary.
func Write(path string, translations map[string]string) error {
	dir := path[:strings.LastIndex(path, "/")]
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("creating directory: %w", err)
	}
	data, err := json.MarshalIndent(translations, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling JSON: %w", err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return fmt.Errorf("writing file: %w", err)
	}
	return nil
}
