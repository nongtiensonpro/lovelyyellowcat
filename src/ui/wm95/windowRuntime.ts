// windowRuntime.ts — bridge SSR-safe giữa windowStore (pure) và React islands.
// Phase 3 runtime: subscribe thật, broadcast, persist qua localStorage.

import { windowStoreReducer, topmostWindow, visibleWindows, taskbarWindows, DEFAULT_RECT, nextZ, type WindowEntry, type WindowAction, type ReduceOpts, type WindowRect } from "./windowStore";

type Listener = (state: WindowEntry[]) => void;

const STORAGE_KEY = "lyc_wm_v1";
const PERSIST_KEYS = new Set<string>(); // các id được phép persist — đăng ký khi khai báo window

let state: WindowEntry[] = [];
let viewport: ReduceOpts["viewport"] = { width: 1024, height: 768 };
let hydrated = false;
const listeners = new Set<Listener>();

function safeRead(): WindowEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Array<{ persistKey?: string; rect?: WindowRect; state?: string }>;
    return arr
      .filter((w): w is WindowEntry & { persistKey: string } => typeof w?.persistKey === "string")
      .map((w) => ({
        id: w.id,
        title: w.title,
        icon: w.icon,
        variant: w.variant,
        state: w.state === "minimized" || w.state === "maximized" || w.state === "active" ? w.state : "active",
        rect: { ...DEFAULT_RECT, ...w.rect },
        z: nextZ(),
        persistKey: w.persistKey,
      }));
  } catch {
    return [];
  }
}

function persistNow(): void {
  if (typeof window === "undefined") return;
  try {
    const persisted = state.filter((w) => w.persistKey);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // ignore
  }
}

function emit(): void {
  for (const l of listeners) l(state);
}

export function hydrateWindowRuntime(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  state = safeRead();
  viewport = { width: window.innerWidth, height: window.innerHeight };
  window.addEventListener("resize", () => {
    viewport = { width: window.innerWidth, height: window.innerHeight };
  });
}

export function dispatchWindow(action: WindowAction): void {
  if (!hydrated) hydrateWindowRuntime();
  state = windowStoreReducer(state, action, { viewport });
  persistNow();
  emit();
}

export function subscribeWindows(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => { listeners.delete(listener); };
}

export function getWindows(): WindowEntry[] {
  if (!hydrated) hydrateWindowRuntime();
  return state;
}

export const getTopmost = topmostWindow;
export const getVisible = visibleWindows;
export const getTaskbar = taskbarWindows;

/** Helpers gọn cho call site (mở cửa sổ dạng "key-window", cùng id = focus). */
export function openWindow(entry: { id: string; title: string; icon?: string; variant?: "classic" | "neon" | "sunken"; rect?: WindowRect; modal?: boolean; persistKey?: string }): void {
  if (state.find((w) => w.id === entry.id)) {
    dispatchWindow({ type: "focus", id: entry.id });
    return;
  }
  dispatchWindow({
    type: "open",
    entry: {
      id: entry.id,
      title: entry.title,
      icon: entry.icon,
      variant: entry.variant,
      rect: entry.rect,
      modalParentId: entry.modal ? entry.id : undefined,
      persistKey: entry.persistKey,
    },
  });
}

// ── React hook (dùng chung cho islands) ──
export { useWindows } from "../hooks/useWindowRuntime";
