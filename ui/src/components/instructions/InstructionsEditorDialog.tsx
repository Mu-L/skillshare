import { useState } from 'react';
import { X } from 'lucide-react';
import Button from '../Button';
import CodeEditor from '../CodeEditor';
import DialogShell from '../DialogShell';
import { useToast } from '../Toast';
import { useT } from '../../i18n';
import { shortenHome } from '../../lib/paths';
import { isImportLine } from './instructionsView';

/** Edits one instruction file in place: a shared file or the project AGENTS.md. */
export default function InstructionsEditorDialog({ title, path, content, note, onSave, onClose }: {
  title: string;
  path: string;
  content: string;
  /** Shown under the editor, e.g. who else reads the file. */
  note?: string;
  onSave: (content: string) => Promise<void>;
  onClose: () => void;
}) {
  const t = useT();
  const { toast } = useToast();
  const [draft, setDraft] = useState(content);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      toast(t('instructions.saved', { path: shortenHome(path) }), 'success');
      onClose();
    } catch (err) {
      toast((err as Error).message, 'error');
      setSaving(false);
    }
  };
  return (
    <DialogShell open onClose={onClose} padding="none" preventClose={saving} ariaLabel={title} className="!max-w-[860px]">
      <div className="dh">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="ss-h2">{title}</h2>
          <span className="truncate font-mono text-[12.5px] text-ink-3">{shortenHome(path)}</span>
        </div>
        <button type="button" className="ss-ib" aria-label={t('common.close')} onClick={onClose} disabled={saving}><X size={16} /></button>
      </div>
      <div className="db">
        <CodeEditor value={draft} onChange={setDraft} ariaLabel={title} minHeight="360px" maxHeight="60vh" markLine={isImportLine} disabled={saving} />
        {note && <p className="text-[12.5px] text-ink-3">{note}</p>}
      </div>
      <div className="df">
        <span className="flex-1" />
        <Button variant="ghost" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
        <Button variant="primary" onClick={save} loading={saving} disabled={draft === content}>{t('common.save')}</Button>
      </div>
    </DialogShell>
  );
}
