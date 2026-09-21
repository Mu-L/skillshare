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
  // An empty own list is stored as "no key", which reads back as inherit. Without
  // local state the toggle would spring back whenever there is nothing to save yet:
  // both on the way in, and when a project that already had its own list is emptied.
  const [picking, setPicking] = useState(false);
  const own = value !== undefined || picking;
  const pick = (target: string, on: boolean) => {
    setPicking(true);
    onChange(mcpTargets.filter((x) => (x === target ? on : value?.includes(x))));
  };
  const mode = (v: 'inherit' | 'own') => {
    setPicking(v === 'own');
    // Seeding from the global list saves at once; with nothing to seed, the empty
    // toggles are shown and the first tick is what saves.
    if (v === 'inherit') onChange(undefined);
    else if (defaults.length > 0) onChange(defaults);
  };
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        className="self-start"
        value={own ? 'own' : 'inherit'}
        onChange={mode}
        options={[{ value: 'inherit', label: t('mcp.projects.inherit') }, { value: 'own', label: t('mcp.projects.ownTargets') }]}
      />
      {own && <div className="flex flex-wrap gap-x-5 gap-y-3"><TargetToggles offered={offered} selected={value ?? []} onToggle={pick} disabled={disabled} /></div>}
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
