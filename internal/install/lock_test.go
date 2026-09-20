package install

import "testing"

func TestLockCommitFor(t *testing.T) {
	const sha = "8f14e45fceea167a5a36dedd4bea2543ce848564"
	lock := &Lock{Skills: map[string]LockEntry{
		"ok":     {Source: "src", Commit: sha},
		"moved":  {Source: "old-src", Commit: sha},
		"short":  {Source: "src", Commit: sha[:12]},
		"option": {Source: "src", Commit: "--upload-pack=touch /tmp/pwned"},
	}}
	want := map[string]string{"ok": sha, "moved": "", "short": "", "option": "", "absent": ""}
	for name, commit := range want {
		if got := lock.CommitFor(name, "src"); got != commit {
			t.Errorf("CommitFor(%q) = %q, want %q", name, got, commit)
		}
	}
	if got := (*Lock)(nil).CommitFor("ok", "src"); got != "" {
		t.Errorf("nil lock returned %q", got)
	}
}
