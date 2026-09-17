package install

import (
	"path/filepath"
	"sort"
	"strings"

	"skillshare/internal/audit"
)

// acceptedKeyPath returns the .metadata.json key under which accepted findings
// for the resource at path are stored. Mirrors WriteMetaToStore's path logic.
func acceptedKeyPath(sourceDir, path string) (string, string, bool) {
	if sourceDir == "" {
		sourceDir = filepath.Dir(path)
	}
	rel, err := filepath.Rel(sourceDir, path)
	if err != nil || rel == "." || strings.HasPrefix(rel, "..") {
		return "", "", false
	}
	return sourceDir, filepath.ToSlash(rel), true
}

// ApplyAcceptedFindings marks findings previously accepted via --force for the
// resource at path so they no longer block. No-op when nothing was recorded.
func ApplyAcceptedFindings(sourceDir, path string, res *audit.Result) int {
	if res == nil {
		return 0
	}
	dir, rel, ok := acceptedKeyPath(sourceDir, path)
	if !ok {
		return 0
	}
	store, err := loadMetadataFile(dir)
	if err != nil {
		return 0
	}
	return res.MarkAcknowledged(store.AuditAccepted[rel])
}

// RecordAcceptedFindings persists the keys of unacknowledged findings at/above
// threshold — the ones the user just overrode — merged with earlier records.
// Returns the number of newly recorded keys.
func RecordAcceptedFindings(sourceDir, path string, res *audit.Result, threshold string) (int, error) {
	if res == nil {
		return 0, nil
	}
	keys := res.AcceptKeysAtOrAbove(threshold)
	if len(keys) == 0 {
		return 0, nil
	}
	dir, rel, ok := acceptedKeyPath(sourceDir, path)
	if !ok {
		return 0, nil
	}
	store, err := LoadMetadata(dir)
	if err != nil {
		return 0, err
	}
	if store.AuditAccepted == nil {
		store.AuditAccepted = make(map[string][]string)
	}
	existing := make(map[string]bool, len(store.AuditAccepted[rel]))
	for _, k := range store.AuditAccepted[rel] {
		existing[k] = true
	}
	added := 0
	for _, k := range keys {
		if !existing[k] {
			existing[k] = true
			added++
		}
	}
	if added == 0 {
		return 0, nil
	}
	merged := make([]string, 0, len(existing))
	for k := range existing {
		merged = append(merged, k)
	}
	sort.Strings(merged)
	store.AuditAccepted[rel] = merged
	return added, store.Save(dir)
}
