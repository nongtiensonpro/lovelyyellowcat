// windowStore.ts — Pure state machine cho Window Manager runtime (kế hoạch §3.4, ADR-0002).
// "closed → opening → active → minimized/maximized → closing". Z-order bằng counter tập trung.

export type WindowState = "closed" | "active" | "minimized" | "maximized";

export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowEntry {
  id: string;
  title: string;
  icon?: string;
  variant?: "classic" | "neon" | "sunken";
  state: WindowState;
  rect: WindowRect;
  z: number; // z-order (lớn = trên cùng)
  /** id của window cha (cho dialog modal — set thì focus kẹt trong này). */
  modalParentId?: string;
  /** persist qua trang reload (key localStorage). */
  persistKey?: string;
}

export const DEFAULT_RECT: WindowRect = { x: 80, y: 80, width: 480, height: 320 };
export const VIEWPORT_MARGIN = 16;
export const TASKBAR_HEIGHT = 36;

export type WindowAction =
  | { type: "open"; entry: Omit<WindowEntry, "state" | "z"> & Partial<Pick<WindowEntry, "rect" | "state">> }
  | { type: "close"; id: string }
  | { type: "focus"; id: string }
  | { type: "minimize"; id: string }
  | { type: "toggleMaximize"; id: string }
  | { type: "move"; id: string; to: { x: number; y: number } }
  | { type: "resize"; id: string; to: { width: number; height: number } }
  | { type: "snap"; id: string; zone: "left" | "right" | "top" | "topleft" | "topright" | "bottomleft" | "bottomright" | "center" }
  | { type: "restore"; id: string };

let _zCounter = 100;

export function nextZ(): number {
  _zCounter = (_zCounter + 1) | 0;
  return _zCounter;
}

const MIN_WIDTH = 240;
const MIN_HEIGHT = 160;
const TASKBAR_SAFE_OFFSET = TASKBAR_HEIGHT + 8;

function clampRect(rect: WindowRect, viewport: { width: number; height: number }): WindowRect {
  const minVisible = 80; // titlebar luôn nhìn thấy ít nhất 80px
  const w = Math.max(MIN_WIDTH, Math.min(viewport.width - VIEWPORT_MARGIN * 2, rect.width));
  const h = Math.max(MIN_HEIGHT, Math.min(viewport.height - VIEWPORT_MARGIN * 2, rect.height));
  const x = Math.max(VIEWPORT_MARGIN - minVisible, Math.min(viewport.width - w - VIEWPORT_MARGIN + minVisible, rect.x));
  const y = Math.max(VIEWPORT_MARGIN, Math.min(viewport.height - h - TASKBAR_SAFE_OFFSET, rect.y));
  return { x, y, width: w, height: h };
}

function snapRect(zone: NonNullable<Extract<WindowAction, { type: "snap" }>["zone"]>, viewport: { width: number; height: number }): WindowRect {
  const halfW = Math.floor((viewport.width - VIEWPORT_MARGIN * 3) / 2);
  const halfH = Math.floor((viewport.height - VIEWPORT_MARGIN * 2 - TASKBAR_SAFE_OFFSET) / 2);
  const fullW = viewport.width - VIEWPORT_MARGIN * 2;
  const fullH = viewport.height - VIEWPORT_MARGIN * 2 - TASKBAR_SAFE_OFFSET;
  switch (zone) {
    case "left":        return { x: VIEWPORT_MARGIN, y: VIEWPORT_MARGIN, width: halfW, height: fullH };
    case "right":       return { x: VIEWPORT_MARGIN * 2 + halfW, y: VIEWPORT_MARGIN, width: halfW, height: fullH };
    case "top":         return { x: VIEWPORT_MARGIN, y: VIEWPORT_MARGIN, width: fullW, height: halfH };
    case "bottomleft":  return { x: VIEWPORT_MARGIN, y: VIEWPORT_MARGIN + halfH, width: halfW, height: fullH - halfH };
    case "bottomright": return { x: VIEWPORT_MARGIN * 2 + halfW, y: VIEWPORT_MARGIN + halfH, width: halfW, height: fullH - halfH };
    case "topleft":     return { x: VIEWPORT_MARGIN, y: VIEWPORT_MARGIN, width: halfW, height: halfH };
    case "topright":    return { x: VIEWPORT_MARGIN * 2 + halfW, y: VIEWPORT_MARGIN, width: halfW, height: halfH };
    case "center":      return { x: VIEWPORT_MARGIN + Math.floor(halfW / 2), y: VIEWPORT_MARGIN + Math.floor(halfH / 2), width: halfW, height: halfH };
  }
}

