import { useState } from 'react';
import { mcpTargets, type MCPDirectTools, type MCPSettings } from '../../api/mcp';
import { useT } from '../../i18n';
import { DirectToolsSetting } from './MCPProjectSettings';
import { TargetPill, TargetToggles } from './TargetPicker';

interface Props {
  targets: string[];
  directTools: MCPDirectTools | undefined;
  offered: readonly string[];
  onSave: (settings: MCPSettings) => void;
}

/** mcp.targets and mcp.directTools: what a server without its own setting falls back to. */
export default function MCPDefaults({ targets, directTools, offered, onSave }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const shown = mcpTargets.filter((x) => offered.includes(x) || targets.includes(x));
  return (
    <section className="mt-4 flex flex-col">
      <div className="ss-sec"><h2>{t('mcp.defaults')}</h2></div>
      <div className="ss-box !p-0">
        <div className="ss-setrow">
          <div className="l"><b>{t('mcp.targets')}</b><span>{t('mcp.defaults.targetsHint')}</span></div>
          <TargetPill selected={targets} text={`${targets.length}/${shown.length}`} expanded={open} label={t('mcp.defaults.chooseAgents')} onClick={() => setOpen(!open)} />
        </div>
        {open && (
          <div className="flex flex-wrap gap-x-6 gap-y-3.5 px-[18px] pb-4">
            <TargetToggles offered={shown} selected={targets} onToggle={(target, on) => onSave({ targets: mcpTargets.filter((x) => (x === target ? on : targets.includes(x))), directTools })} />
          </div>
        )}
        {/* Only pi-mcp-adapter reads it, so it is offered once Pi is a default target. */}
        {targets.includes('pi') && (
          <div className="ss-setrow !items-start [border-top:var(--sep)]">
            <div className="l"><b>{t('mcp.directTools')}</b><span>{t('mcp.defaults.directToolsHint')}</span></div>
            <div className="w-[260px] shrink-0"><DirectToolsSetting value={directTools} onSave={(value) => onSave({ targets, directTools: value })} /></div>
          </div>
        )}
      </div>
    </section>
  );
}
