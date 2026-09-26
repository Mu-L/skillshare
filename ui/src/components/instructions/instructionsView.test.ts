import { describe, expect, it } from 'vitest';
import type { SharedInstructionsFile, SharedInstructionsTarget } from '../../api/client';
import { importLines, lineDiff, lineRanges, overLimit, setupPathProblem, sharedNameProblem, worstStatus } from './instructionsView';

describe('importLines', () => {
  it('finds @path lines outside code fences', () => {
    expect(importLines('# Notes\n@RTK.md\n```\n@not-this\n```\n@AGENTS.md\n')).toEqual([2, 6]);
  });

  it('ignores @ mentions inside prose', () => {
    expect(importLines('Ask @someone before merging.')).toEqual([]);
  });
});

describe('lineRanges', () => {
  it('folds consecutive lines into ranges', () => {
    expect(lineRanges([3, 7, 8, 9])).toBe('3, 7–9');
  });
});

describe('lineDiff', () => {
  it('marks removed and added lines around unchanged ones', () => {
    expect(lineDiff('a\nb\nc\n', 'a\nc\nd\n')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'del', text: 'b' },
      { kind: 'same', text: 'c' },
      { kind: 'add', text: 'd' },
    ]);
  });
});

describe('worstStatus', () => {
  it('picks the status that most needs attention', () => {
    expect(worstStatus([
      { name: 'a', mode: 'import', status: 'synced' },
      { name: 'b', mode: 'import', status: 'modified' },
    ])).toBe('modified');
  });
});

describe('overLimit', () => {
  const file = (name: string, chars: number): SharedInstructionsFile => ({ name, file: 'AGENTS.md', path: `/x/${name}/AGENTS.md`, exists: true, size: chars, chars, targets: 0 });
  const windsurf: SharedInstructionsTarget = {
    name: 'windsurf', path: '/h/.codeium/windsurf/memories/global_rules.md', import: false, exists: true, max_chars: 6000,
    assigned: [{ name: 'work', mode: 'symlink', status: 'synced' }],
  };

  it('lists only assigned files longer than the target reads', () => {
    expect(overLimit(windsurf, [file('work', 7000), file('personal', 9000)]).map((f) => f.name)).toEqual(['work']);
  });
});

describe('sharedNameProblem', () => {
  it('rejects names the server would refuse', () => {
    expect(sharedNameProblem('my file', [])).toBe('invalid');
  });

  it('flags a name another extra already uses', () => {
    expect(sharedNameProblem('team', ['rules', 'team'])).toBe('taken');
  });

  it('treats a name that differs only in case as taken', () => {
    expect(sharedNameProblem('Team', ['team'])).toBe('taken');
  });

  it('accepts a new valid name', () => {
    expect(sharedNameProblem('work-2', ['team'])).toBeNull();
  });
});

describe('setupPathProblem', () => {
  it('accepts a ~/ or absolute file in global mode', () => {
    expect([setupPathProblem('~/.myagent/AGENTS.md', false), setupPathProblem('/opt/a/AGENTS.md', false)]).toEqual([null, null]);
  });

  it('refuses a relative file in global mode', () => {
    expect(setupPathProblem('AGENTS.md', false)).toBe('relative');
  });

  it('refuses an absolute file in project mode', () => {
    expect(setupPathProblem('~/AGENTS.md', true)).toBe('absolute');
  });

  it('refuses a directory', () => {
    expect(setupPathProblem('.myagent/', true)).toBe('directory');
  });
});
