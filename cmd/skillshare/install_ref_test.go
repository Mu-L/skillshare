package main

import (
	"strings"
	"testing"
)

func TestParseInstallArgs_TrackRejectsCommitSHA(t *testing.T) {
	_, _, err := parseInstallArgs([]string{"--track", "--branch", "8f14e45fceea167a5a36dedd4bea2543ce848564", "https://github.com/owner/repo"})
	if err == nil || !strings.Contains(err.Error(), "--track") {
		t.Fatalf("expected --track/SHA error, got %v", err)
	}
}
