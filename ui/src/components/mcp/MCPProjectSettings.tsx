import { useState } from 'react';
import { mcpTargets, type MCPDirectTools, type MCPSettings } from '../../api/mcp';
import SegmentedControl from '../SegmentedControl';
import { useT } from '../../i18n';
import DirectToolsField, { directToolsComplete, directToolsDraft, directToolsValue, type DirectToolsDraft } from './DirectToolsField';
import { TargetToggles } from './TargetPicker';
import { targetLabel } from './mcpView';

/** What a directTools value reads as in a sentence, such as the default a project inherits. */
export function useDirectToolsLabel() {
  const t = useT();
  return (value: MCPDirectTools | undefined) =>
    Array.isArray(value) ? value.join(', ') : value === undefined ? t('mcp.directToolsUnset') : t({ true: 'mcp.directToolsAll', false: 'mcp.directToolsOff', search: 'mcp.directToolsSearch' }[String(value) as 'true' | 'false' | 'search']);
}

interface TargetsProps {
  /** undefined follows mcp.targets. */
  value: string[] | undefined;
  defaults: string[];
  offered: readonly string[];
  onChange: (value: string[] | undefined) => void;
  disabled?: boolean;
}

/** A project's targets: the global ones, or its own pick. */
export function ProjectTargets({ value, defaults, offered, onChange, disabled }: TargetsProps) {
  const t = useT();
  const own = value !== undefined;
  const pick = (target: string, on: boolean) => onChange(mcpTargets.filter((x) => (x === target ? on : value?.includes(x))));
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        className="self-start"
        value={own ? 'own' : 'inherit'}
        onChange={(v) => onChange(v === 'own' ? defaults : undefined)}
        options={[{ value: 'inherit', label: t('mcp.projects.inherit') }, { value: 'own', label: t('mcp.projects.ownTargets') }]}
      />
      {own && <div className="flex flex-wrap gap-x-5 gap-y-3"><TargetToggles offered={offered} selected={value} onToggle={pick} disabled={disabled} /></div>}
      <span className="hp text-xs text-ink-2">{defaults.length > 0 ? t('mcp.projects.targetsHint', { targets: defaults.map(targetLabel).join(', ') }) : t('mcp.projects.noGlobalTargets')}</span>
    </div>
  );
}

/**
 * directTools that saves as it changes. Tool names are saved when the field is left,
 * so a half-typed list is never written.
 */
export function DirectToolsSetting({ value, onSave, unsetLabel, disabled }: { value: MCPDirectTools | undefined; onSave: (value: MCPSettings['directTools']) => void; unsetLabel?: string; disabled?: boolean }) {
  const [draft, setDraft] = useState<DirectToolsDraft>(() => directToolsDraft(value));
  const change = (next: DirectToolsDraft) => {
    setDraft(next);
    if (next.mode !== draft.mode && next.mode !== 'list') onSave(directToolsValue(next));
  };
  return <DirectToolsField bare value={draft} onChange={change} unsetLabel={unsetLabel} disabled={disabled} onNamesBlur={() => { if (directToolsComplete(draft)) onSave(directToolsValue(draft)); }} />;
}
