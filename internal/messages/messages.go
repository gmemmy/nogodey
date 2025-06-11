package messages

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
)

// Message is an extracted UI string from the JS build.
// Mirrors the shape of objects in js/dist/messages.json.
type Message struct {
	Key     string `json:"key"`
	Default string `json:"default"`
	File    string `json:"file"`
	Loc     struct {
		Line   int `json:"line"`
		Column int `json:"column"`
	} `json:"loc"`
}

// Read parses js/dist/messages.json (or any path with the same schema).
func Read(path string) ([]Message, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("opening file: %w", err)
	}
	defer f.Close()
	data, err := io.ReadAll(f)
	if err != nil {
		return nil, fmt.Errorf("reading file: %w", err)
	}
	var msgs []Message
	if err := json.Unmarshal(data, &msgs); err != nil {
		return nil, fmt.Errorf("parsing JSON: %w", err)
	}
	return msgs, nil
}
