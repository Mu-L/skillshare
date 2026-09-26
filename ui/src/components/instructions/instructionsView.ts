import type { QueryClient } from '@tanstack/react-query';
import type { InstructionsAssignment, SharedInstructionsFile, SharedInstructionsTarget } from '../../api/client';
import { queryKeys } from '../../lib/queryKeys';

/** Why a new shared file name would be refused, checked as the user types. Same rule as the server. */
export function sharedNameProblem(name: string, taken: string[]): 'invalid' | 'taken' | null {
  const n = name.trim();
  if (!n) return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(n)) return 'invalid';
  return taken.includes(n) ? 'taken' : null;
}

/** Why a target's instruction file path would be refused, checked as the user types. Same rule as the server. */
export function setupPathProblem(path: string, project: boolean): 'directory' | 'absolute' | 'relative' | null {
  const p = path.trim();
  if (!p) return null;
  if (p.endsWith('/') || p.endsWith('\\')) return 'directory';
  const rooted = p.startsWith('/') || /^[A-Za-z]:[\\/]/.test(p);
  if (project) return rooted || p.startsWith('~') ? 'absolute' : null;
  return rooted || p.startsWith('~/') ? null : 'relative';
}

/** Refetch everything a change to instruction files can touch. */
export function refreshInstructions(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.instructions.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.extras });
  queryClient.invalidateQueries({ queryKey: queryKeys.extrasDiff() });
  queryClient.invalidateQueries({ queryKey: queryKeys.config });
}

/** An @path line: tool-specific import syntax, as the server's ImportLines sees it. */
export const isImportLine = (text: string) => /^\s*@\S+\s*$/.test(text);

/** 1-based numbers of the @import lines outside code fences. */
export function importLines(content: string): number[] {
  const out: number[] = [];
  let fence = false;
  content.split('\n').forEach((line, i) => {
    if (line.trim().startsWith('```')) fence = !fence;
    else if (!fence && isImportLine(line)) out.push(i + 1);
  });
  return out;
}

/** "3", "3–4" or "3, 7–8": line numbers folded into ranges. */
export function lineRanges(lines: number[]): string {
  const parts: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    let j = i;
    while (j + 1 < lines.length && lines[j + 1] === lines[j] + 1) j++;
    parts.push(j > i ? `${lines[i]}–${lines[j]}` : `${lines[i]}`);
    i = j;
  }
  return parts.join(', ');
}

export type DiffLine = { kind: 'add' | 'del' | 'same'; text: string };

/** A line diff (LCS) of two small files, for change previews. */
export function lineDiff(before: string, after: string): DiffLine[] {
  const a = before ? before.replace(/\n$/, '').split('\n') : [];
  const b = after ? after.replace(/\n$/, '').split('\n') : [];
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i] });
      i++;
      j++;
    } else if (j < b.length && (i >= a.length || lcs[i][j + 1] >= lcs[i + 1][j])) {
      out.push({ kind: 'add', text: b[j++] });
    } else {
      out.push({ kind: 'del', text: a[i++] });
    }
  }
  return out;
}

/** Tone of an assignment's status for .ss-st. */
export function statusTone(status: string): string {
  if (status === 'synced') return 'ok';
  if (status === 'no source') return 'bad';
  return 'warn';
}

/** The status that most needs attention among a target's shared files. */
export function worstStatus(assigned: InstructionsAssignment[]): string | null {
  const order = ['no source', 'modified', 'drift', 'not synced', 'synced'];
  let worst: string | null = null;
  for (const a of assigned) {
    if (worst === null || order.indexOf(a.status) < order.indexOf(worst)) worst = a.status;
  }
  return worst;
}

export const formatSize = (bytes: number) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`);

/** Shared files over the limit of a target that cuts its global file short. */
export function overLimit(target: SharedInstructionsTarget, files: SharedInstructionsFile[]): SharedInstructionsFile[] {
  if (!target.max_chars) return [];
  return files.filter((f) => f.chars > target.max_chars! && target.assigned.some((a) => a.name === f.name));
}
