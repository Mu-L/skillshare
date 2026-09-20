import { useState } from 'react';
import { AlertCircle, Pencil, Plug, Plus, Trash2 } from 'lucide-react';
import { mcpApi, mcpOffTargets, mcpTargets, type MCPMutation, type MCPServer } from '../../api/mcp';
import Button from '../Button';
import ConfirmDialog from '../ConfirmDialog';
import PageHeader from '../PageHeader';
import { RailLayout } from '../StatusRail';
import { SkillContextMenu, type ContextMenuItem } from '../TargetMenu';
import { useToast } from '../Toast';
import { useT } from '../../i18n';
import { shortenHome } from '../../lib/paths';
import { DirectToolsSetting, ProjectTargets, useDirectToolsLabel } from './MCPProjectSettings';
import MCPRemoveDialog from './MCPRemoveDialog';
import MCPServerDialog from './MCPServerDialog';
import MCPServerList from './MCPServerList';
import MCPSyncBox from './MCPSyncBox';
import { TargetPill } from './TargetPicker';
import { buildMatrix, describeEndpoint, projectOf, targetLabel } from './mcpView';

type MCPList = Awaited<ReturnType<typeof mcpApi.list>>;

// What each Agent's project file gets for a switch, as its docs spell it.
const switchField: Record<string, string> = { opencode: 'enabled: false', kilocode: 'enabled: false', pi: 'disabled: true' };

interface Props {
  data: MCPList;
  root: string;
  offered: readonly string[];
  onBack: () => void;
  onChanged: () => void;
  onRemoved: () => void;
}

