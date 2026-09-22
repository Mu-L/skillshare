import { Fragment, useState } from 'react';
import { Ellipsis, Plug, SlidersHorizontal } from 'lucide-react';
import { useT } from '../../i18n';
import Tooltip from '../Tooltip';
import { mcpOffTargets } from '../../api/mcp';
import { describeEndpoint, type MatrixRow } from './mcpView';
import { TargetPill, TargetToggles } from './TargetPicker';
import { useDirectToolsLabel } from './MCPProjectSettings';

interface Props {
  rows: MatrixRow[];
  targets: string[];
  targetsOf: (name: string) => string[];
  onToggle: (name: string, target: string, on: boolean) => void;
  onMenu: (e: React.MouseEvent<HTMLButtonElement>, name: string) => void;
  /** Opens the server's edit dialog, where the Pi settings live. */
  onEdit?: (name: string) => void;
  /** Agents a switch-only entry can go to. mcp.projects cannot reach Claude's off list. */
  offTargets?: readonly string[];
}

/**
 * One row per server. The agents it writes to are chips inside the row, not columns:
 * the list grows downwards as more CLIs gain MCP support, so it never scrolls sideways.
 */
export default function MCPServerList({ rows, targets, targetsOf, onToggle, onMenu, onEdit, offTargets = mcpOffTargets }: Props) {
  const t = useT();
  const [open, setOpen] = useState<string[]>([]);
  const directToolsLabel = useDirectToolsLabel();

  return (
    <div className="ss-list">
      {rows.map((row) => {
        // A switch-only entry works in a few Agents, so it offers and counts only those.
        const offered = row.server?.disabled ? targets.filter((x) => offTargets.includes(x)) : targets;
        const selected = row.server ? targetsOf(row.name).filter((x) => offered.includes(x)) : [];
        const expanded = open.includes(row.name);
        const http = Boolean(row.server?.url);
        const direct = row.server?.directTools;
        const piOptions = Object.keys(row.server?.piOptions ?? {}).length > 0;
        const piSettings = row.server?.piExtension === 'pi-mcp-adapter' && selected.includes('pi') && (direct !== undefined || piOptions);
        return (
          <Fragment key={row.name}>
            <div className="ss-r">
              <span className="ss-cat sm mcp"><Plug size={14} /></span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-2">
                  <span title={row.name} className={`truncate font-mono font-semibold ${row.server ? '' : 'text-ink-3 line-through'}`}>{row.name}</span>
                  {row.server && Object.values(row.cells).some((c) => c.action === 'add' || c.action === 'update' || c.action === 'remove') && <span className="ss-tag warn">{t('plugins.pending')}</span>}
                  {row.server && !row.server.disabled && row.server.targets?.length === 0 && <span className="ss-tag">{t('plugins.noAgentsYet')}</span>}
                  {!row.server && <span className="ss-st bad">{t('mcp.removedFromSource')}</span>}
                </span>
                {/* Transport and endpoint on one quiet line, the same shape as a plugin row. */}
                <span className="truncate text-xs text-ink-3">{!row.server ? t('mcp.removedHint') : row.server.disabled ? t('mcp.offHere') : <>{http ? 'http' : 'stdio'} · <span className="font-mono">{describeEndpoint(row.server)}</span></>}</span>
              </span>
              {row.server && (
                <>
                  {/* Only which Pi settings exist, never their contents: piOptions may hold anything. */}
                  {piSettings && (
                    <Tooltip
                      block
                      content={
                        <span className="flex flex-col gap-1">
                          <span className="font-semibold">Pi · pi-mcp-adapter</span>
                          {direct !== undefined && <span>{t('mcp.directTools')}: {directToolsLabel(direct)}</span>}
                          {piOptions && <span>{t('mcp.piOptions')}: {t('mcp.piOptionsSet')}</span>}
                        </span>
                      }
                    >
                      <button type="button" className="ss-ib" aria-label={t('mcp.piSettingsLabel', { name: row.name })} onClick={() => onEdit?.(row.name)}>
                        <SlidersHorizontal size={16} />
                      </button>
                    </Tooltip>
                  )}
                  <TargetPill selected={selected} text={`${selected.length}/${offered.length}`} expanded={expanded} label={t('mcp.chooseAgents', { name: row.name })} onClick={() => setOpen((prev) => (expanded ? prev.filter((x) => x !== row.name) : [...prev, row.name]))} />
                  <button type="button" className="ss-ib" aria-label={t('mcp.moreActions', { name: row.name })} onClick={(e) => onMenu(e, row.name)}>
                    <Ellipsis size={16} />
                  </button>
                </>
              )}
            </div>
            {expanded && row.server && (
              <div className="ss-r fold !min-h-0 flex-wrap gap-x-6 gap-y-3.5 !py-3.5">
                <TargetToggles offered={offered} selected={selected} http={http} onToggle={(target, on) => onToggle(row.name, target, on)} />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
