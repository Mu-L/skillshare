package install

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestIsCommitSHA(t *testing.T) {
	cases := map[string]bool{
		"8f14e45fceea167a5a36dedd4bea2543ce848564": true,
		"8f14e45":   true,
		"main":      false,
		"v1.2.3":    false,
		"8f14e4":    false, // too short
		"deadbeefg": false, // non-hex
		"":          false,
	}
	for ref, want := range cases {
		if got := IsCommitSHA(ref); got != want {
			t.Errorf("IsCommitSHA(%q) = %v, want %v", ref, got, want)
		}
	}
}

// setupPinRemote creates a bare file:// remote with two commits on main and an
// annotated tag v1 on the first commit. Returns the URL and the first commit SHA.
func setupPinRemote(t *testing.T) (url, firstSHA string) {
	t.Helper()
	base := t.TempDir()
	bare := filepath.Join(base, "remote.git")
	runGit(t, "", "init", "--bare", bare)
	seed := filepath.Join(base, "seed")
	runGit(t, "", "clone", bare, seed)
	runGit(t, seed, "config", "user.email", "test@test.com")
	runGit(t, seed, "config", "user.name", "test")
	os.WriteFile(filepath.Join(seed, "SKILL.md"), []byte("# v1"), 0644)
	runGit(t, seed, "add", ".")
	runGit(t, seed, "commit", "-m", "c1")
	runGit(t, seed, "tag", "-a", "v1", "-m", "v1")
	os.WriteFile(filepath.Join(seed, "SKILL.md"), []byte("# v2"), 0644)
	runGit(t, seed, "add", ".")
	runGit(t, seed, "commit", "-m", "c2")
	runGit(t, seed, "push", "origin", "HEAD:main", "--tags")
	runGit(t, bare, "symbolic-ref", "HEAD", "refs/heads/main")

	out, err := exec.Command("git", "-C", seed, "rev-parse", "HEAD~1").Output()
	if err != nil {
		t.Fatal(err)
	}
	return "file://" + bare, strings.TrimSpace(string(out))
}

func TestCloneRepo_PinnedRef(t *testing.T) {
	url, sha := setupPinRemote(t)
	for name, ref := range map[string]string{
		"full sha":  sha,
		"short sha": sha[:7],
		"tag":       "v1",
	} {
		t.Run(name, func(t *testing.T) {
			dest := filepath.Join(t.TempDir(), "repo")
			if err := cloneRepo(url, dest, ref, true, nil); err != nil {
				t.Fatalf("cloneRepo(%q): %v", ref, err)
			}
			got, err := getGitFullHash(dest)
			if err != nil {
				t.Fatal(err)
			}
			if got != sha {
				t.Errorf("HEAD = %s, want %s", got, sha)
			}
		})
	}
}
