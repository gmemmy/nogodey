package logger

import (
	"encoding/json"
	"fmt"
	"os"
	"time"
)

// Logger provides structured JSON logging
type Logger struct{}

// LogEntry represents a structured log entry
type LogEntry struct {
	Level     string                 `json:"level"`
	Message   string                 `json:"msg"`
	Timestamp string                 `json:"timestamp"`
	Fields    map[string]interface{} `json:",inline,omitempty"`
}

// New creates a new Logger instance
func New() *Logger {
	return &Logger{}
}

// Info logs an info level message with optional key-value metadata
func (l *Logger) Info(msg string, fields ...interface{}) {
	l.log("info", msg, fields...)
}

// Warn logs a warning level message with optional key-value metadata
func (l *Logger) Warn(msg string, fields ...interface{}) {
	l.log("warn", msg, fields...)
}

// Error logs an error level message with optional key-value metadata
func (l *Logger) Error(msg string, fields ...interface{}) {
	l.log("error", msg, fields...)
}

// log is the internal logging method that formats and outputs JSON
func (l *Logger) log(level, msg string, fields ...interface{}) {
	entry := LogEntry{
		Level:     level,
		Message:   msg,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Fields:    make(map[string]interface{}),
	}

	for i := 0; i < len(fields)-1; i += 2 {
		if key, ok := fields[i].(string); ok {
			entry.Fields[key] = fields[i+1]
		}
	}

	if data, err := json.Marshal(entry); err == nil {
		fmt.Fprintln(os.Stdout, string(data))
	}
}

// Timer provides duration measurement and logging
type Timer struct {
	name  string
	start time.Time
}

// StartTimer creates and starts a new timer with the given name
func StartTimer(name string) *Timer {
	return &Timer{
		name:  name,
		start: time.Now(),
	}
}

// Observe logs the duration since the timer was started
func (t *Timer) Observe() {
	duration := time.Since(t.start)
	durationMs := float64(duration.Nanoseconds()) / 1e6

	logger := New()
	logger.Info("timer completed",
		t.name+"_duration_ms", durationMs,
		"operation", t.name,
	)
}

// ObserveWithLogger logs the duration using the provided logger
func (t *Timer) ObserveWithLogger(logger *Logger) {
	duration := time.Since(t.start)
	durationMs := float64(duration.Nanoseconds()) / 1e6

	logger.Info("timer completed",
		t.name+"_duration_ms", durationMs,
		"operation", t.name,
	)
}

// Global logger instance for convenience
var defaultLogger = New()

// Package-level convenience functions
func Info(msg string, fields ...interface{}) {
	defaultLogger.Info(msg, fields...)
}

func Warn(msg string, fields ...interface{}) {
	defaultLogger.Warn(msg, fields...)
}

func Error(msg string, fields ...interface{}) {
	defaultLogger.Error(msg, fields...)
}
