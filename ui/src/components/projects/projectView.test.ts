import { describe, expect, it } from 'vitest';
import type { ProjectList } from '../../api/client';
import { projectRows, toolGroups } from './projectView';

const tools: ProjectList['tools'] = [
  { name: 'claude', skillsPath: '.claude/skills', agentsPath: '.claude/agents' },
  { name: 'codex', skillsPath: '.agents/skills', agentsPath: '' },
  { name: 'cursor', skillsPath: '.agents/skills', agentsPath: '.cursor/agents' },
];

describe('toolGroups', () => {
  it('puts tools that share a skills folder in one group', () => {
    expect(toolGroups(tools, ['claude', 'codex', 'cursor'])).toEqual([
      { tools: ['claude'], skillsPath: '.claude/skills' },
      { tools: ['codex', 'cursor'], skillsPath: '.agents/skills' },
    ]);
  });
});

describe('projectRows', () => {
  it('adds the folders only mcp.projects names, undeclared', () => {
    const list = { projects: [{ root: '~/a', path: '/home/u/a', name: 'a', targets: ['claude'], skills: null, agents: null, groups: [], missing: false, hasOwnConfig: false }], convertible: [], tools };
    const mcp = { source: { projects: { '/home/u/a': {}, '/home/u/work/b': {} } }, projectConfigs: ['/home/u/work/b'] } as unknown as Parameters<typeof projectRows>[1];
    const rows = projectRows(list, mcp);
    expect(rows.map((p) => [p.name, p.declared, p.hasOwnConfig])).toEqual([['a', true, false], ['b', false, true]]);
  });
});
