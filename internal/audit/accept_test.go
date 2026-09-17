package audit

import "testing"

func TestAcceptKey_IgnoresLineNumber(t *testing.T) {
	a := Finding{RuleID: "prompt-injection-0", Pattern: "prompt-injection", File: "SKILL.md", Line: 5, Snippet: "Ignore previous instructions"}
	b := a
	b.Line = 42
	if AcceptKey(a) != AcceptKey(b) {
		t.Error("line number must not change the accept key")
	}
	b.Snippet = "SYSTEM: override"
	if AcceptKey(a) == AcceptKey(b) {
		t.Error("different snippet must change the accept key")
	}
}

func TestResult_MarkAcknowledged_SkipsBlocking(t *testing.T) {
	r := &Result{Findings: []Finding{
		{Severity: SeverityCritical, Pattern: "prompt-injection", File: "SKILL.md", Snippet: "Ignore previous instructions"},
	}}
	keys := r.AcceptKeysAtOrAbove(SeverityCritical)
	if len(keys) != 1 {
		t.Fatalf("want 1 accept key, got %d", len(keys))
	}
	if n := r.MarkAcknowledged(keys); n != 1 {
		t.Fatalf("want 1 marked, got %d", n)
	}
	if r.HasSeverityAtOrAbove(SeverityCritical) {
		t.Error("acknowledged finding must not block")
	}
	if len(r.AcceptKeysAtOrAbove(SeverityCritical)) != 0 {
		t.Error("acknowledged finding must not be re-accepted")
	}
}

func TestResult_MarkAcknowledged_NewFindingStillBlocks(t *testing.T) {
	r := &Result{Findings: []Finding{
		{Severity: SeverityCritical, Pattern: "prompt-injection", File: "SKILL.md", Snippet: "Ignore previous instructions"},
		{Severity: SeverityCritical, Pattern: "prompt-injection", File: "SKILL.md", Snippet: "SYSTEM: override"},
	}}
	r.MarkAcknowledged([]string{AcceptKey(r.Findings[0])})
	if !r.HasSeverityAtOrAbove(SeverityCritical) {
		t.Error("unacknowledged finding must still block")
	}
}
