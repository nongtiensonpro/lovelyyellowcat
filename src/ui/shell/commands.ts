// commands.ts — command registry (ADR-0002 §3.5). Pure, test được.

export interface Command {
  id: string;
  label: string;
  keywords?: string[];
  icon?: string;
  /** Phân quyền: public | auth | admin */
  scope?: "public" | "auth" | "admin";
  action: () => void;
}

const REGISTRY: Command[] = [];
const listeners = new Set<(cmds: Command[]) => void>();

function rebuildCache(): void {
  commandsCache = [...REGISTRY];
}
function emit() { rebuildCache(); for (const l of listeners) l(commandsCache); }

export function registerCommand(cmd: Command): () => void {
  REGISTRY.push(cmd);
  emit();
  return () => {
    const i = REGISTRY.findIndex((c) => c.id === cmd.id);
    if (i >= 0) { REGISTRY.splice(i, 1); emit(); }
  };
}

// Snapshot cache — cùng lý do Object.is với useSyncExternalStore (React #185)
let commandsCache: Command[] = [];

export function getCommands(): Command[] { return commandsCache; }

export function subscribeCommands(l: (cmds: Command[]) => void): () => void {
  listeners.add(l);
  l([...REGISTRY]);
  return () => { listeners.delete(l); };
}

/** Lọc theo query + role (scope). Admin thấy tất cả; auth thấy public+auth; guest chỉ public. */
export function filterCommands(cmds: Command[], query: string, role: "public" | "auth" | "admin"): Command[] {
  const q = query.trim().toLowerCase();
  const byRole = cmds.filter((c) => {
    if (!c.scope) return true;
    if (c.scope === "public") return true;
    if (c.scope === "auth") return role !== "public";
    return role === "admin";
  });
  if (!q) return byRole;
  return byRole.filter(
    (c) =>
      c.label.toLowerCase().includes(q) ||
      (c.keywords || []).some((k) => k.toLowerCase().includes(q))
  );
}
