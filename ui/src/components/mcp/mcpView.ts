import type { MCPPlan, MCPServer } from '../../api/mcp';

export type MCPChange = MCPPlan['changes'][number];

export interface MatrixRow {
  name: string;
  /** Undefined when the entry was removed from the source but is still in Agent files. */
  server?: MCPServer;
  cells: Record<string, MCPChange>;
}

export const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  add: 'info', update: 'info', restore: 'info', unchanged: 'success', conflict: 'warning', remove: 'danger',
};

/** One row per source server, plus rows for entries the plan will remove from Agents. */
export function buildMatrix(servers: Record<string, MCPServer>, plan: MCPPlan | null): MatrixRow[] {
  const rows = new Map<string, MatrixRow>(Object.entries(servers).map(([name, server]) => [name, { name, server, cells: {} }]));
  for (const change of plan?.changes ?? []) {
    const row = rows.get(change.name) ?? { name: change.name, cells: {} };
    row.cells[change.target] = change;
    rows.set(change.name, row);
  }
  return [...rows.values()];
}

/** The mcp.projects root a change belongs to, if any. */
// The plan says so outright, because Claude Code's off list is written to the global file
// rather than to anything under the folder it turns a server off for.
export const projectOf = (roots: string[], change: MCPChange) =>
  change.root ?? roots.find((root) => change.path.startsWith(root + '/') || change.path.startsWith(root + '\\'));

export function countActions(changes: MCPChange[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const change of changes) counts[change.action] = (counts[change.action] ?? 0) + 1;
  return counts;
}

export function groupByFile(changes: MCPChange[]) {
  const files = new Map<string, { target: string; path: string; changes: MCPChange[] }>();
  for (const change of changes) {
    const file = files.get(change.path) ?? { target: change.target, path: change.path, changes: [] };
    file.changes.push(change);
    files.set(change.path, file);
  }
  return [...files.values()];
}

// ponytail: keyed on the backend Change.Message text; add a reason code to mcp.Change if these start drifting.
const shadowMessage = 'a local scope server of the same name in ~/.claude.json overrides this one in this project; remove it with:';

// Keyed by how the message starts: some end in a path or a command.
const conflictKeys: Record<string, string> = {
  [shadowMessage]: 'mcp.claudeLocalShadow',
  'managed by another Skillshare config': 'mcp.conflictOtherConfig',
  'left over from a Skillshare config that was removed; import it or explicitly replace this entry': 'mcp.conflictOrphaned',
  'Agent configuration changed; import it or explicitly replace this entry': 'mcp.conflictChanged',
  'existing entry is not managed; import it to explicitly adopt it': 'mcp.conflictUnmanaged',
  'entry changed after the backup; restore would overwrite newer changes': 'mcp.conflictAfterBackup',
};

const conflictPrefix = (message: string) => Object.keys(conflictKeys).find((k) => message.startsWith(k)) ?? '';

export const describeMessage = (t: (key: string) => string, message = '') => {
  const start = conflictPrefix(message);
  return start ? t(conflictKeys[start]) + message.slice(start.length) : message;
};

const kiloProjectEnvPrefix = 'Kilo Code MCP ';
const kiloProjectEnvSuffix = ': Kilo does not allow environment references in project config and ignores the whole file when it finds one; remove fromEnv here or define this server in global mode';

/** Localizes the actionable Kilo project error while preserving a leading project path. */
export const describeError = (t: (key: string, params?: Record<string, string>) => string, message = '') => {
  const start = message.indexOf(kiloProjectEnvPrefix);
  if (start < 0) return message;
  const nameStart = start + kiloProjectEnvPrefix.length;
  const end = message.indexOf(kiloProjectEnvSuffix, nameStart);
  if (end < 0) return message;
  return message.slice(0, start) + t('mcp.kilocodeProjectEnv', { name: message.slice(nameStart, end) });
};

/** A synced Claude entry that a local-scope server of the same name hides in this project. */
export const isShadowed = (change: MCPChange) => change.action !== 'conflict' && Boolean(change.message?.startsWith(shadowMessage));

/**
 * Conflicts the user can settle by importing the Agent entry or replacing it with the
 * source. A live owning config is not one of them: it has to release the entry itself,
 * so a button here would do nothing. One that was removed never can, hence conflictOrphaned.
 */
export const isResolvable = (change: MCPChange) =>
  change.action === 'conflict' &&
  ['mcp.conflictChanged', 'mcp.conflictUnmanaged', 'mcp.conflictOrphaned'].includes(conflictKeys[conflictPrefix(change.message ?? '')]);

/** Display names for the MCP clients, as in their own docs. */
export const targetLabel = (target: string) =>
  ({ pi: 'Pi', claude: 'Claude', codex: 'Codex', cursor: 'Cursor', vscode: 'VS Code', opencode: 'OpenCode', kilocode: 'Kilo Code', grok: 'Grok', antigravity: 'Antigravity', amp: 'Amp', 'claude-desktop': 'Claude Desktop', cline: 'Cline', copilot: 'Copilot CLI', factory: 'Factory', gemini: 'Gemini CLI', goose: 'Goose', junie: 'Junie', kiro: 'Kiro', lmstudio: 'LM Studio', warp: 'Warp', windsurf: 'Windsurf' })[target] ?? target;

/** Splits a command line into words, honouring single and double quotes. */
// ponytail: no backslash escapes; a word holding both quote kinds needs the YAML config.
export function splitCommand(line: string): string[] {
  const words: string[] = [];
  let word = '';
  let quote = '';
  let started = false;
  for (const ch of line) {
    if (quote) {
      if (ch === quote) quote = '';
      else word += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      started = true;
    } else if (/\s/.test(ch)) {
      if (started) words.push(word);
      word = '';
      started = false;
    } else {
      word += ch;
      started = true;
    }
  }
  if (started) words.push(word);
  return words;
}

export const joinCommand = (words: string[]) =>
  words.map(w => (w === '' || /[\s"']/.test(w) ? (w.includes("'") ? `"${w}"` : `'${w}'`) : w)).join(' ');

export const describeEndpoint = (server: MCPServer) => server.url ?? joinCommand([server.command ?? '', ...(server.args ?? [])]);

/** Backup IDs start with the Unix time in nanoseconds. */
export const backupTime = (id: string) => new Date(Number(id.split('-')[0]) / 1e6);
