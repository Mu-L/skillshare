package mcp

import (
	"bytes"
	"crypto/sha256"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

// Source is a single resolved declaration plus the files used to obtain it.
type Source struct {
	ConfigPath string            `json:"configPath"`
	Path       string            `json:"path"`
	Targets    []string          `json:"targets"`
	Servers    map[string]Server `json:"servers"`
	// DirectTools is the default for pi-mcp-adapter servers that do not set their own,
	// as Targets is for targets. It stands in for the adapter's settings.directTools,
	// which shares Pi's file with the servers and a plan edits each file once.
	DirectTools any `json:"directTools,omitempty"`
	// Projects are project roots a global config syncs into, keyed by absolute path.
	Projects map[string]Project `json:"projects,omitempty"`
	// projectKeys holds each root as config.yaml spells it, so saving keeps a leading ~.
	projectKeys map[string]string
	// What a draft changed, so save re-encodes nothing else.
	touched                         map[string]bool
	serversChanged, settingsChanged bool
	configDoc                       yaml.Node
	doc                             yaml.Node
	configBytes                     []byte
	bytes                           []byte
}

// Project is what a project's own config.yaml would hold under mcp, declared in the
// global config instead so one sync reaches every root.
type Project struct {
	Targets     []string          `yaml:"targets,omitempty" json:"targets,omitempty"`
	DirectTools any               `yaml:"directTools,omitempty" json:"directTools,omitempty"`
	Servers     map[string]Server `yaml:"servers,omitempty" json:"servers,omitempty"`
}

func mapping(node *yaml.Node) *yaml.Node {
	if node.Kind == yaml.DocumentNode && len(node.Content) == 1 {
		return node.Content[0]
	}
	return node
}

func field(node *yaml.Node, key string) *yaml.Node {
	node = mapping(node)
	if node.Kind != yaml.MappingNode {
		return nil
	}
	for i := 0; i+1 < len(node.Content); i += 2 {
		if node.Content[i].Value == key {
			return node.Content[i+1]
		}
	}
	return nil
}

func put(node *yaml.Node, key string, value any) error {
	node = mapping(node)
	if node.Kind != yaml.MappingNode {
		return fmt.Errorf("expected YAML mapping")
	}
	var n yaml.Node
	if err := n.Encode(value); err != nil {
		return err
	}
	for i := 0; i+1 < len(node.Content); i += 2 {
		if node.Content[i].Value == key {
			node.Content[i+1] = &n
			return nil
		}
	}
	node.Content = append(node.Content, &yaml.Node{Kind: yaml.ScalarNode, Tag: "!!str", Value: key}, &n)
	return nil
}

func expandHome(path string) (string, error) {
	// ~\ is how a Windows user writes it; elsewhere a backslash is part of a file name.
	if path == "~" || len(path) > 1 && path[0] == '~' && (path[1] == '/' || path[1] == filepath.Separator) {
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		if path == "~" {
			return home, nil
		}
		return filepath.Join(home, path[2:]), nil
	}
	return path, nil
}

func parseYAML(data []byte, node *yaml.Node) error {
	d := yaml.NewDecoder(bytes.NewReader(data))
	if err := d.Decode(node); err != nil {
		return fmt.Errorf("invalid YAML; check syntax and duplicate keys")
	}
	if d.Decode(new(yaml.Node)) != io.EOF {
		return fmt.Errorf("MCP configuration must contain one YAML document")
	}
	if mapping(node).Kind != yaml.MappingNode {
		return fmt.Errorf("expected a YAML mapping")
	}
	var check map[string]any
	if err := node.Decode(&check); err != nil {
		return fmt.Errorf("invalid YAML mapping; check duplicate keys")
	}
	return nil
}

// LoadSource resolves exactly one inline or external MCP source. Missing external
// files are errors, never empty manifests eligible for pruning.
func LoadSource(configPath string) (*Source, error) {
	path, err := filepath.Abs(configPath)
	if err != nil {
		return nil, err
	}
	s := &Source{ConfigPath: path, Path: path, Servers: map[string]Server{}, projectKeys: map[string]string{}, touched: map[string]bool{}}
	s.configBytes, err = os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read MCP config: %w", err)
	}
	if err = parseYAML(s.configBytes, &s.configDoc); err != nil {
		return nil, err
	}
	mcp := field(&s.configDoc, "mcp")
	if mcp != nil {
		if mcp.Kind != yaml.MappingNode {
			return nil, fmt.Errorf("mcp must be a mapping")
		}
		for i := 0; i < len(mcp.Content); i += 2 {
			if k := mcp.Content[i].Value; k != "targets" && k != "servers" && k != "projects" && k != "directTools" {
				return nil, fmt.Errorf("unknown mcp field %q", k)
			}
		}
		if n := field(mcp, "targets"); n != nil {
			if err := n.Decode(&s.Targets); err != nil {
				return nil, fmt.Errorf("mcp.targets must be a list of clients")
			}
		}
	}
	if err := validateTargets(s.Targets); err != nil {
		return nil, err
	}
	if mcp != nil {
		if s.Projects, err = ParseProjects(field(mcp, "projects")); err != nil {
			return nil, err
		}
		if projects := field(mcp, "projects"); projects != nil {
			for i := 0; i+1 < len(projects.Content); i += 2 {
				// ParseProjects has already accepted every key.
				root, _ := expandHome(projects.Content[i].Value)
				s.projectKeys[filepath.Clean(root)] = projects.Content[i].Value
			}
		}
		if n := field(mcp, "directTools"); n != nil {
			if err := n.Decode(&s.DirectTools); err != nil || !ValidDirectTools(s.DirectTools) {
				return nil, fmt.Errorf("mcp.directTools must be true, false, \"search\" or a list of tool names")
			}
		}
	}
	var servers *yaml.Node
	if mcp != nil {
		servers = field(mcp, "servers")
	}
	if sources := field(&s.configDoc, "sources"); sources != nil {
		if sources.Kind != yaml.MappingNode {
			return nil, fmt.Errorf("sources must be a mapping")
		}
		if external := field(sources, "mcp"); external != nil {
			if external.Tag != "!!str" || external.Value == "" {
				return nil, fmt.Errorf("sources.mcp must name a YAML file")
			}
			if servers != nil {
				return nil, fmt.Errorf("choose sources.mcp or mcp.servers, not both")
			}
			s.Path, err = expandHome(external.Value)
			if err != nil {
				return nil, err
			}
			if !filepath.IsAbs(s.Path) {
				s.Path = filepath.Join(filepath.Dir(path), s.Path)
			}
			if s.Path == path {
				return nil, fmt.Errorf("sources.mcp cannot refer to config.yaml itself")
			}
			s.bytes, err = os.ReadFile(s.Path)
			if err != nil {
				return nil, fmt.Errorf("read external MCP source: %w", err)
			}
			if err = parseYAML(s.bytes, &s.doc); err != nil {
				return nil, err
			}
			root := mapping(&s.doc)
			for i := 0; i < len(root.Content); i += 2 {
				if root.Content[i].Value != "servers" {
					return nil, fmt.Errorf("external MCP source only supports servers")
				}
			}
			servers = field(&s.doc, "servers")
			if servers == nil {
				return nil, fmt.Errorf("external MCP source requires servers (use servers: {} for an empty list)")
			}
		}
	}
	if servers != nil {
		if servers.Kind != yaml.MappingNode {
			return nil, fmt.Errorf("MCP servers must be a mapping")
		}
		data, err := yaml.Marshal(servers)
		if err != nil {
			return nil, err
		}
		decoder := yaml.NewDecoder(bytes.NewReader(data))
		decoder.KnownFields(true)
		if err := decoder.Decode(&s.Servers); err != nil {
			return nil, fmt.Errorf("invalid MCP server fields: use command/args/env or url/headers/bearerToken and optional targets/transport/piExtension, or disabled with targets")
		}
	}
	for name, server := range s.Servers {
		if err := server.Validate(name); err != nil {
			return nil, err
		}
	}
	return s, nil
}

