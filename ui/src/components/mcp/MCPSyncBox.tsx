import { useState } from 'react';
import { ChevronRight, RefreshCw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { MCPPlan } from '../../api/mcp';
import Button from '../Button';
import DialogShell from '../DialogShell';
import { RailLine, SyncBox } from '../StatusRail';
import { MCP_CHANGED, runSync } from '../sync/syncView';
import { useT } from '../../i18n';
import { queryKeys } from '../../lib/queryKeys';
import { shortenHome } from '../../lib/paths';
import { projectOf, targetLabel, type MCPChange } from './mcpView';

const isPending = (c: MCPChange) => c.action === 'add' || c.action === 'update' || c.action === 'remove';

function ChangeLines({ changes, roots }: { changes: MCPChange[]; roots: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {changes.map((c) => {
        const root = projectOf(roots, c);
        return <RailLine key={`${c.path}:${root ?? ''}:${c.target}:${c.name}`} name={c.name} agent={root ? `${targetLabel(c.target)} · ${shortenHome(root)}` : targetLabel(c.target)} word={c.action} />;
      })}
    </div>
  );
}

/** Confirm, then write the whole MCP plan. The plan is global, so a project's box still syncs every project. */
function MCPSyncDialog({ plan, shown, roots, onClose }: { plan: MCPPlan; shown: number; roots: string[]; onClose: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const pending = plan.changes.filter(isPending);
  const outside = pending.length - shown;
  const title = t('mcp.syncButton');

  const sync = async () => {
    setRunning(true);
    setError('');
    try {
      await runSync({ resources: null, extras: false, mcp: plan, force: false });
      setDone(true);
    } catch (e) {
      const message = (e as Error).message;
      setError(message === MCP_CHANGED ? t('sync.mcpChanged') : message);
    } finally {
      setRunning(false);
      for (const queryKey of [queryKeys.mcp, ['log']]) void queryClient.invalidateQueries({ queryKey });
    }
  };

  return (
    <DialogShell open onClose={onClose} padding="none" maxWidth="lg" preventClose={running} ariaLabel={title}>
      <div className="dh">
        <h2 className="ss-h2">{done ? t('syncPreview.titleComplete') : title}</h2>
        <button type="button" className="ss-ib" aria-label={t('common.close')} onClick={onClose} disabled={running}><X size={16} /></button>
      </div>
      <div className="db">
        <p className="text-[13px] text-ink-2">{t(done ? 'mcp.syncDialog.done' : 'mcp.syncDialog.subtitle')}</p>
        <ChangeLines changes={pending} roots={roots} />
        {!done && outside > 0 && <p className="text-[13px] text-ink-2">{t(outside === 1 ? 'mcp.syncDialog.outside.one' : 'mcp.syncDialog.outside.other', { count: outside })}</p>}
        {error && <div className="ss-note bad"><span className="flex-1">{error}</span></div>}
      </div>
      <div className="df">
        {done ? (
          <Button onClick={onClose}>{t('common.close')}</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={running}>{t('common.cancel')}</Button>
            {/* A moved plan is stale: close and reopen from the refreshed box instead of retrying it. */}
            {!error && <Button onClick={() => void sync()} loading={running}>{t(pending.length === 1 ? 'mcp.syncDialog.confirm.one' : 'mcp.syncDialog.confirm.other', { count: pending.length })}</Button>}
          </>
        )}
        <button type="button" className="ss-more order-first mr-auto" onClick={() => { onClose(); navigate('/sync'); }} disabled={running}>{t('syncPreview.openSyncPage')}</button>
      </div>
    </DialogShell>
  );
}

/** What Sync would write. A change inside a project names the folder, since one server can land in several. */
export default function MCPSyncBox({ changes, roots, plan }: { changes: MCPChange[]; roots: string[]; plan: MCPPlan }) {
  const t = useT();
  const navigate = useNavigate();
  // Held while the dialog is open, so the list it confirms stays put when the queries refresh.
  const [reviewing, setReviewing] = useState<{ plan: MCPPlan; shown: number } | null>(null);
  const pending = changes.filter(isPending);
  return (
    <SyncBox tone={pending.length > 0 ? 'warn' : 'ok'} state={pending.length > 0 ? t(pending.length === 1 ? 'mcp.pending.one' : 'mcp.pending.other', { count: pending.length }) : t('targets.state.synced')}>
      {pending.length > 0 && (
        <>
          <ChangeLines changes={pending} roots={roots} />
          {/* A blocked plan applies nothing; the Sync page shows why. */}
          {plan.blocked
            ? <Button className="w-full justify-center" onClick={() => navigate('/sync')}>{t('mcp.reviewInSync')}<ChevronRight size={15} /></Button>
            : <Button className="w-full justify-center" onClick={() => setReviewing({ plan, shown: pending.length })}><RefreshCw size={15} />{t('mcp.syncButton')}</Button>}
        </>
      )}
      {/* Ticks only change the source; say where the files get written, next to the state. */}
      <p className={pending.length > 0 ? 'text-xs leading-normal text-ink-2' : 'text-[13px] leading-normal text-ink-2'}>{t('mcp.syncHint')}</p>
      {pending.length === 0 && <button type="button" className="ss-more self-start" onClick={() => navigate('/sync')}>{t('mcp.reviewInSync')}</button>}
      {reviewing && <MCPSyncDialog {...reviewing} roots={roots} onClose={() => setReviewing(null)} />}
    </SyncBox>
  );
}
