import { apiFetch } from './client';

export const mcpTargets = ['claude', 'codex', 'cursor', 'vscode', 'opencode', 'kilocode', 'grok', 'antigravity', 'amp', 'claude-desktop', 'cline', 'copilot', 'factory', 'gemini', 'goose', 'junie', 'kiro', 'lmstudio', 'warp', 'windsurf', 'pi'] as const;
export type MCPValue = string | { fromEnv: string };
export type MCPDirectTools = boolean | 'search' | string[];
/** A scope's defaults. A save replaces both, so a value left out is cleared. */
export interface MCPSettings { targets?: string[]; directTools?: MCPDirectTools }
/** One root under the global config's mcp.projects. */
export interface MCPProject extends MCPSettings { servers?: Record<string, MCPServer> }
export interface MCPServer {
  piExtension?: string;
  command?: string;
  args?: string[];
  url?: string;
  transport?: 'stdio' | 'streamable-http';
  targets?: string[];
  env?: Record<string, MCPValue>;
  headers?: Record<string, MCPValue>;
  bearerToken?: { fromEnv: string };
  /** pi-mcp-adapter only. Left out, Skillshare does not touch the value in Pi's file. */
  directTools?: MCPDirectTools;
  /** Project mode: the whole entry, turning off a server the Agent's global config defines. */
  disabled?: boolean;
}
/** Agents with a per-project switch: a field merged over the global entry, or Claude Code's own off list. */
export const mcpOffTargets: readonly string[] = ['claude', 'opencode', 'kilocode', 'pi'];
export interface MCPMutation {
  /** A root under mcp.projects; with `remove` and no `name`, the project itself. */
  project?: string;
  settings?: MCPSettings;
  name?: string;
  server?: MCPServer;
  remove?: boolean;
  replace?: boolean;
  resolutions?: { target: string; name: string; action: 'replace' | 'adopt' }[];
}
export interface MCPPlan {
  revision: string;
  sourcePath: string;
  blocked: boolean;
  changes: { target: string; path: string; name: string; root?: string; action: string; message?: string }[];
}
export interface MCPResult { plan?: MCPPlan; applied: string[]; backupIds: string[] }
export interface MCPCandidate { name: string; server: MCPServer; problems: string[]; warnings: string[]; from?: string }
const post = <T,>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const mcpApi = {
  list: () => apiFetch<{
    source: { path: string; configPath: string; targets: string[] | null; servers: Record<string, MCPServer>; directTools?: MCPDirectTools; projects?: Record<string, MCPProject> };
    /** Project roots that also have their own .skillshare/config.yaml. */
    projectConfigs: string[];
    paths: Record<string, string>; detected: string[]; plan: MCPPlan | null; previewError: string;
    backups: { id: string; target: string; path: string }[];
  }>('/mcp'),
  preview: (mutation: MCPMutation = {}) => post<MCPPlan>('/mcp/preview', { mutation }),
  configure: (mutation: MCPMutation, revision: string, sync: boolean) => post<MCPResult>('/mcp', { mutation, revision, sync }),
  /** Save to the source only. The server refuses a write it has not previewed; the revision also catches concurrent edits. */
  save: async (mutation: MCPMutation) =>
    post<MCPResult>('/mcp', { mutation, revision: (await post<MCPPlan>('/mcp/preview', { mutation })).revision, sync: false }),
  /** One server as each of its targets' config files would hold it. Reads and writes nothing, so an unsaved form can ask. */
  render: (mutation: MCPMutation) => post<{ rendered: { target: string; path: string; content?: string; error?: string }[] }>('/mcp/render', { mutation }),
  import: (body: { from?: string; content?: string; name?: string }) => post<{ candidates: MCPCandidate[] }>('/mcp/import', body),
  previewRestore: (backupId: string) => post<MCPPlan>('/mcp/restore', { backupId, preview: true }),
  restore: (backupId: string, revision: string) => post<MCPResult>('/mcp/restore', { backupId, revision }),
};
