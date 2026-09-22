import { CircleCheck } from 'lucide-react';

import type { ChangeGroup } from './sync/syncView';

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

/** One compact row per target with changes; targets already in sync fold into a single closing line. */
export default function SyncResultList({ groups, inSync, className = '' }: { groups: ChangeGroup[]; inSync: string[]; className?: string }) {
  const t = useT();

  return (
    <div className={`ss-list ${className}`}>
      {groups.map((g) => {
        const count = (match: (r: ChangeGroup['rows'][number]) => boolean) => g.rows.filter(match).length;
        const folder = count((r) => r.text === 'sync.row.folder');
        const linked = count((r) => r.icon === 'add') - folder;
        const updated = count((r) => r.icon === 'update');
        const pruned = count((r) => r.icon === 'remove');
        const kept = count((r) => r.icon === 'kept');
        return (
          <div key={g.key} className="ss-r">
            <span className="ss-at"><AgentIcon target={g.name} size={15} /></span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold" title={g.path ?? g.name}>{g.name}</span>
            <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
              {folder > 0 && <span className="ss-tag inf">{t('syncResult.dirCreated')}</span>}
              {linked > 0 && <span className="ss-tag ok">{t('syncResult.linked', { count: linked })}</span>}
              {updated > 0 && <span className="ss-tag inf">{t('syncResult.updated', { count: updated })}</span>}
              {pruned > 0 && <span className="ss-tag warn">{t('syncResult.pruned', { count: pruned })}</span>}
              {kept > 0 && <span className="ss-tag">{t('syncResult.skipped', { count: kept })}</span>}
            </span>
          </div>
        );
      })}
      {inSync.length > 0 && (
        <div className="ss-r text-[13px] text-ink-3" title={inSync.join(', ')}>
          <CircleCheck size={16} className="shrink-0 text-ok" />
          {t(inSync.length === 1 ? 'syncResult.upToDate.one' : 'syncResult.upToDate.other', { count: inSync.length })}
        </div>
      )}
    </div>
  );
}
