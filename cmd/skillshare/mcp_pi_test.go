package main

import (
	"skillshare/internal/mcp"
	"testing"
)

func TestMCPPiCLI(t *testing.T) {
	s := mcpTUIService(t)
	o, err := parseMCPOptions([]string{"docs", "--target", "pi", "--pi-extension", "pi-mcp-extension", "--url", "https://example.com/mcp", "--no-tui"})
	if err != nil {
		t.Fatal(err)
	}
	if err = runMCPAdd(s, o); err != nil {
		t.Fatal(err)
	}
	source, err := mcp.LoadSource(s.ConfigPath)
	if err != nil || source.Servers["docs"].PiExtension != "pi-mcp-extension" {
		t.Fatalf("%+v %v", source, err)
	}
	o, err = parseMCPOptions([]string{"docs", "--pi-extension", "pi-mcp-adapter", "--no-tui"})
	if err != nil {
		t.Fatal(err)
	}
	if err = runMCPEdit(s, o); err != nil {
		t.Fatal(err)
	}
	source, err = mcp.LoadSource(s.ConfigPath)
	if err != nil || source.Servers["docs"].PiExtension != "pi-mcp-adapter" {
		t.Fatalf("%+v %v", source, err)
	}
}

type piPrompts struct{ scriptedMCPPrompts }

func (p *piPrompts) choose(c checklistConfig) ([]int, error) {
	for i, item := range c.items {
		if item.label == "pi" || item.label == "pi-mcp-extension" {
			return []int{i}, nil
		}
	}
	return nil, errMCPCancelled
}
func TestMCPPiTUI(t *testing.T) {
	s := mcpTUIService(t)
	servers := []mcp.Server{{Command: "echo"}, {URL: "https://example.com/mcp"}}
	targets, err := chooseMCPTargets(s, servers, nil, &piPrompts{})
	if err != nil || len(targets) != 1 || targets[0] != "pi" {
		t.Fatalf("%v %v", targets, err)
	}
	for _, server := range servers {
		if server.PiExtension != "pi-mcp-extension" {
			t.Fatal("extension selection lost")
		}
	}
}

func TestMCPDirectToolsFlag(t *testing.T) {
	s := mcpTUIService(t)
	run := func(handler func(*mcp.Service, mcpOptions) error, args ...string) any {
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
		return source.Servers["tools"].DirectTools
	}
	if got := run(runMCPAdd, "tools", "--target", "pi", "--pi-extension", "pi-mcp-adapter", "--direct-tools", "true", "--url", "https://example.com/mcp"); got != true {
		t.Fatalf("add: %v", got)
	}
	if got, ok := run(runMCPEdit, "tools", "--direct-tools", "search_docs,fetch").([]any); !ok || len(got) != 2 || got[1] != "fetch" {
		t.Fatalf("edit to a list: %v", got)
	}
	if got := run(runMCPEdit, "tools", "--direct-tools", "search"); got != "search" {
		t.Fatalf("edit to search: %v", got)
	}
}

func TestMCPPiOptionsFlag(t *testing.T) {
	s := mcpTUIService(t)
	run := func(handler func(*mcp.Service, mcpOptions) error, args ...string) map[string]any {
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
		return source.Servers["tools"].PiOptions
	}
	if got := run(runMCPAdd, "tools", "--target", "pi", "--pi-extension", "pi-mcp-adapter", "--pi-options", `{"excludeTools":["*emulator*"]}`, "--url", "https://example.com/mcp"); len(got) != 1 {
		t.Fatalf("add: %v", got)
	}
	if got := run(runMCPEdit, "tools", "--pi-options", `{"approveTools":["delete_*"]}`); len(got) != 1 || got["approveTools"] == nil {
		t.Fatalf("edit replaces the options: %v", got)
	}
	if got := run(runMCPEdit, "tools", "--pi-options", `{}`); len(got) != 0 {
		t.Fatalf("an empty object clears them: %v", got)
	}
	if _, err := parseMCPOptions([]string{"tools", "--pi-options", `["a"]`}); err == nil {
		t.Fatal("a JSON array was accepted")
	}
}
