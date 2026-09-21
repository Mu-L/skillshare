package server

import (
	"mime"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

// Go takes a file's type from the Windows registry when it has one, and a machine
// whose registry gets .svg wrong was served icons the browser refused to draw. Only
// icons too large to inline are files at all, which is why one Agent's logo broke
// while the rest showed. Refs: #289.
func TestSPAServesSVGAsAnImageWhateverTheSystemSays(t *testing.T) {
	if err := mime.AddExtensionType(".svg", "text/plain"); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = mime.AddExtensionType(".svg", "image/svg+xml") })

	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "assets"), 0700); err != nil {
		t.Fatal(err)
	}
	for name, body := range map[string]string{"index.html": "<html><head></head></html>", "assets/icon.svg": `<svg xmlns="http://www.w3.org/2000/svg"/>`} {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(body), 0600); err != nil {
			t.Fatal(err)
		}
	}

	rr := httptest.NewRecorder()
	spaHandlerFromDisk(dir, "").ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/assets/icon.svg", nil))
	if got := rr.Header().Get("Content-Type"); got != "image/svg+xml" {
		t.Fatalf("Content-Type = %q", got)
	}
}
