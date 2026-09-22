import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { I18nProvider } from '../i18n';
import SyncPreviewModal from './SyncPreviewModal';

vi.mock('../api/client', async (load) => ({ ...await load<typeof import('../api/client')>(), api: { sync: vi.fn().mockResolvedValue({ results: [] }) } }));

describe('Sync preview modal', () => {
  // Agent results list only targets with work, so an empty preview is up to date, not "no targets".
  it('previews only the given kind and names the scope', async () => {
    render(<MemoryRouter><QueryClientProvider client={new QueryClient()}><I18nProvider><SyncPreviewModal open onClose={vi.fn()} kind="agent" /></I18nProvider></QueryClientProvider></MemoryRouter>);
    await waitFor(() => expect(api.sync).toHaveBeenCalledWith({ dryRun: true, kind: 'agent' }));
    expect(screen.getByText('Only agents are written. Skills, extras and MCP stay as they are.')).toBeInTheDocument();
    expect(await screen.findByText('Everything is up to date. No sync needed.')).toBeInTheDocument();
  });

  it('opens with focus on Cancel, not the secondary Sync page link', () => {
    render(<MemoryRouter><QueryClientProvider client={new QueryClient()}><I18nProvider><SyncPreviewModal open onClose={vi.fn()} kind="skill" /></I18nProvider></QueryClientProvider></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });
});
