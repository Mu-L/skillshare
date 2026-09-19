package install

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestGiteaDownloadDir_WritesNestedFiles(t *testing.T) {
	var srv *httptest.Server
	srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/v1/repos/o/r/contents/skills":
			fmt.Fprintf(w, `[{"type":"file","name":"SKILL.md","path":"skills/SKILL.md","download_url":"%s/raw/SKILL.md"},{"type":"dir","name":"ref","path":"skills/ref"}]`, srv.URL)
		case "/api/v1/repos/o/r/contents/skills/ref":
			fmt.Fprintf(w, `[{"type":"file","name":"a.md","path":"skills/ref/a.md","download_url":"%s/raw/a.md"}]`, srv.URL)
		case "/raw/SKILL.md", "/raw/a.md":
			fmt.Fprint(w, "body of "+filepath.Base(r.URL.Path))
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	dest := t.TempDir()
	if err := giteaDownloadDirRecursive(srv.Client(), srv.URL+"/api/v1", "o", "r", "skills", dest, nil); err != nil {
		t.Fatal(err)
	}
	got, err := os.ReadFile(filepath.Join(dest, "ref", "a.md"))
	if err != nil || string(got) != "body of a.md" {
		t.Fatalf("nested file = %q, %v", got, err)
	}
}

func TestGiteaDownloadDir_RefusesDownloadURLOnAnotherHost(t *testing.T) {
	t.Setenv("GITEA_TOKEN", "secret")
	var leaked string
	other := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		leaked = r.Header.Get("Authorization")
	}))
	defer other.Close()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, `[{"type":"file","name":"SKILL.md","path":"SKILL.md","download_url":"%s/steal"}]`, other.URL)
	}))
	defer srv.Close()

	err := giteaDownloadDirRecursive(srv.Client(), srv.URL+"/api/v1", "o", "r", "", t.TempDir(), nil)
	if err == nil || !strings.Contains(err.Error(), "not on the API host") {
		t.Fatalf("err = %v", err)
	}
	if leaked != "" {
		t.Fatalf("token reached another host: %q", leaked)
	}
}

func TestGiteaDownloadDir_RefusesTraversalName(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, `[{"type":"file","name":"..","path":"..","download_url":"http://x/y"}]`)
	}))
	defer srv.Close()

	if err := giteaDownloadDirRecursive(srv.Client(), srv.URL, "o", "r", "", t.TempDir(), nil); err == nil {
		t.Fatal("expected an error for a \"..\" name")
	}
}

func TestCNBDownloadDir_WritesBlobFromTree(t *testing.T) {
	content := base64.StdEncoding.EncodeToString([]byte("hello"))
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/org/repo/-/git/contents/skills":
			fmt.Fprint(w, `{"type":"tree","name":"skills","path":"skills","entries":[{"type":"blob","name":"SKILL.md","path":"skills/SKILL.md"}]}`)
		case "/org/repo/-/git/contents/skills/SKILL.md":
			fmt.Fprintf(w, `{"type":"blob","name":"SKILL.md","path":"skills/SKILL.md","content":"%s"}`, content)
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	dest := t.TempDir()
	if err := cnbDownloadDirRecursive(srv.Client(), srv.URL, "org/repo", "skills", dest, nil); err != nil {
		t.Fatal(err)
	}
	got, err := os.ReadFile(filepath.Join(dest, "SKILL.md"))
	if err != nil || string(got) != "hello" {
		t.Fatalf("file = %q, %v", got, err)
	}
}
