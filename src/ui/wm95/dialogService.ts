// dialogService.ts — API promise-based thay alert()/confirm() (kế hoạch v5 Phase 3, ADR-0002).
// Import an toàn client/server; chỉ push khi có listener (DialogHost đã mount ở client).
import { dialogStackReducer, topDialog, type DialogEntry, type DialogKind } from "./dialogStack";

type Listener = (state: DialogEntry[]) => void;

let state: DialogEntry[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(state);
}

/** DialogHost (client island) đăng ký nhận stack; trả hàm unsubscribe. */
export function subscribeDialogs(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}

function push(kind: DialogKind, opts: { id?: string; message?: string; dismissible?: boolean }): Promise<boolean> {
  const id = opts.id ?? "dlg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
  return new Promise<boolean>((resolve) => {
    state = dialogStackReducer(state, {
      type: "open",
      entry: { id, kind, dismissible: opts.dismissible ?? kind !== "custom", message: opts.message, resolve },
    });
    emit();
  });
}

/** Thay alert(): thông báo đơn, resolve true khi người dùng bấm xác nhận. */
export const uiAlert = (message: string, id?: string): Promise<boolean> =>
  push("alert", { id, message, dismissible: true });

/** Thay confirm(): OK => true, Cancel/Escape/backdrop => false. */
export const uiConfirm = (message: string, opts: { id?: string } = {}): Promise<boolean> =>
  push("confirm", { id: opts.id, message, dismissible: true });

/** Đóng theo id (dùng cho custom flow/timeout). */
export function closeDialog(id: string, value = false): void {
  state = dialogStackReducer(state, { type: "close", id, value });
  emit();
}

/** Escape: pop đỉnh stack nếu dismissible (gọi từ DialogHost keydown). */
export function escapeTop(): void {
  state = dialogStackReducer(state, { type: "escape" });
  emit();
}

export const getDialogState = (): DialogEntry[] => state;
export const getTopDialog = topDialog;
