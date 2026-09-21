import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n';
import { mcpApi } from '../../api/mcp';
import { ToastProvider } from '../Toast';
import MCPProjectView from './MCPProjectView';

vi.mock('../../api/mcp', async (load) => ({ ...await load<typeof import('../../api/mcp')>(), mcpApi: { save: vi.fn().mockResolvedValue({}) } }));

type Data = Parameters<typeof MCPProjectView>[0]['data'];

const view = (servers: Data['source']['servers'], project: NonNullable<Data['source']['projects']>[string]) => {
  const data = {
    source: { path: '', configPath: '', targets: null, servers, projects: { '/work/app': project } },
    projectConfigs: [], paths: {}, detected: [], plan: null, previewError: '', backups: [],
  } as Data;
  render(<MemoryRouter><QueryClientProvider client={new QueryClient()}><I18nProvider><ToastProvider><MCPProjectView data={data} root="/work/app" offered={['claude', 'cursor', 'opencode', 'pi']} onChanged={vi.fn()} onRemoved={vi.fn()} /></ToastProvider></I18nProvider></QueryClientProvider></MemoryRouter>);
};
const context7 = { command: 'npx', targets: ['claude', 'cursor', 'opencode'] };

describe('MCP project view', () => {
  it('turns a global server off without storing targets, so the switch follows the project', async () => {
    const user = userEvent.setup();
    view({ context7 }, { targets: ['opencode'] });
    await user.click(screen.getByRole('switch', { name: 'context7' }));
    await waitFor(() => expect(mcpApi.save).toHaveBeenCalledWith({ name: 'context7', replace: true, server: { disabled: true }, project: '/work/app' }));
  });

  it('names the Agents that keep loading a server turned off here', () => {
    view({ context7 }, { targets: ['claude', 'cursor'], servers: { context7: { disabled: true } } });
    expect(screen.getByText(/No per-project switch in Cursor/)).toBeInTheDocument();
  });

  it('says when a switch saved with its own targets no longer matches the project', () => {
    view({ context7 }, { targets: ['opencode'], servers: { context7: { disabled: true, targets: ['claude', 'opencode'] } } });
    expect(screen.getByText(/Saved with its own Agents/)).toBeInTheDocument();
  });

  it('counts Pi for a switch only with pi-mcp-adapter, as sync does', () => {
    view({}, { targets: ['opencode', 'pi'], servers: { gone: { disabled: true } } });
    expect(screen.getByRole('button', { name: 'Choose which agents get gone' })).toHaveTextContent('1/3');
  });
});
