import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../Button';
import { RailLine, SyncBox } from '../StatusRail';
import { useT } from '../../i18n';
import { shortenHome } from '../../lib/paths';
import { projectOf, targetLabel, type MCPChange } from './mcpView';

/** What Sync would write. A change inside a project names the folder, since one server can land in several. */
export default function MCPSyncBox({ changes, roots }: { changes: MCPChange[]; roots: string[] }) {
  const t = useT();
  const navigate = useNavigate();
  const pending = changes.filter((c) => c.action === 'add' || c.action === 'update' || c.action === 'remove');
  return (
    <SyncBox tone={pending.length > 0 ? 'warn' : 'ok'} state={pending.length > 0 ? t(pending.length === 1 ? 'mcp.pending.one' : 'mcp.pending.other', { count: pending.length }) : t('targets.state.synced')}>
      {pending.length > 0 && (
        <>
          <div className="flex flex-col gap-1.5">
            {pending.map((c) => {
              const root = projectOf(roots, c.path);
              return <RailLine key={`${c.path}:${c.target}:${c.name}`} name={c.name} agent={root ? `${targetLabel(c.target)} · ${shortenHome(root)}` : targetLabel(c.target)} word={c.action} />;
            })}
          </div>
          <Button className="w-full justify-center" onClick={() => navigate('/sync')}>{t('mcp.reviewInSync')}<ChevronRight size={15} /></Button>
        </>
      )}
      {/* Ticks only change the source; MCP files are written from the Sync page, so say so where the state is. */}
      <p className={pending.length > 0 ? 'text-xs leading-normal text-ink-2' : 'text-[13px] leading-normal text-ink-2'}>{t('mcp.syncHint')}</p>
      {pending.length === 0 && <button type="button" className="ss-more self-start" onClick={() => navigate('/sync')}>{t('mcp.reviewInSync')}</button>}
    </SyncBox>
  );
}
