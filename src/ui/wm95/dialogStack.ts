// dialogStack.ts — Pure state machine cho stack dialog (nền tảng dialogService Phase 3).
// Ref: ADR-0002 (z-order + focus policy) · kế hoạch v5 §3.4/§3.5.

export type DialogKind = "alert" | "confirm" | "custom";

export type DialogContent = string | { html: string };

export interface DialogEntry {
  id: string;
  kind: DialogKind;
  /** Nội dung hiển thị: string thuần, hoặc { html } cho markup tin cậy nội bộ. */
  message?: string;
  /** Cho phép đóng bằng Escape/backdrop. false => phải bấm nút hành động. */
  dismissible: boolean;
  /** Promise resolver cho alert/confirm; custom dialog tự quản. */
  resolve?: (value: boolean) => void;
}

export type DialogAction =
  | { type: "open"; entry: DialogEntry }
  | { type: "close"; id: string; value?: boolean }
  | { type: "closeTop"; value?: boolean }
  | { type: "escape" };

/**
 * Reducer thuần: state = stack từ đáy -> đỉnh (đỉnh = phần tử cuối, z cao nhất).
 * resolve() được gọi đúng 1 lần khi entry rời stack qua mọi đường đóng.
 */
export function dialogStackReducer(state: DialogEntry[], action: DialogAction): DialogEntry[] {
  switch (action.type) {
    case "open": {
      // Dedupe theo id: mở lại id đang có => đưa lên đỉnh, giữ promise cũ
      const rest = state.filter((d) => d.id !== action.entry.id);
      return [...rest, action.entry];
    }
    case "close": {
      const target = state.find((d) => d.id === action.id);
      if (!target) return state;
      if (target.resolve) target.resolve(action.value ?? false);
      return state.filter((d) => d.id !== action.id);
    }
    case "closeTop": {
      if (state.length === 0) return state;
      const top = state[state.length - 1];
      if (top.resolve) top.resolve(action.value ?? false);
      return state.slice(0, -1);
    }
    case "escape": {
      if (state.length === 0) return state;
      const top = state[state.length - 1];
      if (!top.dismissible) return state;
      if (top.resolve) top.resolve(false);
      return state.slice(0, -1);
    }
    default:
      return state;
  }
}

export const topDialog = (state: DialogEntry[]): DialogEntry | undefined =>
  state[state.length - 1];
