import { CircleCheck } from 'lucide-react';

import type { SyncResult } from '../api/client';

import AgentIcon from './AgentIcon';
import { useT } from '../i18n';

/** Friendly empty state for a sync with nothing to write. */
export function SyncUpToDate({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-ok-bg text-ok"><CircleCheck size={24} /></span>
      <p className="text-[14px] text-ink-2">{text}</p>
    </div>
  );
}

/** One compact row per target with changes; untouched targets fold into a single closing line. */
export default function SyncResultList({ results, className = '' }: { results: SyncResult[]; className?: string }) {
  const t = useT();
  const changed = [...results].sort((a, b) => a.target.localeCompare(b.target)).filter((r) => r.linked?.length || r.updated?.length || r.pruned?.length || r.dir_created);
  const rest = results.filter((r) => !changed.includes(r));

  return (
    <div className={`ss-list ${className}`}>
      {changed.map((r) => {
        const linked = r.linked?.length ?? 0;
        const updated = r.updated?.length ?? 0;
        const pruned = r.pruned?.length ?? 0;
        return (
          <div key={r.target} className="ss-r">
            <span className="ss-at"><AgentIcon target={r.target} size={15} /></span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold" title={r.target}>{r.target}</span>
            <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
              {r.dir_created && <span className="ss-tag inf">{t('syncResult.dirCreated')}</span>}
              {linked > 0 && <span className="ss-tag ok">{t('syncResult.linked', { count: linked })}</span>}
              {updated > 0 && <span className="ss-tag inf">{t('syncResult.updated', { count: updated })}</span>}
              {pruned > 0 && <span className="ss-tag warn">{t('syncResult.pruned', { count: pruned })}</span>}
            </span>
          </div>
        );
      })}
      {rest.length > 0 && (
        <div className="ss-r text-[13px] text-ink-3" title={rest.map((r) => r.target).join(', ')}>
          <CircleCheck size={16} className="shrink-0 text-ok" />
          {t(rest.length === 1 ? 'syncResult.upToDate.one' : 'syncResult.upToDate.other', { count: rest.length })}
        </div>
      )}
    </div>
  );
}
