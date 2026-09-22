package mcp

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func changeFor(p *Plan, path, name string) *Change {
	for i, c := range p.Changes {
		if c.Path == path && c.Name == name {
			return &p.Changes[i]
		}
	}
	return nil
}

func TestUnmanageKeepsAgentFilesAndSyncLeavesThemAlone(t *testing.T) {
	s, tmp := projectsService(t, projectsConfig)
	applyProjects(t, s)
	cursor := filepath.Join(tmp, ".cursor", "mcp.json")
	before, _ := os.ReadFile(cursor)
	if _, err := s.Mutate(Mutation{Name: "shared", Remove: true, Unmanage: true}, "", false); err != nil {
		t.Fatal(err)
	}
	after, _ := os.ReadFile(cursor)
	if !bytes.Equal(before, after) {
		t.Fatalf("Agent file changed:\n%s", after)
	}
	plan, err := s.Preview()
	if err != nil {
		t.Fatal(err)
	}
	if c := changeFor(plan, cursor, "shared"); c != nil {
		t.Fatalf("sync still plans %s for the unmanaged entry", c.Action)
	}
	// projB's own switch of the same name is still managed.
	if c := changeFor(plan, filepath.Join(tmp, "projB", "opencode.json"), "shared"); c == nil || c.Action != "unchanged" {
		t.Fatalf("projB switch: %+v", c)
	}
}

func TestUnmanageInAProjectLeavesTheGlobalServerManaged(t *testing.T) {
	s, tmp := projectsService(t, `mcp:
  servers:
    docs:
      command: docs-server
      targets: [cursor]
  projects:
    $TMP/projA:
      servers:
        docs:
          command: docs-server
          targets: [cursor]
`)
	applyProjects(t, s)
	root := filepath.Join(tmp, "projA")
	if _, err := s.Mutate(Mutation{Project: root, Name: "docs", Remove: true, Unmanage: true}, "", false); err != nil {
		t.Fatal(err)
	}
	plan, err := s.Preview()
	if err != nil {
		t.Fatal(err)
	}
	if c := changeFor(plan, filepath.Join(root, ".cursor", "mcp.json"), "docs"); c != nil {
		t.Fatalf("project entry still planned: %s", c.Action)
	}
	if c := changeFor(plan, filepath.Join(tmp, ".cursor", "mcp.json"), "docs"); c == nil || c.Action != "unchanged" {
		t.Fatalf("global entry: %+v", c)
	}
}

func TestUnmanageRejected(t *testing.T) {
	s, _ := projectsService(t, projectsConfig)
	if _, err := s.Mutate(Mutation{Name: "shared", Remove: true, Unmanage: true}, "", true); err == nil || !strings.Contains(err.Error(), "sync") {
		t.Fatalf("with sync: %v", err)
	}
	if _, err := s.Mutate(Mutation{Name: "shared", Unmanage: true}, "", false); err == nil {
		t.Fatal("unmanage without remove was saved")
	}
}

func TestUnmanagedEntryConflictsWhenTheServerIsAddedBack(t *testing.T) {
	s, tmp := projectsService(t, projectsConfig)
	applyProjects(t, s)
	if _, err := s.Mutate(Mutation{Name: "shared", Remove: true, Unmanage: true}, "", false); err != nil {
		t.Fatal(err)
	}
	plan, err := s.PreviewMutation(Mutation{Name: "shared", Server: &Server{Command: "other", Targets: []string{"cursor"}}})
	if err != nil {
		t.Fatal(err)
	}
	if c := changeFor(plan, filepath.Join(tmp, ".cursor", "mcp.json"), "shared"); c == nil || !strings.HasPrefix(c.Message, "existing entry is not managed") {
		t.Fatalf("want the not managed conflict, got %+v", c)
	}
}
