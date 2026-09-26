import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Ellipsis, FilePlus, Link2, Plus, RotateCcw, Search, Upload, X } from 'lucide-react';
import { api } from '../../api/client';
import type { SharedInstructionsTarget } from '../../api/client';
import AgentIcon from '../AgentIcon';
import Button from '../Button';
import { Checkbox } from '../Checkbox';
import ConfirmDialog from '../ConfirmDialog';
import EmptyState from '../EmptyState';
import { Select } from '../Select';
import { PageSkeleton } from '../Skeleton';
import { SkillContextMenu, type ContextMenuItem } from '../TargetMenu';
import { useToast } from '../Toast';
import { useT } from '../../i18n';
import { queryKeys } from '../../lib/queryKeys';
import { shortenHome } from '../../lib/paths';
import InstructionsEditorDialog from './InstructionsEditorDialog';
import NewSharedDialog from './NewSharedDialog';
import { overLimit, refreshInstructions, statusTone, worstStatus } from './instructionsView';

const OWN = '';
type Menu = { x: number; y: number; items: ContextMenuItem[] };
type Pending = { title: string; message: string; confirm?: string; run: () => Promise<void> };
type Editing = { name: string; file: string; path: string; content: string; count: number };

/** ④ Extras › Instructions (global): shared files on the left as a filter, targets on the right. */
export default function SharedInstructions({ creating, setCreating }: { creating: boolean; setCreating: (open: boolean) => void }) {
  const t = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, error, isPending } = useQuery({ queryKey: queryKeys.instructions.shared, queryFn: () => api.listSharedInstructions() });
  const [filter, setFilter] = useState<string | null>(null); // null = all, OWN = own file, else a file name
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<Menu | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);

  const files = useMemo(() => data?.files ?? [], [data]);
  const targets = useMemo(() => data?.targets ?? [], [data]);
  const uses = (tg: SharedInstructionsTarget) => tg.assigned.map((a) => a.name);
  const countOf = (f: string) => targets.filter((tg) => (f === OWN ? tg.assigned.length === 0 : uses(tg).includes(f))).length;
  const visible = targets.filter((tg) =>
    (filter === null || (filter === OWN ? tg.assigned.length === 0 : uses(tg).includes(filter))) &&
    (!search.trim() || tg.name.toLowerCase().includes(search.trim().toLowerCase())));
  const selectable = visible.filter((tg) => !tg.same_as);
  const chosen = targets.filter((tg) => selected.has(tg.name) && !tg.same_as);
  const allOn = selectable.length > 0 && selectable.every((tg) => selected.has(tg.name));

  const assign = async (names: string[], extras: string[]) => {
    setBusy(true);
    try {
      const res = await api.assignSharedInstructions(names, extras);
      if (res.success) toast(t(extras.length ? 'instructions.shared.assigned' : 'instructions.shared.restored', { targets: names.join(', '), files: extras.join(', ') }), 'success');
      else res.errors.forEach((e) => toast(e, 'error'));
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      refreshInstructions(queryClient);
      setBusy(false);
    }
  };

  // Going back to the own file puts the pre-attach backup in place, so ask first.
  const restore = (names: string[]) => setPending({
    title: t('instructions.restore.title'),
    message: t('instructions.restore.message', { targets: names.join(', ') }),
    confirm: t('instructions.detail.restore'),
    run: () => assign(names, []),
  });

  const resolve = (name: string, target: string, action: 'collect' | 'reapply') => setPending({
    title: t(`instructions.resolve.${action}.title`),
    message: t(`instructions.resolve.${action}.message`, { name, target }),
    run: async () => {
      await api.resolveSharedInstructions(name, target, action);
      toast(t(`instructions.resolve.${action}.done`, { name, target }), 'success');
    },
  });

  const rowMenu = (tg: SharedInstructionsTarget): ContextMenuItem[] => [
    ...tg.assigned.filter((a) => a.status === 'modified').flatMap((a) => [
      { key: `collect-${a.name}`, label: t('instructions.resolve.collect.item', { name: a.name }), icon: <Upload size={14} />, onSelect: () => resolve(a.name, tg.name, 'collect') },
      { key: `reapply-${a.name}`, label: t('instructions.resolve.reapply.item', { name: a.name }), icon: <Link2 size={14} />, onSelect: () => resolve(a.name, tg.name, 'reapply') },
    ]),
    { key: 'restore', label: t('instructions.shared.restoreOwn'), icon: <RotateCcw size={14} />, onSelect: () => restore([tg.name]) },
  ];

  const openEditor = async (f: { name: string; file: string; path: string }) => {
    try {
      const res = await api.getSharedInstructionsContent(f.name);
      setEditing({ ...f, content: res.content, count: countOf(f.name) });
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, items: ContextMenuItem[]) => {
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({ x: r.left, y: r.bottom + 4, items });
  };

  if (isPending) return <PageSkeleton />;
  if (error) return <div className="ss-note bad"><span className="flex-1">{error.message}</span></div>;

  const ownLabel = t('instructions.shared.own');
  const options = files.map((f) => ({ value: f.name, label: f.name }));
  const current = files.find((f) => f.name === filter);
  // Same rule as the file's own page: import targets can take one more file,
  // link targets only when they are not on another shared file yet.
  const addable = current ? targets.filter((tg) => !tg.same_as && !uses(tg).includes(current.name) && (tg.import || tg.assigned.length === 0)) : [];
  const filterRow = (key: string | null, label: string, count: number, mono: boolean) => (
    <div key={key ?? '__all'} className={`ss-r link !min-h-10 !gap-2 ${filter === key ? 'sel' : ''}`}>
      <button type="button" className={`min-w-0 flex-1 truncate text-left text-[13px] ${mono ? 'font-mono' : ''}`} onClick={() => setFilter(key)} aria-pressed={filter === key}>
        {label}
      </button>
      <span className="ss-cnt">{count}</span>
      {mono && key && (
        <Link to={`/extras/instructions/${encodeURIComponent(key)}`} className="ss-ib !h-6 !w-6" aria-label={t('instructions.shared.open', { name: key })}>
          <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );

  return (
    <>
      {files.length === 0 ? (
        <EmptyState
          icon={FilePlus}
          title={t('instructions.shared.empty.title')}
          description={t('instructions.shared.empty.description')}
          action={<Button variant="primary" onClick={() => setCreating(true)}><Plus size={15} />{t('instructions.shared.new')}</Button>}
        />
      ) : (
        <div className="grid grid-cols-[240px_minmax(0,1fr)] items-start gap-6">
          <aside className="flex flex-col gap-2.5">
            <div className="ss-sec">
              <h2>{t('instructions.shared.files')}</h2>
              <span className="ss-cnt">{files.length}</span>
            </div>
            <div className="ss-list">
              {filterRow(null, t('instructions.shared.allTargets'), targets.length, false)}
              {files.map((f) => filterRow(f.name, f.name, countOf(f.name), true))}
              {filterRow(OWN, ownLabel, countOf(OWN), false)}
            </div>
            <p className="text-[12.5px] text-ink-3">{t('instructions.shared.filterHint')}</p>
          </aside>

          <section className="flex min-w-0 flex-col gap-2.5">
            <div className="flex items-center gap-3">
              <span className="ss-inp w-[240px]">
                <Search size={14} className="shrink-0 text-ink-3" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('instructions.shared.search')} aria-label={t('instructions.shared.search')} />
              </span>
              <span className="text-[13px] text-ink-3">{t(visible.length === 1 ? 'instructions.shared.count.one' : 'instructions.shared.count.other', { count: visible.length })}</span>
              <span className="flex-1" />
              <span className="ss-tag">global</span>
            </div>
            {current && (
              <div className="ss-box flex items-center gap-3 px-4 py-3">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-mono text-[14px] font-semibold">{current.name}</span>
                  <span className="truncate font-mono text-[12px] text-ink-3" title={current.path}>{shortenHome(current.path)}</span>
                </span>
                {addable.length > 0 && (
                  <Select className="w-[180px] shrink-0" size="sm" ariaLabel={t('instructions.detail.addTarget')} value="" placeholder={t('instructions.detail.addTarget')}
                    options={[{ value: '', label: t('instructions.detail.addTarget') }, ...addable.map((tg) => ({ value: tg.name, label: tg.name, icon: <AgentIcon target={tg.name} size={14} /> }))]}
                    onChange={(v) => { const tg = addable.find((x) => x.name === v); if (tg) void assign([tg.name], [...uses(tg), current.name]); }} disabled={busy} />
                )}
                <Button variant="secondary" size="sm" onClick={() => void openEditor(current)}>{t('instructions.detail.edit', { file: current.file })}</Button>
                <Link to={`/extras/instructions/${encodeURIComponent(current.name)}`} className="ss-btn ghost sm">{t('instructions.shared.open', { name: current.name })}</Link>
              </div>
            )}
            <div className="ss-list">
              <div className="ss-lh">
                <Checkbox label={t('instructions.shared.selectAll')} hideLabel checked={allOn} indeterminate={!allOn && selectable.some((tg) => selected.has(tg.name))}
                  onChange={() => setSelected(allOn ? new Set() : new Set(selectable.map((tg) => tg.name)))} disabled={selectable.length === 0} />
                <span className="w-[30px]" />
                <span className="w-[110px]">{t('instructions.shared.colTarget')}</span>
                <span className="flex-1">{t('instructions.shared.colFile')}</span>
                <span className="w-[210px]">{t('instructions.shared.colUses')}</span>
                <span className="w-[90px]" />
                <span className="w-[30px]" />
              </div>
              {visible.length === 0 && <div className="ss-r text-[13px] text-ink-3">{t(current && !search.trim() ? 'instructions.detail.unused' : 'instructions.shared.noTargets')}</div>}
              {visible.map((tg) => {
                const status = worstStatus(tg.assigned);
                const long = overLimit(tg, files);
                const values = uses(tg);
                return (
                  <div key={tg.name} className={`ss-r !min-h-[56px] ${selected.has(tg.name) ? 'sel' : ''}`}>
                    <Checkbox label={t('instructions.shared.select', { name: tg.name })} hideLabel checked={selected.has(tg.name)} disabled={Boolean(tg.same_as)}
                      onChange={(on) => { const next = new Set(selected); if (on) next.add(tg.name); else next.delete(tg.name); setSelected(next); }} />
                    <span className="ss-at"><AgentIcon target={tg.name} size={17} /></span>
                    <Link to={`/targets/${encodeURIComponent(tg.name)}?tab=instructions`} className="w-[110px] shrink-0 truncate font-mono text-[13px] font-semibold hover:underline">{tg.name}</Link>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-mono text-[12.5px] text-ink-2" title={tg.path}>{shortenHome(tg.path)}</span>
                      {tg.same_as && <span className="text-[12px] text-ink-3">{t('instructions.shared.sameAs', { name: tg.same_as })}</span>}
                      {long.map((f) => <span key={f.name} className="text-[12px] text-warn">{t('instructions.shared.tooLong', { name: f.name, chars: f.chars.toLocaleString(), max: tg.max_chars?.toLocaleString() ?? '' })}</span>)}
                    </span>
                    {tg.import ? (
                      <Select className="w-[210px] shrink-0" size="sm" ariaLabel={t('instructions.shared.uses', { name: tg.name })} values={values} placeholder={ownLabel}
                        onChangeValues={(next) => (next.length ? void assign([tg.name], next) : restore([tg.name]))} options={options} disabled={busy || Boolean(tg.same_as)} />
                    ) : (
                      <Select className="w-[210px] shrink-0" size="sm" ariaLabel={t('instructions.shared.uses', { name: tg.name })} value={values[0] ?? OWN}
                        onChange={(v) => (v === OWN ? restore([tg.name]) : void assign([tg.name], [v]))} options={[{ value: OWN, label: ownLabel }, ...options]} disabled={busy || Boolean(tg.same_as)} />
                    )}
                    <span className="w-[90px] shrink-0">{status && <span className={`ss-st ${statusTone(status)}`}>{status}</span>}</span>
                    {tg.assigned.length > 0 && !tg.same_as ? (
                      <button type="button" className="ss-ib shrink-0" aria-label={t('instructions.shared.actions', { name: tg.name })} onClick={(e) => openMenu(e, rowMenu(tg))}>
                        <Ellipsis size={16} />
                      </button>
                    ) : <span className="w-[30px] shrink-0" />}
                  </div>
                );
              })}
              <div className="ss-r !min-h-0 !py-2.5 text-[12.5px] text-ink-3">{t('instructions.shared.cursorNote')}</div>
            </div>
            <p className="text-[12.5px] text-ink-3">{t('instructions.shared.multiHint')}</p>
          </section>
        </div>
      )}

      {chosen.length > 0 && (
        <div className="ss-bulk" role="toolbar" aria-label={t('instructions.shared.selected', { count: chosen.length })}>
          <b>{t('instructions.shared.selected', { count: chosen.length })}</b>
          <span className="dv" />
          <Button variant="secondary" size="sm" disabled={busy} onClick={(e) => openMenu(e, [
            ...files.map((f) => ({ key: f.name, label: f.name, onSelect: () => { void assign(chosen.map((tg) => tg.name), [f.name]); setSelected(new Set()); } })),
            { key: '__own', label: ownLabel, onSelect: () => { restore(chosen.map((tg) => tg.name)); setSelected(new Set()); } },
          ])}>
            {t('instructions.shared.changeTo')}
          </Button>
          <span className="dv" />
          <button type="button" className="ss-ib" aria-label={t('instructions.shared.clear')} onClick={() => setSelected(new Set())}><X size={16} /></button>
        </div>
      )}

      {creating && (
        <NewSharedDialog
          targets={targets}
          onClose={() => setCreating(false)}
          onCreated={(name) => { setCreating(false); setFilter(name); refreshInstructions(queryClient); }}
        />
      )}
      {editing && (
        <InstructionsEditorDialog
          title={`${editing.name} · ${editing.file}`}
          path={editing.path}
          content={editing.content}
          note={t('instructions.detail.editNote', { count: editing.count })}
          onSave={async (next) => {
            await api.putSharedInstructionsContent(editing.name, next);
            refreshInstructions(queryClient);
          }}
          onClose={() => setEditing(null)}
        />
      )}
      <SkillContextMenu open={!!menu} anchorPoint={menu ?? undefined} items={menu?.items ?? []} onClose={() => setMenu(null)} />
      <ConfirmDialog
        open={pending !== null}
        title={pending?.title ?? ''}
        message={pending?.message ?? ''}
        confirmText={pending?.confirm}
        loading={busy}
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          const p = pending!;
          setBusy(true);
          try {
            await p.run();
          } catch (err) {
            toast((err as Error).message, 'error');
          } finally {
            setBusy(false);
            setPending(null);
            refreshInstructions(queryClient);
          }
        }}
      />
    </>
  );
}
