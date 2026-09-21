package main

import (
	"skillshare/internal/mcp"
	"strings"
	"testing"
)

// --target none keeps a server in Skillshare without writing it to any Agent. Refs: #289.
func TestMCPTargetNone(t *testing.T) {
	s := mcpTUIService(t)
	targets := func(handler func(*mcp.Service, mcpOptions) error, args ...string) mcp.TargetList {
		t.Helper()
		o, err := parseMCPOptions(append(args, "--no-tui"))
		if err != nil {
			t.Fatal(err)
		}
		if err = handler(s, o); err != nil {
			t.Fatal(err)
		}
		source, err := mcp.LoadSource(s.ConfigPath)
		if err != nil {
			t.Fatal(err)
		}
		return source.Servers[args[0]].Targets
	}
	if got := targets(runMCPAdd, "parked", "--target", "none", "--url", "https://example.com/mcp"); got == nil || len(got) != 0 {
		t.Fatalf("add: %#v", got)
	}
	if got := targets(runMCPAdd, "live", "--target", "claude", "--url", "https://example.com/mcp"); len(got) != 1 {
		t.Fatalf("add: %#v", got)
	}
	if got := targets(runMCPEdit, "live", "--target", "none"); got == nil || len(got) != 0 {
		t.Fatalf("edit: %#v", got)
	}
	if _, err := parseMCPOptions([]string{"mixed", "--target", "none", "--target", "claude"}); err == nil {
		t.Fatal("none was accepted next to a client")
	}
}

type confirmEmptyPrompts struct{ terminalMCPPrompts }

func (confirmEmptyPrompts) choose(checklistConfig) ([]int, error) { return []int{}, nil }

// Confirming the Agent list with nothing selected means none; only Esc cancels.
func TestMCPTargetPickerAcceptsNone(t *testing.T) {
	targets, err := chooseMCPTargets(mcpTUIService(t), []mcp.Server{{Command: "echo"}}, nil, confirmEmptyPrompts{})
	if err != nil || targets == nil || len(targets) != 0 {
		t.Fatalf("%#v %v", targets, err)
	}
}

// A sync has nothing to do for a server no Agent receives, so the plan alone would hide it.
func TestMCPListNamesServersWithoutTargets(t *testing.T) {
	source := &mcp.Source{
		Servers:  map[string]mcp.Server{"parked": {Targets: mcp.TargetList{}}, "inherits": {}, "leaving": {Targets: mcp.TargetList{}}},
		Projects: map[string]mcp.Project{"/repo": {Servers: map[string]mcp.Server{"local": {Targets: mcp.TargetList{}}}}},
	}
	plan := &mcp.Plan{Changes: []mcp.Change{{Name: "leaving", Target: "claude", Action: "remove"}}}
	got := mcpServersWithoutTargets(source, plan)
	if len(got) != 2 || got[0] != [2]string{"parked", "no targets"} || got[1] != [2]string{"local", "no targets (/repo)"} {
		t.Fatalf("%v", got)
	}
}

func TestMCPListShowsWhereASwitchGoes(t *testing.T) {
	source := &mcp.Source{Targets: []string{"cursor", "opencode"}, Servers: map[string]mcp.Server{"docs": {Disabled: true}}}
	got := mcpListItems(source, nil)[0].(mcpListItem).description
	if !strings.Contains(got, "· opencode ·") {
		t.Fatalf("a switch goes only to the Agents that have one: %s", got)
	}
}
