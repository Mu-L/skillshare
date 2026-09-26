import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileX, TriangleAlert } from 'lucide-react';
import { api } from '../api/client';
import type { InstructionsAssignment, SharedInstructionsTarget } from '../api/client';
import AgentIcon from '../components/AgentIcon';
import Button from '../components/Button';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { Select } from '../components/Select';
import { PageSkeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import InstructionsEditorDialog from '../components/instructions/InstructionsEditorDialog';
import { formatSize, overLimit, refreshInstructions, statusTone } from '../components/instructions/instructionsView';
import { useT } from '../i18n';
import { queryKeys } from '../lib/queryKeys';
import { shortenHome } from '../lib/paths';

type Pending = { title: string; message: string; confirm: string; danger?: boolean; run: () => Promise<void> };

/** ③ One shared instruction file: which targets use it, how, and their state. */
export default function SharedInstructionPage() {
  const { name = '' } = useParams();
  const t = useT();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: queryKeys.instructions.shared, queryFn: () => api.listSharedInstructions() });
  // Off once deletion starts, so the refresh afterwards does not ask for a file that is gone.
  const [deleting, setDeleting] = useState(false);
  const content = useQuery({ queryKey: queryKeys.instructions.sharedContent(name), queryFn: () => api.getSharedInstructionsContent(name), enabled: !deleting });
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  if (list.isPending) return <PageSkeleton />;
  if (list.error) return <div className="ss-note bad"><span className="flex-1">{list.error.message}</span></div>;
  const file = list.data.files.find((f) => f.name === name);
  if (!file) {
    return (
      <EmptyState
        icon={FileX}
        title={t('instructions.detail.notFound', { name })}
        action={<Link to="/extras?tab=instructions"><Button variant="secondary">{t('instructions.detail.back')}</Button></Link>}
      />
    );
  }

  const using = list.data.targets.filter((tg) => tg.assigned.some((a) => a.name === name));
  const addable = list.data.targets.filter((tg) => !tg.same_as && !using.includes(tg) && (tg.import || tg.assigned.length === 0));

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      if (done) toast(done, 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
      refreshInstructions(queryClient);
    }
  };

  const add = (tg: SharedInstructionsTarget) => run(async () => {
    const res = await api.assignSharedInstructions([tg.name], [...tg.assigned.map((a) => a.name), name]);
    if (!res.success) throw new Error(res.errors.join('; '));
  }, t('instructions.shared.assigned', { targets: tg.name, files: name }));

  const sync = () => run(async () => {
    const res = await api.syncExtras({ name });
    const failed = res.extras.flatMap((e) => e.targets).find((r) => r.error);
    if (failed) throw new Error(failed.error);
  }, t('instructions.detail.synced', { name }));

  const confirmRun = async () => {
    const p = pending!;
    setPending(null);
    await run(p.run, '');
  };

  return (
    <div className="ss-wrap animate-fade-in">
      <PageHeader
        crumbs={[{ label: t('extras.title'), to: '/extras' }, { label: t('extras.tab.instructions'), to: '/extras?tab=instructions' }, { label: name }]}
        title={name}
        mono
        subtitle={<span className="font-mono">{shortenHome(file.path)}{file.exists && ` · ${formatSize(file.size)}`}</span>}
        actions={
          <>
            <Button variant="ghost" onClick={() => setPending({
              title: t('instructions.detail.delete.title'),
              message: t('instructions.detail.delete.message', { name, count: using.length }),
              confirm: t('instructions.detail.delete.confirm'),
              danger: true,
              run: async () => { setDeleting(true); try { await api.deleteExtra(name); } catch (err) { setDeleting(false); throw err; } toast(t('instructions.detail.delete.done', { name }), 'success'); navigate('/extras?tab=instructions'); },
            })}>{t('instructions.detail.delete.title')}</Button>
            <Button variant="secondary" onClick={() => setEditing(true)} disabled={!content.data}>{t('instructions.detail.edit', { file: file.file })}</Button>
            <Button variant="primary" onClick={() => void sync()} loading={busy} disabled={using.length === 0}>{t('extras.sync')}</Button>
          </>
        }
      />

      <section className="flex flex-col gap-2.5">
        <div className="ss-sec">
          <h2>{t('instructions.detail.targets')}</h2>
          <span className="ss-cnt">{using.length}</span>
          <span className="ss-tag">global</span>
          <span className="flex-1" />
          {addable.length > 0 && (
            <Select className="w-[200px]" size="sm" ariaLabel={t('instructions.detail.addTarget')} value="" placeholder={t('instructions.detail.addTarget')}
              options={[{ value: '', label: t('instructions.detail.addTarget') }, ...addable.map((tg) => ({ value: tg.name, label: tg.name, icon: <AgentIcon target={tg.name} size={14} /> }))]}
              onChange={(v) => { const tg = addable.find((x) => x.name === v); if (tg) void add(tg); }} disabled={busy} />
          )}
        </div>
        <div className="ss-list">
          <div className="ss-lh">
            <span className="w-[30px]" />
            <span className="w-[110px]">{t('instructions.shared.colTarget')}</span>
            <span className="flex-1">{t('instructions.detail.colWrites')}</span>
            <span className="w-[80px]">mode</span>
            <span className="w-[100px]">{t('instructions.project.colStatus')}</span>
            <span className="w-[90px]" />
          </div>
          {using.length === 0 && <div className="ss-r text-[13px] text-ink-3">{t('instructions.detail.unused')}</div>}
          {using.map((tg) => {
            const a = tg.assigned.find((x) => x.name === name) as InstructionsAssignment;
            const base = tg.path.split('/').pop() ?? '';
            const dir = shortenHome(tg.path).slice(0, -base.length);
            const hint = tg.same_as ? t('instructions.shared.sameAs', { name: tg.same_as })
              : a.status === 'modified' ? t('instructions.detail.how.modified')
                : t(`instructions.detail.how.${a.mode === 'import' ? 'import' : 'link'}`, { path: `…/${name}/${file.file}` });
            return (
              <div key={tg.name} className="contents">
                <div className="ss-r !min-h-[58px]">
                  <span className="ss-at"><AgentIcon target={tg.name} size={17} /></span>
                  <Link to={`/targets/${encodeURIComponent(tg.name)}?tab=instructions`} className="w-[110px] shrink-0 truncate font-mono text-[13px] font-semibold hover:underline">{tg.name}</Link>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-mono text-[12.5px] text-ink-2" title={tg.path}>{dir}<b className="text-ink">{base}</b></span>
                    <span className="text-[12px] text-ink-3">{hint}</span>
                  </span>
                  <span className="w-[80px] shrink-0"><span className="ss-tag">{a.mode}</span></span>
                  <span className="w-[100px] shrink-0"><span className={`ss-st ${statusTone(a.status)}`}>{a.status}</span></span>
                  <span className="flex w-[90px] shrink-0 justify-end">
                    {!tg.same_as && (
                      <Button variant="secondary" size="sm" disabled={busy} onClick={() => setPending({
                        title: t('instructions.restore.title'),
                        message: t('instructions.restore.message', { targets: tg.name }),
                        confirm: t('instructions.detail.restore'),
                        run: async () => {
                          const res = await api.restoreSharedInstructions(name, tg.name);
                          if (!res.success) throw new Error(res.errors.join('; '));
                          toast(t('instructions.detail.restored', { name: tg.name }), 'success');
                        },
                      })}>{t('instructions.detail.restore')}</Button>
                    )}
                  </span>
                </div>
                {a.status === 'modified' && !tg.same_as && (
                  <div className="ss-r !min-h-0 !py-3">
                    <div className="ss-note warn w-full">
                      <TriangleAlert size={16} />
                      <span className="flex flex-1 flex-col gap-2">
                        <span>{t('instructions.detail.modified', { path: shortenHome(tg.path) })}</span>
                        <span className="flex items-center gap-2">
                          <Button variant="secondary" size="sm" disabled={busy} onClick={() => setPending({
                            title: t('instructions.resolve.collect.title'), message: t('instructions.resolve.collect.message', { name, target: tg.name }), confirm: t('instructions.resolve.collect.title'),
                            run: async () => { await api.resolveSharedInstructions(name, tg.name, 'collect'); toast(t('instructions.resolve.collect.done', { name, target: tg.name }), 'success'); },
                          })}>{t('instructions.resolve.collect.title')}</Button>
                          <Button variant="secondary" size="sm" disabled={busy} onClick={() => setPending({
                            title: t('instructions.resolve.reapply.title'), message: t('instructions.resolve.reapply.message', { name, target: tg.name }), confirm: t('instructions.resolve.reapply.title'),
                            run: async () => { await api.resolveSharedInstructions(name, tg.name, 'reapply'); toast(t('instructions.resolve.reapply.done', { name, target: tg.name }), 'success'); },
                          })}>{t('instructions.resolve.reapply.title')}</Button>
                        </span>
                        <span className="text-[12.5px]">{t('instructions.detail.modifiedHint', { name })}</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {using.flatMap((tg) => overLimit(tg, [file]).map((f) => (
          <p key={tg.name} className="text-[13px] text-warn">{t('instructions.shared.tooLong', { name: f.name, chars: f.chars.toLocaleString(), max: tg.max_chars?.toLocaleString() ?? '' })}</p>
        )))}
        <p className="text-[13px] text-ink-3">{t('instructions.detail.restoreHint', { name })}</p>
      </section>

      {editing && content.data && (
        <InstructionsEditorDialog
          title={`${name} · ${file.file}`}
          path={file.path}
          content={content.data.content}
          note={t('instructions.detail.editNote', { count: using.length })}
          onSave={async (next) => {
            await api.putSharedInstructionsContent(name, next);
            refreshInstructions(queryClient);
          }}
          onClose={() => setEditing(false)}
        />
      )}
      <ConfirmDialog
        open={pending !== null}
        title={pending?.title ?? ''}
        message={pending?.message ?? ''}
        confirmText={pending?.confirm}
        variant={pending?.danger ? 'danger' : 'default'}
        onCancel={() => setPending(null)}
        onConfirm={() => void confirmRun()}
      />
    </div>
  );
}
