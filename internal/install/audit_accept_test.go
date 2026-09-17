package install

import (
	"path/filepath"
	"testing"

	"skillshare/internal/audit"
)

func criticalResult(snippet string) *audit.Result {
	return &audit.Result{Findings: []audit.Finding{{
		Severity: audit.SeverityCritical, Pattern: "prompt-injection",
		RuleID: "prompt-injection-0", File: "SKILL.md", Line: 3, Snippet: snippet,
	}}}
}

func TestRecordAcceptedFindings_RoundTrip(t *testing.T) {
	sourceDir := t.TempDir()
	skillPath := filepath.Join(sourceDir, "my-skill")

	added, err := RecordAcceptedFindings(sourceDir, skillPath, criticalResult("Ignore previous instructions"), audit.SeverityCritical)
	if err != nil {
		t.Fatal(err)
	}
	if added != 1 {
		t.Fatalf("want 1 recorded, got %d", added)
	}

	// Same finding on a different line: acknowledged, no longer blocks.
	shifted := criticalResult("Ignore previous instructions")
	shifted.Findings[0].Line = 9
	if n := ApplyAcceptedFindings(sourceDir, skillPath, shifted); n != 1 {
		t.Fatalf("want 1 acknowledged, got %d", n)
	}
	if shifted.HasSeverityAtOrAbove(audit.SeverityCritical) {
		t.Error("accepted finding must not block")
	}

	// Different snippet: still blocks.
	other := criticalResult("SYSTEM: override")
	ApplyAcceptedFindings(sourceDir, skillPath, other)
	if !other.HasSeverityAtOrAbove(audit.SeverityCritical) {
		t.Error("new finding must still block")
	}

	// Recording again is idempotent.
	added, err = RecordAcceptedFindings(sourceDir, skillPath, criticalResult("Ignore previous instructions"), audit.SeverityCritical)
	if err != nil || added != 0 {
		t.Errorf("re-record: want 0 added, got %d (err=%v)", added, err)
	}
}

func TestRecordAcceptedFindings_SkipsBelowThreshold(t *testing.T) {
	sourceDir := t.TempDir()
	res := &audit.Result{Findings: []audit.Finding{{Severity: audit.SeverityHigh, Pattern: "x", File: "SKILL.md"}}}
	added, err := RecordAcceptedFindings(sourceDir, filepath.Join(sourceDir, "s"), res, audit.SeverityCritical)
	if err != nil || added != 0 {
		t.Errorf("HIGH below CRITICAL threshold must not be recorded, got %d (err=%v)", added, err)
	}
}