/** One root under mcp.projects: its defaults, the global servers it turns off, and servers of its own. */
export default function MCPProjectView({ data, root, offered, onBack, onChanged, onRemoved }: Props) {
  const t = useT();
  const { toast } = useToast();
  const directLabel = useDirectToolsLabel();
  const [pickTargets, setPickTargets] = useState(false);
  const [editing, setEditing] = useState<string | null>(null); // '' adds a new server
  const [removing, setRemoving] = useState('');
  const [dropping, setDropping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

  const project = data.source.projects?.[root] ?? {};
  const globals = data.source.servers;
  const defaults = data.source.targets ?? [];
  const targets = project.targets ?? defaults;
  const servers = project.servers ?? {};
  const roots = Object.keys(data.source.projects ?? {});
  const changes = (data.plan?.changes ?? []).filter((c) => projectOf(roots, c.path) === root);
  const name = shortenHome(root);
  // A switch for a global server belongs to the list above; everything else is the project's own.
  const own = Object.fromEntries(Object.entries(servers).filter(([n, s]) => !(s.disabled && globals[n])));
  const targetsOf = (n: string) => own[n]?.targets ?? targets;
  const offTargets = mcpOffTargets.filter((x) => x !== 'claude');

  const save = async (mutation: MCPMutation) => {
    setBusy(true);
    try {
      await mcpApi.save({ ...mutation, project: root });
      onChanged();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  /** Agents where this global server can be turned off from here. */
  const switchable = (server: MCPServer) =>
    (server.targets ?? defaults).filter((x) => offTargets.includes(x) && (x !== 'pi' || server.piExtension === 'pi-mcp-adapter'));

  const toggleGlobal = (n: string, on: boolean) => {
    const to = switchable(globals[n]);
    return save(on ? { name: n, remove: true } : { name: n, replace: true, server: { disabled: true, targets: to, ...(to.includes('pi') && { piExtension: 'pi-mcp-adapter' }) } });
  };

  const toggleOwn = (n: string, target: string, on: boolean) => {
    const next = mcpTargets.filter((x) => (x === target ? on : targetsOf(n).includes(x)));
    if (next.length === 0) return toast(t('mcp.needTarget'), 'warning');
    if (target === 'pi' && on && !own[n].piExtension && !own[n].disabled) return setEditing(n);
    void save({ name: n, replace: true, server: { ...own[n], targets: next } });
  };

  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, n: string) => {
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({ x: r.left, y: r.bottom + 4, items: [
      { key: 'edit', label: t('mcp.edit'), icon: <Pencil size={14} />, onSelect: () => setEditing(n) },
      { key: 'remove', label: t('mcp.remove'), icon: <Trash2 size={14} />, danger: true, onSelect: () => setRemoving(n) },
    ] });
  };

  const drop = async () => {
    setBusy(true);
    try {
      await mcpApi.save({ project: root, remove: true });
      onRemoved();
    } catch (e) {
      toast((e as Error).message, 'error');
      setBusy(false);
    }
  };

  const ownRows = buildMatrix(own, data.plan && { ...data.plan, changes: changes.filter((c) => own[c.name]) });
  const shown = mcpTargets.filter((x) => offered.includes(x) || ownRows.some((row) => targetsOf(row.name).includes(x)));

  return (
    <div className="animate-fade-in">
      <PageHeader
        mono
        title={name}
        subtitle={t('mcp.projects.subtitle')}
        crumbs={[{ label: 'MCP', onClick: onBack }, { label: t('mcp.tab.projects'), onClick: onBack }, { label: name }]}
        actions={<Button variant="danger" onClick={() => setDropping(true)}><Trash2 size={15} />{t('mcp.projects.remove')}</Button>}
      />
      <RailLayout rail={data.plan && <MCPSyncBox changes={changes} roots={roots} />}>
        {data.projectConfigs.includes(root) && <div className="ss-note warn"><AlertCircle size={16} /><span className="flex-1">{t('mcp.projects.ownConfig')}</span></div>}
        <div className="ss-box flex flex-col gap-3.5">
          <dl className="ss-kv !grid-cols-[110px_minmax(0,1fr)] items-center">
            <dt>{t('mcp.projects.path')}</dt>
            <dd className="truncate font-mono" title={root}>{root}</dd>
            <dt>{t('mcp.targets')}</dt>
            <dd><TargetPill selected={targets} text={project.targets ? `${targets.length}/${offered.length}` : t('mcp.projects.inherit')} expanded={pickTargets} label={t('mcp.chooseAgents', { name })} onClick={() => setPickTargets(!pickTargets)} /></dd>
            {/* Only pi-mcp-adapter reads it, so it is offered once Pi is one of the project's targets. */}
            {targets.includes('pi') && <>
              <dt className="self-start pt-2.5">{t('mcp.directTools')}</dt>
              <dd className="max-w-[320px]"><DirectToolsSetting value={project.directTools} disabled={busy} unsetLabel={t('mcp.directToolsInherit', { value: directLabel(data.source.directTools) })} onSave={(directTools) => void save({ replace: true, settings: { targets: project.targets, directTools } })} /></dd>
            </>}
          </dl>
          {pickTargets && <ProjectTargets value={project.targets} defaults={defaults} offered={offered} disabled={busy} onChange={(next) => void save({ replace: true, settings: { targets: next, directTools: project.directTools } })} />}
        </div>

        <section className="mt-3 flex flex-col">
          <div className="ss-sec"><h2>{t('mcp.projects.globalServers')}</h2><span className="ss-cnt">{Object.keys(globals).length}</span><span className="text-[13px] text-ink-2">{t('mcp.projects.globalHint')}</span></div>
          {Object.keys(globals).length > 0 ? (
            <div className="ss-list">
              {Object.keys(globals).sort().map((n) => {
                const server = globals[n];
                const entry = servers[n];
                const off = Boolean(entry?.disabled);
                const to = switchable(server);
                const hint = entry && !off ? t('mcp.projects.overridden')
                  : off ? (entry.targets ?? to).filter((x) => switchField[x]).map((x) => t('mcp.projects.writesSwitch', { target: targetLabel(x), field: switchField[x] })).join(', ')
                  : to.length > 0 ? t('mcp.projects.followsGlobal')
                  : (server.targets ?? defaults).includes('claude') ? t('mcp.projects.claudeOnly') : t('mcp.projects.noSwitch');
                return (
                  <div key={n} className="ss-r">
                    <span className="ss-cat sm mcp"><Plug size={14} /></span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-center gap-2">
                        <span title={n} className="truncate font-mono font-semibold">{n}</span>
                        {off && <span className="ss-tag warn">{t('mcp.projects.offBadge')}</span>}
                        {changes.some((c) => c.name === n && ['add', 'update', 'remove'].includes(c.action)) && <span className="ss-tag warn">{t('plugins.pending')}</span>}
                      </span>
                      <span className="truncate text-xs text-ink-3">{server.url ? 'http' : 'stdio'} · <span className="font-mono">{describeEndpoint(server)}</span></span>
                    </span>
                    <span id={`mcp-sw-${n}`} className="max-w-[250px] text-right text-xs text-ink-2">{hint}</span>
                    <button type="button" role="switch" aria-checked={!off} aria-label={n} aria-describedby={`mcp-sw-${n}`} className={`ss-sw ${off ? '' : 'on'} disabled:opacity-50`} disabled={busy || (!off && to.length === 0) || Boolean(entry && !off)} onClick={() => void toggleGlobal(n, off)}><i /></button>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-[13px] text-ink-3">{t('mcp.empty')}</p>}
        </section>

        <section className="mt-3 flex flex-col">
          <div className="ss-sec !items-center"><h2>{t('mcp.projects.onlyHere')}</h2><span className="ss-cnt">{ownRows.length}</span><Button className="ml-auto" size="sm" variant="secondary" onClick={() => setEditing('')}><Plus size={14} />{t('mcp.addServer')}</Button></div>
          {ownRows.length > 0
            ? <MCPServerList rows={ownRows} targets={shown} targetsOf={targetsOf} offTargets={offTargets} onToggle={toggleOwn} onMenu={openMenu} />
            : <p className="text-[13px] text-ink-3">{t('mcp.projects.noOnlyHere')}</p>}
        </section>
      </RailLayout>

      {editing !== null && (
        <MCPServerDialog
          project={root}
          defaultPiExtension={Object.values({ ...globals, ...own }).find((s) => s.piExtension)?.piExtension}
          initial={editing ? { name: editing, server: own[editing] } : undefined}
          defaultTargets={targets}
          existingNames={Object.keys(servers)}
          availableTargets={offered}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onChanged(); toast(t('mcp.toast.saved'), 'success'); }}
        />
      )}
      {removing && <MCPRemoveDialog name={removing} project={root} inScope={(path) => projectOf(roots, path) === root} onClose={() => setRemoving('')} onSaved={() => { const n = removing; setRemoving(''); onChanged(); toast(t('mcp.toast.removed', { name: n }), 'success'); }} />}
      <ConfirmDialog open={dropping} variant="danger" loading={busy} title={t('mcp.projects.removeTitle', { name })} message={t('mcp.projects.removeDesc')} confirmText={t('mcp.projects.remove')} onCancel={() => setDropping(false)} onConfirm={() => void drop()} />
      <SkillContextMenu open={!!menu} anchorPoint={menu ?? undefined} items={menu?.items ?? []} onClose={() => setMenu(null)} />
    </div>
  );
}
