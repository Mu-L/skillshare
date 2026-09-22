import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CircleCheck, RefreshCw, TriangleAlert } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import type { SyncResult } from '../api/client';

import { api } from '../api/client';
import { invalidateAfterSync } from '../lib/sync';
import Button from './Button';
import DialogShell from './DialogShell';
import Spinner from './Spinner';
import SyncResultList, { SyncUpToDate } from './SyncResultList';
import { useT } from '../i18n';

interface SyncPreviewModalProps {
  open: boolean;
  onClose: () => void;
  /** Syncs only this kind and says so; unset syncs skills and agents together. */
  kind?: 'skill' | 'agent';
}

export default function SyncPreviewModal({ open, onClose, kind }: SyncPreviewModalProps) {
  const t = useT();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [results, setResults] = useState<SyncResult[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const runDryRun = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWarnings([]);
    try {
      const res = await api.sync({ dryRun: true, kind });
      setResults(res.results);
      setWarnings(res.warnings ?? []);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [kind]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.sync({ dryRun: false, kind });
      setResults(res.results);
      setSynced(true);
      invalidateAfterSync(queryClient);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  // Clear stale data on open/close; auto-run dry-run when opening
  useEffect(() => {
    setResults(null);
    setError(null);
    setWarnings([]);
    setSynced(false);
    if (open) {
      runDryRun();
    }
  }, [open, runDryRun]);

  const allUpToDate =
    results !== null &&
    results.every(
      (r) =>
        (r.linked?.length ?? 0) === 0 &&
        (r.updated?.length ?? 0) === 0 &&
        (r.pruned?.length ?? 0) === 0 &&
        !r.dir_created,
    );

  // Agent results list only targets with something to do, so an empty list means up to date.
  const noTargets = results !== null && results.length === 0 && kind !== 'agent';

  const title = synced ? t('syncPreview.titleComplete') : kind ? t(`syncPreview.title.${kind}`) : t('syncPreview.titlePreview');
  const canSync = !allUpToDate && !noTargets && results && !error;
  return (
    <DialogShell open={open} onClose={onClose} maxWidth="2xl" padding="none" preventClose={syncing} ariaLabel={title}>
      <div className="dh">
        <div className="flex flex-col gap-1">
          <h2 className="ss-h2">{title}</h2>
          {kind && !synced && <p className="text-[13px] text-ink-2">{t(`syncPreview.scope.${kind}`)}</p>}
        </div>
        {results !== null && !loading && !synced && (
          <button type="button" className="ss-ib" onClick={runDryRun} title={t('syncPreview.refreshPreview')} aria-label={t('syncPreview.refreshPreview')}>
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      <div className="db">
        {synced && <div className="ss-note inf"><CircleCheck size={16} /><span className="flex-1">{t('syncPreview.completed')}</span></div>}
        {warnings.map((w) => <div key={w} className="ss-note warn"><TriangleAlert size={16} /><span className="flex-1">{w}</span></div>)}

        {loading && <div className="ss-list"><div className="ss-r gap-2 text-[13px] text-ink-2"><Spinner size="sm" />{t('syncPreview.dryRunning')}</div></div>}

        {error && (
          <div className="ss-note bad">
            <AlertCircle size={16} />
            <span className="flex-1">{error}</span>
            <Button variant="secondary" size="sm" onClick={runDryRun}>{t('syncPreview.retryButton')}</Button>
          </div>
        )}

        {!loading && !error && noTargets && <SyncUpToDate text={t('syncPreview.noTargets')} />}
        {!loading && !error && allUpToDate && !noTargets && <SyncUpToDate text={t('syncPreview.allUpToDate')} />}

        {!loading && !error && results && !allUpToDate && !noTargets && (
          // One row per target can outgrow the dialog; scroll the list so the buttons stay reachable
          <SyncResultList results={results} className="max-h-[50vh] !overflow-y-auto" />
        )}
      </div>

      <div className="df">
        {synced || (!loading && results !== null && !canSync && !error) ? (
          <Button variant="primary" onClick={onClose}>{t('syncPreview.closeButton')}</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={syncing}>{t('syncPreview.cancelButton')}</Button>
            {canSync && <Button onClick={handleSync} loading={syncing}>{t('syncPreview.syncNowButton')}</Button>}
          </>
        )}
        {/* Last in DOM so the dialog's initial focus lands on a button; order-first keeps it on the left. */}
        {kind && <button type="button" className="ss-more order-first mr-auto" onClick={() => { onClose(); navigate('/sync'); }} disabled={syncing}>{t('syncPreview.openSyncPage')}</button>}
      </div>
    </DialogShell>
  );
}
