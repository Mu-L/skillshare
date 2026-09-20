import { useState } from 'react';
import { Folder, X } from 'lucide-react';
import { mcpApi, type MCPDirectTools } from '../../api/mcp';
import Button from '../Button';
import DialogShell from '../DialogShell';
import { useT } from '../../i18n';
import { shortenHome } from '../../lib/paths';
import DirectToolsField, { directToolsComplete, directToolsDraft, directToolsValue } from './DirectToolsField';
import { ProjectTargets, useDirectToolsLabel } from './MCPProjectSettings';

interface Props {
  existing: string[];
  defaults: string[];
  defaultDirectTools: MCPDirectTools | undefined;
  offered: readonly string[];
  configPath: string;
  onClose: () => void;
  onSaved: () => void;
}

/** Add one root to mcp.projects. Its servers are added from the project's own page. */
export default function MCPProjectDialog({ existing, defaults, defaultDirectTools, offered, configPath, onClose, onSaved }: Props) {
  const t = useT();
  const directLabel = useDirectToolsLabel();
  const [path, setPath] = useState('');
  const [targets, setTargets] = useState<string[] | undefined>(undefined);
  const [directTools, setDirectTools] = useState(() => directToolsDraft(undefined));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Trailing separators aside, this is the key config.yaml will hold.
  const root = path.trim().replace(/(?<=.)[\\/]+$/, '');
  const absolute = /^(~($|[\\/])|\/|[A-Za-z]:[\\/])/.test(root);
  const taken = existing.some((x) => x === root || shortenHome(x) === root);
  const pathError = root && !absolute ? t('mcp.projects.folderHint') : taken ? t('mcp.projects.taken') : '';
  const pi = (targets ?? defaults).includes('pi');
  const canSave = Boolean(root) && !pathError && (targets === undefined || targets.length > 0) && (!pi || directToolsComplete(directTools)) && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      await mcpApi.save({ project: root, settings: { targets, directTools: pi ? directToolsValue(directTools) : undefined } });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <DialogShell open onClose={onClose} padding="none" preventClose={saving} ariaLabel={t('mcp.projects.add')} className="!max-w-[720px]">
      <div className="dh">
        <h2 className="ss-h2">{t('mcp.projects.add')}</h2>
        <button type="button" className="ss-ib" aria-label={t('common.close')} onClick={onClose} disabled={saving}><X size={16} /></button>
      </div>
      <form id="mcp-project" className="db" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <div className="ss-fld">
          <label htmlFor="mcp-project-path">{t('mcp.projects.folder')}</label>
          <span className={`ss-inp font-mono ${pathError ? 'err' : ''}`}>
            <Folder size={15} className="shrink-0 text-ink-3" />
            <input id="mcp-project-path" autoFocus value={path} onChange={(e) => setPath(e.target.value)} placeholder="~/work/my-project" disabled={saving} />
          </span>
          <span className={`hp ${pathError ? '!text-bad' : ''}`}>{pathError || t('mcp.projects.folderHint')}</span>
        </div>
        <div className="ss-fld">
          <span className="text-[13px] font-semibold">{t('mcp.targets')}</span>
          <ProjectTargets value={targets} defaults={defaults} offered={offered} onChange={setTargets} disabled={saving} />
        </div>
        {pi && <DirectToolsField value={directTools} onChange={setDirectTools} disabled={saving} unsetLabel={t('mcp.directToolsInherit', { value: directLabel(defaultDirectTools) })} hint={t('mcp.projects.directToolsHint')} />}
        {error && <div className="ss-note bad"><span className="flex-1">{error}</span></div>}
      </form>
      <div className="df">
        <span className="flex-1 text-[13px] text-ink-2">{t('mcp.projects.savedTo', { path: shortenHome(configPath) })}</span>
        <Button variant="ghost" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
        <Button type="submit" form="mcp-project" variant="primary" loading={saving} disabled={!canSave}>{t('common.save')}</Button>
      </div>
    </DialogShell>
  );
}