// ParseProjects reads and validates mcp.projects. The config editor shares it, so it
// never accepts a section that sync would then refuse.
func ParseProjects(node *yaml.Node) (map[string]Project, error) {
	if node == nil {
		return nil, nil
	}
	// The section is decoded on its own to reject unknown fields, so an alias to an
	// anchor outside it, such as one on mcp.servers, has to be expanded first.
	data, err := yaml.Marshal(expandAliases(node))
	if err != nil {
		return nil, err
	}
	var declared map[string]Project
	decoder := yaml.NewDecoder(bytes.NewReader(data))
	decoder.KnownFields(true)
	if err := decoder.Decode(&declared); err != nil {
		reason := "invalid value"
		var typeErr *yaml.TypeError
		if errors.As(err, &typeErr) {
			// Line numbers refer to the re-marshalled section, not the user's file.
			for i, e := range typeErr.Errors {
				if _, after, ok := strings.Cut(e, ": "); ok && strings.HasPrefix(e, "line ") {
					typeErr.Errors[i] = after
				}
			}
			reason = strings.Join(typeErr.Errors, "; ")
		}
		return nil, fmt.Errorf("mcp.projects: %s; each project root takes only targets, servers and directTools", reason)
	}
	projects := map[string]Project{}
	for root, project := range declared {
		path, err := expandHome(root)
		if err != nil {
			return nil, err
		}
		if !filepath.IsAbs(path) {
			return nil, fmt.Errorf("mcp.projects: %s must be an absolute path or start with ~", root)
		}
		path = filepath.Clean(path)
		if _, duplicate := projects[path]; duplicate {
			return nil, fmt.Errorf("mcp.projects: %s is listed twice", path)
		}
		if err := validateTargets(project.Targets); err != nil {
			return nil, err
		}
		if !ValidDirectTools(project.DirectTools) {
			return nil, fmt.Errorf("mcp.projects: %s: directTools must be true, false, \"search\" or a list of tool names", root)
		}
		for name, server := range project.Servers {
			if err := server.Validate(name); err != nil {
				return nil, err
			}
		}
		projects[path] = project
	}
	return projects, nil
}

// expandAliases copies a tree with every alias replaced by what it points to. parseYAML
// has already decoded the whole document, which refuses an anchor that contains itself.
func expandAliases(n *yaml.Node) *yaml.Node {
	if n.Kind == yaml.AliasNode {
		return expandAliases(n.Alias)
	}
	c := *n
	c.Anchor, c.Content = "", nil
	for _, child := range n.Content {
		c.Content = append(c.Content, expandAliases(child))
	}
	return &c
}

func digest(data []byte) string { return fmt.Sprintf("%x", sha256.Sum256(data)) }

// CheckUnchanged rejects edits made after a source was read or previewed.
func (s *Source) CheckUnchanged() error {
	data, err := os.ReadFile(s.ConfigPath)
	if err != nil || !bytes.Equal(data, s.configBytes) {
		return fmt.Errorf("configuration changed; preview again")
	}
	if s.Path != s.ConfigPath {
		data, err = os.ReadFile(s.Path)
		if err != nil || !bytes.Equal(data, s.bytes) {
			return fmt.Errorf("external MCP source changed; preview again")
		}
	}
	return nil
}
