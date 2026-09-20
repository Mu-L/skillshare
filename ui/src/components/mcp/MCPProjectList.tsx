import { Fragment, useState } from 'react';
import { Ellipsis, Folder } from 'lucide-react';
import type { MCPProject, MCPSettings } from '../../api/mcp';
import { useT } from '../../i18n';
import { shortenHome } from '../../lib/paths';
import { ProjectTargets } from './MCPProjectSettings';
import { TargetPill } from './TargetPicker';
import { projectOf, type MCPChange } from './mcpView';

interface Props {
  projects: Record<string, MCPProject>;
  defaults: string[];
  /** Names of the global servers, to tell a switch from a server of the project's own. */
  globalNames: string[];
  offered: readonly string[];
  changes: MCPChange[];
  onOpen: (root: string) => void;
  onSettings: (root: string, settings: MCPSettings) => void;
  onMenu: (e: React.MouseEvent<HTMLButtonElement>, root: string) => void;
}

/** One row per root under mcp.projects. */
export default function MCPProjectList({ projects, defaults, globalNames, offered, changes, onOpen, onSettings, onMenu }: Props) {
  const t = useT();
  const [open, setOpen] = useState<string[]>([]);
  const roots = Object.keys(projects).sort();
  const plural = (key: string, count: number) => t(`${key}.${count === 1 ? 'one' : 'other'}`, { count });

  return (
    <div className="ss-list">
      {roots.map((root) => {
        const project = projects[root];
        const name = shortenHome(root);
        const servers = Object.entries(project.servers ?? {});
        const off = servers.filter(([n, s]) => s.disabled && globalNames.includes(n)).length;
        const own = servers.length - off;
        const selected = project.targets ?? defaults;
        const expanded = open.includes(root);
        const pending = changes.some((c) => projectOf(roots, c.path) === root && (c.action === 'add' || c.action === 'update' || c.action === 'remove'));
        return (
          <Fragment key={root}>
            <div className="ss-r">
              <span className="ss-cat sm mcp"><Folder size={14} /></span>
              <button type="button" className="flex min-w-0 flex-1 flex-col gap-0.5 text-left" onClick={() => onOpen(root)}>
                <span className="flex items-center gap-2">
                  <span title={root} className="truncate font-mono font-semibold">{name}</span>
                  {pending && <span className="ss-tag warn">{t('plugins.pending')}</span>}
                </span>
                <span className="truncate text-xs text-ink-3">{[off > 0 && plural('mcp.projects.off', off), own > 0 && plural('mcp.projects.own', own)].filter(Boolean).join(' · ') || t('mcp.projects.none')}</span>
              </button>
              <TargetPill
                selected={selected}
                text={project.targets ? `${selected.length}/${offered.length}` : t('mcp.projects.inherit')}
                expanded={expanded}
                label={t('mcp.chooseAgents', { name })}
                onClick={() => setOpen((prev) => (expanded ? prev.filter((x) => x !== root) : [...prev, root]))}
              />
              <button type="button" className="ss-ib" aria-label={t('mcp.moreActions', { name })} onClick={(e) => onMenu(e, root)}><Ellipsis size={16} /></button>
            </div>
            {expanded && (
              <div className="ss-r fold !min-h-0 !py-3.5">
                <ProjectTargets value={project.targets} defaults={defaults} offered={offered} onChange={(targets) => onSettings(root, { targets, directTools: project.directTools })} />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
