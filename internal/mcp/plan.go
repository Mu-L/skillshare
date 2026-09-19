package mcp

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
)

var grokServerName = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_-]*$`)

// Change deliberately contains no native values, which may include credentials.
type Change struct {
	Target  string `json:"target"`
	Path    string `json:"path"`
	Name    string `json:"name"`
	Action  string `json:"action"`
	Message string `json:"message,omitempty"`
}

// Plan is a redacted, optimistic-concurrency-protected preview.
type Plan struct {
	Revision   string   `json:"revision"`
	SourcePath string   `json:"sourcePath"`
	Blocked    bool     `json:"blocked"`
	Changes    []Change `json:"changes"`
	files      []*filePlan
	state      ledger
	stateBytes []byte
	source     *Source
}

type ownership struct {
	Owner  string `json:"owner"`
	Target string `json:"target"`
	Path   string `json:"path"`
	Name   string `json:"name"`
	Hash   string `json:"hash"`
}

type ledger struct {
	Version int                  `json:"version"`
	Entries map[string]ownership `json:"entries"`
}

type filePlan struct {
	path, target  string
	before, after []byte
	exists        bool
	mode          os.FileMode
	section       string
	changes       map[string]map[string]any
}

// ownershipKey is one entry in one file. Claude's off list shares ~/.claude.json with the
// user-scope servers a global config may own under the same name, so it keys apart.
func ownershipKey(target, path, name string) string {
	if strings.HasPrefix(target, claudeOffPrefix) {
		path = target + "\x00" + path
	}
	return digest([]byte(path + "\x00" + name))
}

func safeRead(path string) ([]byte, bool, os.FileMode, error) {
	info, err := os.Lstat(path)
	if os.IsNotExist(err) {
		return nil, false, 0600, nil
	}
	if err != nil {
		return nil, false, 0, err
	}
	if !info.Mode().IsRegular() {
		return nil, false, 0, fmt.Errorf("MCP file must be a regular file, not a symlink or directory: %s", path)
	}
	data, err := os.ReadFile(path)
	return data, true, info.Mode().Perm(), err
}

func (s *Service) loadLedger() (ledger, []byte, error) {
	state := ledger{Version: 1, Entries: map[string]ownership{}}
	// Only writes recover an interrupted write, under the lock. Until then, read
	// the ownership that recovery will record, byte for byte, so a preview's
	// revision stays valid across that recovery.
	pending, written, err := s.readPending()
	if err != nil {
		return state, nil, err
	}
	if written {
		data, err := json.MarshalIndent(pending.State, "", "  ")
		return pending.State, append(data, '\n'), err
	}
	data, exists, _, err := safeRead(s.statePath())
	if err != nil {
		return state, nil, err
	}
	if exists {
		if json.Unmarshal(data, &state) != nil || state.Version != 1 || state.Entries == nil {
			return state, nil, fmt.Errorf("MCP ownership state is invalid; restore a backup or explicitly import entries again")
		}
	}
	return state, data, nil
}

// Preview reads source, ownership and native files without writing. Writes
// recover an interrupted operation first, while holding the lock.
func (s *Service) Preview() (*Plan, error) {
	source, err := LoadSource(s.ConfigPath)
	if err != nil {
		return nil, err
	}
	return s.previewSource(source)
}

func (s *Service) previewSource(source *Source) (*Plan, error) {
	return s.previewResolved(source, nil)
}

// render builds every native entry the source asks for, keyed by native path.
func (s *Service) render(source *Source) (map[string]map[string]map[string]any, map[string]string, error) {
	desired := map[string]map[string]map[string]any{}
	targets := map[string]string{}
	piExtension := ""
	for _, name := range sortedKeys(source.Servers) {
		server := source.Servers[name]
		selected := server.Targets
		if selected == nil {
			selected = source.Targets
		}
		if len(selected) == 0 {
			return nil, nil, fmt.Errorf("MCP %s has no targets; select at least one Agent", name)
		}
		for _, target := range selected {
			if err := s.checkScope(name, target, server); err != nil {
				return nil, nil, err
			}
			if target == "pi" {
				if piExtension != "" && piExtension != server.PiExtension {
					return nil, nil, fmt.Errorf("Pi servers share one config file; select the same piExtension for every Pi server")
				}
				piExtension = server.PiExtension
			}
			path, native, err := s.destination(target, server)
			if err != nil {
				return nil, nil, err
			}
			targets[path] = native
			entry, err := Render(target, server)
			if err != nil {
				return nil, nil, fmt.Errorf("%s / %s: %w", target, name, err)
			}
			if target == "goose" {
				entry["name"] = name
			}
			if desired[path] == nil {
				desired[path] = map[string]map[string]any{}
			}
			desired[path][name] = entry
		}
	}
	if s.ProjectRoot != "" {
		if desired[filepath.Join(s.ProjectRoot, ".mcp.json")] != nil && desired[filepath.Join(s.ProjectRoot, ".github", "mcp.json")] != nil {
			return nil, nil, fmt.Errorf("Claude and Copilot project MCP destinations overlap in precedence; use global mode for one client")
		}
	}
	return desired, targets, nil
}

// destination is the file one server lands in for one Agent, and the native target that
// reads and edits it. They differ from nativePath only for a switch-only Claude entry:
// Claude Code takes a whole entry from one scope, so a lone switch in .mcp.json would
// replace the server. Its per-project off list in the global file does the job instead.
func (s *Service) destination(target string, server Server) (string, string, error) {
	if target == "claude" && server.Disabled && s.ProjectRoot != "" {
		global := *s
		global.ProjectRoot = ""
		path, err := global.nativePath(target)
		return path, claudeOffPrefix + s.ProjectRoot, err
	}
	path, err := s.nativePath(target)
	return path, target, err
}

// claudeLocalServers names the servers of Claude Code's local scope for this project. They
// live in the global file and win, whole, over .mcp.json and the user scope.
func (s *Service) claudeLocalServers() map[string]any {
	if s.ProjectRoot == "" {
		return nil
	}
	global := *s
	global.ProjectRoot = ""
	path, err := global.nativePath("claude")
	if err != nil {
		return nil
	}
	data, _, _, err := safeRead(path)
	if err != nil {
		return nil
	}
	var document struct {
		Projects map[string]struct {
			McpServers map[string]any `json:"mcpServers"`
		} `json:"projects"`
	}
	_ = json.Unmarshal(data, &document)
	return document.Projects[s.ProjectRoot].McpServers
}

// From Claude Code's MCP docs. The withheld list is the names the docs give; they say "such as".
var (
	claudeReservedNames = []string{"workspace", "claude-in-chrome", "computer-use"}
	claudeWithheldEnv   = []string{"ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "AWS_BEARER_TOKEN_BEDROCK", "HTTPS_PROXY", "NPM_TOKEN"}
)

// checkScope refuses what Render cannot see: limits that depend on the mode, the
// Agent's directory overrides or the server's name. The dashboard's preview runs it
// too, so it never shows a config that saving would then refuse.
func (s *Service) checkScope(name, target string, server Server) error {
	switch {
	case server.Disabled && s.ProjectRoot == "":
		return fmt.Errorf("MCP %s: disabled only applies in project mode, where it turns off a server from the Agent's global config; here, unselect the Agent instead", name)
	case target == "pi" && s.ProjectRoot == "" && s.ConfigDirs["pi"] != "" && server.PiExtension == "pi-mcp-extension":
		return fmt.Errorf("pi-mcp-extension uses ~/.pi/agent/mcp.json and does not honor PI_CODING_AGENT_DIR; unset the override before syncing")
	case target == "grok" && (!grokServerName.MatchString(name) || strings.Contains(name, "__") || strings.HasSuffix(name, "_")):
		return fmt.Errorf("Grok MCP %s: use a name starting with a letter or underscore, containing only letters, digits, hyphens and single underscores, and not ending in underscore", name)
	case target == "claude" && slices.Contains(claudeReservedNames, name):
		return fmt.Errorf("Claude MCP %s: Claude Code reserves this name for a built-in server and skips the entry; choose another name", name)
	case target == "claude" && server.URL != "":
		// Claude Code reads its own and the cloud provider's credentials as empty in a remote
		// server's url and headers, so the server would get "Bearer " and answer 401.
		refs := []*Value{server.BearerToken}
		for _, v := range server.Headers {
			refs = append(refs, &v)
		}
		for _, v := range refs {
			if v != nil && slices.Contains(claudeWithheldEnv, v.FromEnv) {
				return fmt.Errorf("Claude MCP %s: Claude Code never sends %s to a remote server and reads it as empty; copy the value into a variable with a name of your own and reference that", name, v.FromEnv)
			}
		}
	case target == "kilocode" && s.ProjectRoot != "" && server.usesEnv():
		return fmt.Errorf("Kilo Code MCP %s: Kilo does not allow environment references in project config and ignores the whole file when it finds one; remove fromEnv here or define this server in global mode", name)
	}
	return nil
}

func (s *Service) previewResolved(source *Source, resolutions []Resolution) (*Plan, error) {
	matched := map[string]bool{}
	for _, r := range resolutions {
		key := r.Target + "\x00" + r.Name
		if _, exists := matched[key]; exists || !validTarget(r.Target) || (r.Action != "replace" && r.Action != "adopt") {
			return nil, fmt.Errorf("invalid or duplicate MCP conflict resolution")
		}
		matched[key] = false
	}
	state, stateBytes, err := s.loadLedger()
	if err != nil {
		return nil, err
	}
	p := &Plan{SourcePath: source.Path, Changes: []Change{}, source: source, state: state, stateBytes: stateBytes}
	desired, targets, err := s.render(source)
	if err != nil {
		return nil, err
	}
	for _, owned := range state.Entries {
		if owned.Owner == source.ConfigPath {
			targets[owned.Path] = owned.Target
		}
	}
	proposal, _ := json.Marshal(struct {
		Servers     map[string]Server
		Targets     []string
		Resolutions []Resolution
	}{source.Servers, source.Targets, resolutions})
	revision := digest(source.configBytes) + digest(source.bytes) + digest(stateBytes) + digest(proposal)
	local := s.claudeLocalServers()
	for _, path := range sortedKeys(targets) {
		target := targets[path]
		data, exists, mode, err := safeRead(path)
		if err != nil {
			return nil, err
		}
		native, err := ParseNative(target, data)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", path, err)
		}
		f := &filePlan{path: path, target: target, before: data, exists: exists, mode: mode, section: sectionDigest(native), changes: map[string]map[string]any{}}
		revision += path + f.section
		names := map[string]bool{}
		for name := range desired[path] {
			names[name] = true
		}
		for _, owned := range state.Entries {
			if owned.Owner == source.ConfigPath && owned.Path == path {
				names[owned.Name] = true
			}
		}
		for _, name := range sortedKeys(names) {
			key := ownershipKey(target, path, name)
			owned, managed := state.Entries[key]
			current := native.Entries[name]
			currentHash := entryHash(managedEntry(target, current))
			want := desired[path][name]
			wantHash := entryHash(managedEntry(target, want))
			for _, resolution := range resolutions {
				if resolution.Target != shownTarget(target) || resolution.Name != name {
					continue
				}
				matched[resolution.Target+"\x00"+name] = true
				if managed && owned.Owner != source.ConfigPath {
					// An owner that still exists must release the entry itself. One that was
					// moved or deleted never can, so an explicit resolution may take over.
					if _, err := os.Lstat(owned.Owner); err == nil {
						break
					}
				}
				// adopt claims only an entry that already matches; anything else
				// stays a conflict for an explicit replace.
				if resolution.Action == "adopt" && currentHash != wantHash {
					continue
				}
				owned = ownership{Owner: source.ConfigPath, Target: target, Path: path, Name: name, Hash: currentHash}
				managed = true
				p.state.Entries[key] = owned
			}
			change := Change{Target: shownTarget(target), Path: path, Name: name}
			switch {
			case managed && owned.Owner != source.ConfigPath:
				change.Action, change.Message = "conflict", "managed by another Skillshare config: "+owned.Owner
			case currentHash == wantHash && managed && want != nil && native.cramped(name):
				// The content is right but it is all on one line. Sync owns this entry, so it
				// writes it again, laid out; the person pressing Sync expects a file they can read.
				change.Action, change.Message = "update", "same settings, laid out one field per line"
				f.changes[name] = withAgentFields(target, current, want)
				p.state.Entries[key] = ownership{Owner: source.ConfigPath, Target: target, Path: path, Name: name, Hash: wantHash}
			case currentHash == wantHash:
				// Already as desired, e.g. after pulling a teammate's change or
				// moving a project. Refresh an owned baseline, but never claim an
				// unmanaged entry: removing the server must not delete the user's own.
				if want == nil {
					delete(p.state.Entries, key)
					continue
				}
				change.Action = "unchanged"
				if managed {
					p.state.Entries[key] = ownership{Owner: source.ConfigPath, Target: target, Path: path, Name: name, Hash: currentHash}
				}
			case managed && currentHash != owned.Hash:
				change.Action, change.Message = "conflict", "Agent configuration changed; import it or explicitly replace this entry"
			case !managed && current != nil:
				change.Action, change.Message = "conflict", "existing entry is not managed; import it to explicitly adopt it"
			case want == nil:
				change.Action = "remove"
				f.changes[name] = nil
				delete(p.state.Entries, key)
			default:
				change.Action = "add"
				if managed {
					change.Action = "update"
				}
				f.changes[name] = withAgentFields(target, current, want)
				p.state.Entries[key] = ownership{Owner: source.ConfigPath, Target: target, Path: path, Name: name, Hash: wantHash}
			}
			if change.Action == "conflict" {
				p.Blocked = true
			} else if target == "claude" && want != nil && local[name] != nil {
				change.Message = "a local scope server of the same name in ~/.claude.json overrides this one in this project; remove it with: claude mcp remove " + name + " -s local"
			}
			p.Changes = append(p.Changes, change)
		}
		f.after, err = native.Edit(f.changes)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", path, err)
		}
		p.files = append(p.files, f)
	}
	p.Revision = digest([]byte(revision))
	for _, found := range matched {
		if !found {
			return nil, fmt.Errorf("conflict resolution does not refer to a selected MCP entry")
		}
	}
	return p, nil
}
