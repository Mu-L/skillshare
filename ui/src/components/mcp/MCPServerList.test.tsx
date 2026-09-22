import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n';
import MCPServerList from './MCPServerList';

describe('MCP server list', () => {
  it('shows which Pi adapter settings a server has on focus, without their contents', async () => {
    const user = userEvent.setup();
    const server = { command: 'npx', targets: ['pi'], piExtension: 'pi-mcp-adapter', directTools: true, piOptions: { excludeTools: ['secret_*'] } };
    render(<I18nProvider><MCPServerList rows={[{ name: 'docs', server, cells: {} }]} targets={['pi']} targetsOf={() => ['pi']} onToggle={vi.fn()} onMenu={vi.fn()} /></I18nProvider>);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Pi adapter settings for docs' })).toHaveFocus();
    const tip = await screen.findByRole('tooltip');
    expect(tip).toHaveTextContent('Direct tools: All tools');
    expect(tip).toHaveTextContent('Other adapter settings: Set');
    expect(tip).not.toHaveTextContent('secret_');
  });

  it('opens the server editor from the Pi settings button', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const server = { command: 'npx', targets: ['pi'], piExtension: 'pi-mcp-adapter', directTools: true };
    render(<I18nProvider><MCPServerList rows={[{ name: 'docs', server, cells: {} }]} targets={['pi']} targetsOf={() => ['pi']} onToggle={vi.fn()} onMenu={vi.fn()} onEdit={onEdit} /></I18nProvider>);
    await user.click(screen.getByRole('button', { name: 'Pi adapter settings for docs' }));
    expect(onEdit).toHaveBeenCalledWith('docs');
  });
});
