import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { api, type Skill, type Target } from '../api/client';
import { I18nProvider } from '../i18n';
import { ProjectsList } from './ResourceDetailPage';

vi.mock('../api/client', async (load) => ({ ...await load<typeof import('../api/client')>(), api: { getSyncMatrix: vi.fn(), listTargets: vi.fn() } }));

describe('Resource detail projects', () => {
  // The Skills list counts project targets, so the detail page lists them too, one row per project.
  it('lists each project once and links to its page', async () => {
    vi.mocked(api.listTargets).mockResolvedValue({ targets: [
      { name: 'docs@claude', project: '/work/docs', path: '/work/docs/.claude/skills' },
      { name: 'docs@opencode', project: '/work/docs', path: '/work/docs/.opencode/skills' },
    ] as Target[], sourceSkillCount: 1 });
    vi.mocked(api.getSyncMatrix).mockResolvedValue({ entries: [
      { skill: 'pdf', target: 'docs@claude', status: 'synced', reason: '' },
      { skill: 'pdf', target: 'docs@opencode', status: 'synced', reason: '' },
    ] } as never);
    render(<MemoryRouter><QueryClientProvider client={new QueryClient()}><I18nProvider>
      <ProjectsList resource={{ flatName: 'pdf', kind: 'skill' } as Skill} diffs={[]} statusText={() => 'Linked'} />
    </I18nProvider></QueryClientProvider></MemoryRouter>);
    expect(await screen.findByRole('link', { name: /docs/ })).toHaveAttribute('href', '/projects/%2Fwork%2Fdocs');
  });
});
