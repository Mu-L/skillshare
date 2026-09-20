package config

import (
	"slices"
	"testing"
)

func TestDetectPathOverlap_CrossRuntimeDiscovery(t *testing.T) {
	// codex's runtime reads ~/.agents/skills, which universal writes to.
	involved := DetectPathOverlap(map[string]TargetConfig{
		"codex":     {Skills: &ResourceTargetConfig{Path: "~/.codex/skills"}},
		"universal": {Skills: &ResourceTargetConfig{Path: "~/.agents/skills"}},
	}, false)

	for _, want := range []string{"codex", "universal"} {
		if !slices.Contains(involved, want) {
			t.Errorf("DetectPathOverlap = %v, missing %s", involved, want)
		}
	}
}

func TestDetectPathOverlap_IgnoresScannerOwnPath(t *testing.T) {
	// claude's runtime scans its own ~/.claude/skills; that is not an overlap
	// with the unrelated target writing elsewhere.
	involved := DetectPathOverlap(map[string]TargetConfig{
		"claude": {Skills: &ResourceTargetConfig{Path: "~/.claude/skills"}},
		"junie":  {Skills: &ResourceTargetConfig{Path: "~/.junie/skills"}},
	}, false)

	if len(involved) != 0 {
		t.Errorf("expected no overlap, got %v", involved)
	}
}
