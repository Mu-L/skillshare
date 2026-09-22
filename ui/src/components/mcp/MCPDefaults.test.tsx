import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mcpTargets } from '../../api/mcp';
import { I18nProvider } from '../../i18n';
import MCPDefaults from './MCPDefaults';
import { MCPTargetOrder } from './targetOrder';

const renderDefaults = (targets: string[], onSave = vi.fn()) =>
  render(<I18nProvider><MCPDefaults targets={targets} directTools="search" offered={['claude', 'opencode', 'pi']} onSave={onSave} /></I18nProvider>);

describe('MCP defaults', () => {
  it('offers Direct tools only once Pi is a default target', () => {
    renderDefaults(['claude']);
    expect(screen.queryByText('Direct tools')).not.toBeInTheDocument();
    renderDefaults(['claude', 'pi']);
    expect(screen.getByText('Direct tools')).toBeInTheDocument();
  });

  it('saves both settings when a target is ticked, since a save replaces both', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    renderDefaults(['claude'], onSave);
    await user.click(screen.getByRole('button', { name: 'Choose the default Agents' }));
    await user.click(screen.getByRole('checkbox', { name: 'Pi' }));
    expect(onSave).toHaveBeenCalledWith({ targets: ['claude', 'pi'], directTools: 'search' });
  });

  // claude-work is a target that is another account of Claude; the page adds such names to the order.
  it('offers an account of an Agent next to the Agents', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<I18nProvider><MCPTargetOrder.Provider value={[...mcpTargets, 'claude-work']}><MCPDefaults targets={['claude']} directTools={undefined} offered={['claude', 'claude-work']} onSave={onSave} /></MCPTargetOrder.Provider></I18nProvider>);
    await user.click(screen.getByRole('button', { name: 'Choose the default Agents' }));
    await user.click(screen.getByRole('checkbox', { name: 'claude-work' }));
    expect(onSave).toHaveBeenCalledWith({ targets: ['claude', 'claude-work'], directTools: undefined });
  });
});
