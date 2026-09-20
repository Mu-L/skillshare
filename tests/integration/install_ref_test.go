//go:build !online

package integration

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"skillshare/internal/install"
	"skillshare/internal/testutil"
)

// TestInstallBranch_PinnedSHA verifies --branch accepts a commit SHA and installs
// exactly that revision even after the branch has moved on.
func TestInstallBranch_PinnedSHA(t *testing.T) {
	sb := testutil.NewSandbox(t)
	defer sb.Cleanup()
	sb.WriteConfig("source: " + sb.SourcePath + "\ntargets: {}\n")

	remoteRepo := filepath.Join(sb.Root, "remote-repo.git")
	gitInit(t, remoteRepo, true)
	workDir := filepath.Join(sb.Root, "work")
	gitClone(t, remoteRepo, workDir)

	writeSkill := func(body string) {
		if err := os.WriteFile(filepath.Join(workDir, "SKILL.md"), []byte("---\nname: pinned\n---\n# "+body), 0644); err != nil {
			t.Fatal(err)
		}
	}
	writeSkill("v1")
	gitAddCommit(t, workDir, "v1")
	rev := exec.Command("git", "rev-parse", "HEAD")
	rev.Dir = workDir
	out, err := rev.Output()
	if err != nil {
		t.Fatal(err)
	}
	sha := strings.TrimSpace(string(out))
	writeSkill("v2")
	gitAddCommit(t, workDir, "v2")
	gitPush(t, workDir)

	result := sb.RunCLI("install", "file://"+remoteRepo, "--branch", sha, "--name", "pinned", "--skip-audit")
	result.AssertSuccess(t)

	content := sb.ReadFile(filepath.Join(sb.SourcePath, "pinned", "SKILL.md"))
	if !strings.Contains(content, "# v1") {
		t.Errorf("installed content should be the pinned v1 revision, got:\n%s", content)
	}

	store, err := install.LoadMetadata(sb.SourcePath)
	if err != nil {
		t.Fatalf("load metadata: %v", err)
	}
	entry := store.Get("pinned")
	if entry == nil {
		t.Fatal("expected metadata entry for pinned")
	}
	if entry.Branch != sha {
		t.Errorf("metadata branch = %q, want %q", entry.Branch, sha)
	}
	if !strings.HasPrefix(sha, entry.Version) {
		t.Errorf("metadata version = %q, want prefix of %s", entry.Version, sha)
	}
}
