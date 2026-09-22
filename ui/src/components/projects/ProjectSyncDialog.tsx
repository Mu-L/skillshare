import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CircleCheck, CircleMinus, Minus, Plus, RefreshCw, TriangleAlert } from 'lucide-react';
import { api, type SyncResponse, type Target } from '../../api/client';
import { mcpApi } from '../../api/mcp';
import AgentIcon from '../AgentIcon';
import Button from '../Button';
import DialogShell from '../DialogShell';
import Spinner from '../Spinner';
import { SyncUpToDate } from '../SyncResultList';
import { describeMessage, targetLabel } from '../mcp/mcpView';
import { countChanges, MCP_CHANGED, mcpGroups, projectChanges, resourceGroups, runSync, type ChangeGroup, type RowIcon } from '../sync/syncView';
import { refreshTargets } from '../targets/targetView';
import { useT } from '../../i18n';
import { shortenHome } from '../../lib/paths';
import { queryKeys, staleTimes } from '../../lib/queryKeys';
import type { ProjectRow } from './projectView';

const ROW_ICON: Record<RowIcon, React.ReactNode> = {
  add: <Plus size={16} className="shrink-0 text-ok" />,
  update: <RefreshCw size={15} className="shrink-0 text-link" />,
  remove: <Minus size={16} className="shrink-0 text-bad" />,
  kept: <CircleMinus size={15} className="shrink-0 text-ink-3" />,
  conflict: <TriangleAlert size={15} className="shrink-0 text-warn" />,
};

interface Props {
  open: boolean;
  onClose: () => void;
  project: ProjectRow;
  /** Project targets; undefined while they load */
  targets: Target[] | undefined;
}

