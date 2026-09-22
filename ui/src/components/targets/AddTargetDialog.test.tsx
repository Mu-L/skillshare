import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../api/client';
import { I18nProvider } from '../../i18n';
import AddTargetDialog from './AddTargetDialog';

vi.mock('../../api/client', async (load) => ({ ...await load<typeof import('../../api/client')>(), api: { addTarget: vi.fn(), addAgentConfigDir: vi.fn() } }));

const available = [
  { name: 'claude', path: '/home/me/.claude/skills', agentPath: '/home/me/.claude/agents', configDir: '/home/me/.claude', installed: true, detected: false },
  { name: 'codex', path: '/home/me/.agents/skills', configDir: '/home/me/.codex', installed: true, detected: false },
  { name: 'cursor', path: '/home/me/.cursor/skills', installed: false, detected: true },
];

describe('Add target dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.addAgentConfigDir).mockResolvedValue({ success: true });
  });

  it('adds another config folder of an Agent that is already a target, showing where it writes', async () => {
    const user = userEvent.setup();
    const added = vi.fn();
    render(<I18nProvider><AddTargetDialog available={available} existing={['claude']} onClose={vi.fn()} onAdded={added} /></I18nProvider>);
    await user.click(screen.getByRole('button', { name: /Another account/ }));
    expect(screen.getByRole('radio', { name: 'claude' })).toBeChecked();
    expect(screen.queryByRole('radio', { name: 'cursor' })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Config folder'), '~/.claude-work');
    expect(screen.getByLabelText('Name')).toHaveValue('claude-work');
    expect(screen.getByText('~/.claude-work/skills')).toBeInTheDocument();
    expect(screen.getByText('~/.claude-work/agents')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add claude-work' }));
    await waitFor(() => expect(added).toHaveBeenCalledWith('claude-work'));
    expect(api.addAgentConfigDir).toHaveBeenCalledWith('claude-work', 'claude', '~/.claude-work');
  });

  // Codex reads the shared ~/.agents/skills, but an account's skills stay in its own folder.
  it('writes an account of an Agent whose skills live outside its config folder into that folder', async () => {
    const user = userEvent.setup();
    render(<I18nProvider><AddTargetDialog available={available} existing={['claude', 'codex']} onClose={vi.fn()} onAdded={vi.fn()} /></I18nProvider>);
    await user.click(screen.getByRole('button', { name: /Another account/ }));
    await user.click(screen.getByRole('radio', { name: 'codex' }));
    await user.type(screen.getByLabelText('Config folder'), '~/.codex-work');
    expect(screen.getByText('~/.codex-work/skills')).toBeInTheDocument();
  });
});
