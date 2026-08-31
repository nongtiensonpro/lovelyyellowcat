// keyboardManager.ts — đăng ký global shortcuts + chặn trước editor/input active.
import { dispatchWindow } from "../wm95/windowRuntime";
import { getWindows } from "../wm95/windowRuntime";

type ShortcutHandler = (e: KeyboardEvent) => void;
type ShortcutDef = {
  key: string;
  ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean; prevent?: boolean;
  action: ShortcutHandler;
  /** Không kích hoạt khi đang typing trong editor/input. */
  skipInInput?: boolean;
};

const HANDLERS = new Map<string, ShortcutDef>();

export function registerShortcut(id: string, def: ShortcutDef): () => void {
  HANDLERS.set(id, def);
  return () => HANDLERS.delete(id);
}

function matches(e: KeyboardEvent, def: ShortcutDef): boolean {
  if (e.key.toLowerCase() !== def.key.toLowerCase()) return false;
  if (def.ctrl && !e.ctrlKey) return false;
  if (def.alt && !e.altKey) return false;
  if (def.shift && !e.shiftKey) return false;
  if (def.meta && !e.metaKey) return false;
  return true;
}

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  return t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable || !!(t.closest?.("[contenteditable]")) || !!(t.closest?.("[role='textbox']"));
}

export function initKeyboardManager(): () => void {
  const onKey = (e: KeyboardEvent) => {
    for (const [, def] of HANDLERS) {
      if (matches(e, def) && !(def.skipInInput && isTyping(e))) {
        if (def.prevent) e.preventDefault?.();
        def.action(e);
        return;
      }
    }
  };
  document.addEventListener("keydown", onKey);
  return () => document.removeEventListener("keydown", onKey);
}

// Alt+Tab cycle qua WM windows
export function registerTabCycle(): () => void {
  return registerShortcut("alt-tab-cycle", {
    key: "Tab", alt: true,
    skipInInput: false,
    action() {
      const wins = getWindows().filter((w) => w.state !== "closed");
      if (wins.length < 2) return;
      const top = wins.sort((a, b) => b.z - a.z)[0];
      const idx = wins.findIndex((w) => w.id === top.id);
      const next = wins[(idx + 1) % wins.length];
      dispatchWindow({ type: "focus", id: next.id });
    },
  });
}