/** Previews and syncs one project: its skills, agents and MCP, nothing else. */
export default function ProjectSyncDialog({ open, onClose, project, targets }: Props) {
  const t = useT();
  const queryClient = useQueryClient();
  const diff = useQuery({ queryKey: queryKeys.diff(), queryFn: () => api.diff(), staleTime: staleTimes.diff, enabled: open });
  const mcp = useQuery({ queryKey: queryKeys.mcp, queryFn: () => mcpApi.list(), enabled: open });
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  // undefined until the sync ran
  const [done, setDone] = useState<SyncResponse | null>();

  const mine = (targets ?? []).filter((tg) => tg.project === project.path);
  const names = new Set(mine.map((tg) => tg.name));
  const diffs = (diff.data?.diffs ?? []).filter((d) => names.has(d.target));
  const ignored = { skill: diff.data?.ignored_skills, agent: diff.data?.agent_ignored_skills };
  const plan = mcp.data?.plan;
  const changes = projectChanges(plan, project.path);
  const mcpBlocked = changes.some((c) => c.action === 'conflict');
  const sections: { label: string; groups: ChangeGroup[] }[] = [
    { label: 'Skills', groups: resourceGroups(diffs, mine, new Set(['skill']), false, ignored).groups },
    { label: 'Agents', groups: resourceGroups(diffs, mine, new Set(['agent']), false, ignored).groups },
    { label: 'MCP', groups: plan ? mcpGroups({ ...plan, changes }) : [] },
  ].filter((s) => s.groups.length > 0);
  const count = sections.reduce((n, s) => n + (s.label === 'MCP' && mcpBlocked ? 0 : countChanges(s.groups)), 0);
  const loading = diff.isPending || mcp.isPending || !targets;

  const close = () => {
    onClose();
    setDone(undefined);
    setError('');
  };
  const sync = async () => {
    setRunning(true);
    setError('');
    try {
      const { resources } = await runSync({
        resources: project.declared ? 'both' : null,
        extras: false,
        mcp: plan && !mcpBlocked && changes.some((c) => c.action !== 'unchanged') ? plan : null,
        force: false,
        project: { root: project.root, path: project.path },
      });
      setDone(resources ?? null);
    } catch (err) {
      const message = (err as Error).message;
      setError(message === MCP_CHANGED ? t('sync.mcpChanged') : message);
    } finally {
      setRunning(false);
      refreshTargets(queryClient);
      for (const queryKey of [queryKeys.mcp, ['log']]) void queryClient.invalidateQueries({ queryKey });
    }
  };

  const title = t('projects.sync.title', { name: project.name });
  return (
    <DialogShell open={open} onClose={close} maxWidth="2xl" padding="none" preventClose={running} ariaLabel={title}>
      <div className="dh">
        <div className="flex flex-col gap-1">
          <h2 className="ss-h2">{title}</h2>
          <p className="text-[13px] text-ink-2">{t('projects.sync.subtitle')}</p>
        </div>
      </div>
      <div className="db">
        {done !== undefined ? (
          <>
            <div className="ss-note inf"><CircleCheck size={16} /><span className="flex-1">{t('projects.sync.done', { name: project.name })}</span></div>
            {done?.warnings?.map((w) => <div key={w} className="ss-note warn"><TriangleAlert size={16} /><span className="flex-1">{w}</span></div>)}
          </>
        ) : (
          <>
            {error && <div className="ss-note bad"><AlertCircle size={16} /><span className="flex-1">{error}</span></div>}
            {mcpBlocked && <div className="ss-note warn"><TriangleAlert size={16} /><span className="flex-1">{t('projects.sync.mcpConflict')}</span></div>}
            {loading ? (
              <div className="ss-list"><div className="ss-r gap-2 text-[13px] text-ink-2"><Spinner size="sm" />{t('sync.checking')}</div></div>
            ) : diff.error ? (
              <div className="ss-note bad"><AlertCircle size={16} /><span className="flex-1">{diff.error.message}</span></div>
            ) : sections.length === 0 ? (
              <SyncUpToDate text={t('sync.nothing')} />
            ) : (
              sections.map((s) => (
                <section key={s.label} className="flex flex-col gap-2">
                  <h3 className="text-[13px] font-semibold">{s.label}</h3>
                  <div className="ss-list">
                    {s.groups.map((g) => (
                      <Fragment key={g.key}>
                        <div className="ss-gh">
                          <span className="ss-at"><AgentIcon target={g.name} size={15} /></span>
                          <span className="font-semibold">{g.part === 'mcp' ? targetLabel(g.name) : g.name}</span>
                          {g.path && <span className="min-w-0 truncate font-mono text-[12px] text-ink-3" title={g.path}>{shortenHome(g.path)}</span>}
                        </div>
                        {g.rows.map((r) => (
                          <div key={r.key} className="ss-r">
                            {ROW_ICON[r.icon]}
                            <span className="max-w-[45%] shrink-0 truncate font-mono text-[13px] font-semibold" title={r.name}>{r.name}</span>
                            <span className={`min-w-0 flex-1 truncate text-[13px] ${r.icon === 'conflict' ? 'text-warn' : 'text-ink-2'}`} title={r.detail}>
                              {r.text ? t(r.text) : r.part === 'mcp' ? describeMessage(t, r.detail) : r.detail}
                            </span>
                          </div>
                        ))}
                      </Fragment>
                    ))}
                  </div>
                </section>
              ))
            )}
          </>
        )}
      </div>
      <div className="df">
        {done !== undefined || (!loading && !diff.error && sections.length === 0) ? (
          <Button variant="primary" onClick={close}>{t('projects.sync.close')}</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close} disabled={running}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={() => void sync()} loading={running} disabled={loading || count === 0}>
              {count > 0 ? t(count === 1 ? 'sync.run.one' : 'sync.run.other', { count }) : t('sync.run.none')}
            </Button>
          </>
        )}
        {/* Last in DOM so the dialog's initial focus lands on a button; order-first keeps it on the left. */}
        <Link to="/sync" className="ss-more order-first mr-auto" onClick={close}>{t('projects.sync.openPage')}</Link>
      </div>
    </DialogShell>
  );
}
