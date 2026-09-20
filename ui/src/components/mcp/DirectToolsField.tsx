import { Input, Select } from '../Input';
import { useT } from '../../i18n';
import type { MCPServer } from '../../api/mcp';

/** The field's state: what the select shows, and the names typed for `list`. */
export interface DirectToolsDraft { mode: '' | 'true' | 'list' | 'search' | 'false'; names: string }

export const directToolsDraft = (value: MCPServer['directTools']): DirectToolsDraft =>
  Array.isArray(value) ? { mode: 'list', names: value.join(', ') } : { mode: value === undefined ? '' : (String(value) as DirectToolsDraft['mode']), names: '' };

const toolNames = (draft: DirectToolsDraft) => draft.names.split(',').map((name) => name.trim()).filter(Boolean);

/** undefined leaves the field out, so Skillshare does not touch what Pi's file has. */
export const directToolsValue = (draft: DirectToolsDraft): MCPServer['directTools'] =>
  draft.mode === 'list' ? toolNames(draft) : draft.mode === 'search' ? 'search' : draft.mode === '' ? undefined : draft.mode === 'true';

export const directToolsComplete = (draft: DirectToolsDraft) => draft.mode !== 'list' || toolNames(draft).length > 0;

/** pi-mcp-adapter's directTools. Shown only when that extension is selected. */
interface Props {
  value: DirectToolsDraft;
  onChange: (value: DirectToolsDraft) => void;
  disabled?: boolean;
  /** What leaving it unset means here: nothing for a server, the global default for a project. */
  unsetLabel?: string;
  hint?: string;
  /** Without a label the field sits in a settings row that already names it. */
  bare?: boolean;
  onNamesBlur?: () => void;
}

export default function DirectToolsField({ value, onChange, disabled = false, unsetLabel, hint, bare = false, onNamesBlur }: Props) {
  const t = useT();
  return <div className="ss-fld">
    <Select label={bare ? undefined : t('mcp.directTools')} ariaLabel={t('mcp.directTools')} value={value.mode} onChange={(mode) => onChange({ ...value, mode: mode as DirectToolsDraft['mode'] })} disabled={disabled} options={[
      { value: '', label: unsetLabel ?? t('mcp.directToolsUnset') },
      { value: 'true', label: t('mcp.directToolsAll') },
      { value: 'list', label: t('mcp.directToolsList') },
      { value: 'search', label: t('mcp.directToolsSearch') },
      { value: 'false', label: t('mcp.directToolsOff') },
    ]} />
    {!bare && <span className="hp">{hint ?? t('mcp.directToolsHint')}</span>}
    {value.mode === 'list' && <>
      <Input className="font-mono" aria-label={t('mcp.directToolsNames')} value={value.names} onChange={(e) => onChange({ ...value, names: e.target.value })} onBlur={onNamesBlur} placeholder="search_docs, fetch_page" disabled={disabled} />
      <span className="hp">{t('mcp.directToolsNamesHint')}</span>
    </>}
  </div>;
}
