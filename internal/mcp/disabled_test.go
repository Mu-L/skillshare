package mcp

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// A project turns off a server that the Agent's global config defines by writing an
// entry holding only the switch; the Agent merges it over the global one by field.
func TestDisabledTurnsOffGlobalServerInProject(t *testing.T) {
	s := testService(t)
	s.ProjectRoot = filepath.Join(s.Home, "project")
	source := "mcp:\n  servers:\n    docs:\n      disabled: true\n      piExtension: pi-mcp-adapter\n      targets: [opencode, kilocode, pi]\n"
	if err := os.WriteFile(s.ConfigPath, []byte(source), 0600); err != nil {
		t.Fatal(err)
	}
	plan, err := s.Preview()
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.Apply(plan.Revision); err != nil {
		t.Fatal(err)
	}
	for file, want := range map[string]string{
		"opencode.json": `{"mcp":{"docs":{"enabled":false}}}`,
		"kilo.jsonc":    `{"mcp":{"docs":{"enabled":false}}}`,
		".pi/mcp.json":  `{"mcpServers":{"docs":{"disabled":true}}}`,
	} {
		data, err := os.ReadFile(filepath.Join(s.ProjectRoot, file))
		if err != nil {
			t.Fatal(err)
		}
		var got, expected any
		if json.Unmarshal(data, &got) != nil || json.Unmarshal([]byte(want), &expected) != nil {
			t.Fatalf("%s: %s", file, data)
		}
		a, _ := json.Marshal(got)
		b, _ := json.Marshal(expected)
		if string(a) != string(b) {
			t.Fatalf("%s: got %s want %s", file, a, b)
		}
	}
	if plan, err = s.Preview(); err != nil || len(plan.Changes) != 3 || plan.Changes[0].Action != "unchanged" {
		t.Fatalf("not idempotent: %+v %v", plan, err)
	}
	if err := os.WriteFile(s.ConfigPath, []byte("mcp:\n  servers: {}\n"), 0600); err != nil {
		t.Fatal(err)
	}
	if plan, err = s.Preview(); err != nil || len(plan.Changes) != 3 || plan.Changes[0].Action != "remove" {
		t.Fatalf("switch not removed with its source: %+v %v", plan, err)
	}
}

func TestDisabledRejected(t *testing.T) {
	for name, tc := range map[string]struct {
		project bool
		server  string
		want    string
	}{
		"global mode":       {false, "disabled: true\n      targets: [opencode]", "project"},
		"whole-entry agent": {true, "disabled: true\n      targets: [cursor]", "cursor"},
		"pi extension":      {true, "disabled: true\n      piExtension: pi-mcp-extension\n      targets: [pi]", "pi-mcp-adapter"},
		"with a command":    {true, "disabled: true\n      command: tool\n      targets: [opencode]", "leave out"},
	} {
		t.Run(name, func(t *testing.T) {
			s := testService(t)
			if tc.project {
				s.ProjectRoot = filepath.Join(s.Home, "project")
			}
			if err := os.WriteFile(s.ConfigPath, []byte("mcp:\n  servers:\n    docs:\n      "+tc.server+"\n"), 0600); err != nil {
				t.Fatal(err)
			}
			if _, err := s.Preview(); err == nil || !strings.Contains(err.Error(), tc.want) {
				t.Fatalf("want %q, got %v", tc.want, err)
			}
		})
	}
}