export interface ReduceOpts {
  viewport: { width: number; height: number };
}

export function windowStoreReducer(state: WindowEntry[], action: WindowAction, opts: ReduceOpts): WindowEntry[] {
  switch (action.type) {
    case "open": {
      const existing = state.find((w) => w.id === action.entry.id);
      if (existing) {
        // Mở lại id cũ: state = active, focus = max z
        return state.map((w) => w.id === action.entry.id
          ? { ...w, state: "active", z: nextZ(), rect: clampRect(w.rect, opts.viewport) }
          : w);
      }
      const newWindow: WindowEntry = {
        id: action.entry.id,
        title: action.entry.title,
        icon: action.entry.icon,
        variant: action.entry.variant,
        state: action.entry.state ?? "active",
        z: nextZ(),
        rect: clampRect(action.entry.rect ?? DEFAULT_RECT, opts.viewport),
        modalParentId: action.entry.modalParentId,
        persistKey: action.entry.persistKey,
      };
      return [...state, newWindow];
    }
    case "close":
      return state.filter((w) => w.id !== action.id);
    case "focus": {
      const target = state.find((w) => w.id === action.id);
      if (!target) return state;
      if (target.state === "minimized") {
        return state.map((w) => w.id === action.id ? { ...w, state: "active", z: nextZ() } : w);
      }
      return state.map((w) => w.id === action.id ? { ...w, z: nextZ() } : w);
    }
    case "minimize":
      return state.map((w) => w.id === action.id ? { ...w, state: "minimized" } : w);
    case "toggleMaximize":
      return state.map((w) => w.id === action.id
        ? { ...w, state: w.state === "maximized" ? "active" : "maximized", z: nextZ() }
        : w);
    case "move":
      return state.map((w) => w.id === action.id
        ? { ...w, rect: clampRect({ ...w.rect, x: action.to.x, y: action.to.y }, opts.viewport) }
        : w);
    case "resize":
      return state.map((w) => w.id === action.id
        ? { ...w, rect: clampRect({ ...w.rect, width: action.to.width, height: action.to.height }, opts.viewport) }
        : w);
    case "snap":
      return state.map((w) => w.id === action.id
        ? { ...w, rect: snapRect(action.zone, opts.viewport), z: nextZ() }
        : w);
    case "restore":
      return state.map((w) => w.id === action.id ? { ...w, state: "active", z: nextZ() } : w);
  }
}

/** Window trên cùng (active + z cao nhất). Ưu tiên modalParentId: chỉ trả cửa sổ không có cha. */
export function topmostWindow(state: WindowEntry[]): WindowEntry | undefined {
  const active = state.filter((w) => w.state === "active");
  const root = active.filter((w) => !w.modalParentId);
  if (root.length === 0) return undefined;
  return [...root].sort((a, b) => b.z - a.z)[0];
}

/** Tất cả cửa sổ visible (active | maximized) theo z-order. */
export function visibleWindows(state: WindowEntry[]): WindowEntry[] {
  return state
    .filter((w) => w.state === "active" || w.state === "maximized")
    .sort((a, b) => a.z - b.z);
}

/** Cửa sổ trong taskbar (active | minimized) theo z-order. */
export function taskbarWindows(state: WindowEntry[]): WindowEntry[] {
  return state
    .filter((w) => w.state !== "closed")
    .sort((a, b) => b.z - a.z);
}
