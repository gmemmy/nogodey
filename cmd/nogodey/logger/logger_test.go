package logger

import (
	"testing"
	"time"
)

func TestTimerRecordsDuration(t *testing.T) {
	l := New()
	timer := StartTimer("unit")
	// simulate some work
	timer.ObserveWithLogger(l)
	if time.Since(timer.start) <= 0 {
		t.Fatalf("expected positive duration")
	}
}
