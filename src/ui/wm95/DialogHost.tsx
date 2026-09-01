// v5: re-export default cho astro import
// DialogHost.tsx — island duy nhất render toàn bộ dialog trong stack (ADR-0002).
// Mount 1 lần ở BaseLayout; mọi uiAlert/uiConfirm hiện qua đây với theme Win95.
import React, { useEffect, useRef, useSyncExternalStore } from "react";
import { subscribeDialogs, closeDialog, getDialogState, escapeTop } from "./dialogService";
import { topDialog } from "./dialogStack";
import { useFocusTrap } from "../../lib/a11y";
import { RetroButton } from "../kernel/RetroButton";
import { Z_INDEX } from "../tokens/tokens.gen";

const ICON: Record<string, string> = {
  alert: "\u26A0\uFE0F",
  confirm: "\u2753",
  custom: "\uD83D\uDCCB",
};

const modalZ = Number(String(Z_INDEX.modal).replace(/[^0-9]/g, "")) || 600;

export const DialogHost: React.FC = () => {
  const dialogs = useSyncExternalStore(subscribeDialogs, getDialogState, getDialogState);
  const boxRef = useRef<HTMLDivElement>(null);
  const top = topDialog(dialogs);

  useFocusTrap(boxRef, dialogs.length > 0, () => {
    if (top && top.dismissible) closeDialog(top.id, false);
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") escapeTop();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (dialogs.length === 0) return null;
  const d = top!;

  // Batch 8: backdrop click-dismiss — Esc handled qua dialogService keyboardManager
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      style={{ zIndex: modalZ }}
      onClick={(e) => {
        if (e.target === e.currentTarget && d.dismissible) closeDialog(d.id, false);
      }}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-label={d.kind === "confirm" ? "Xác nhận hành động" : "Thông báo hệ thống"}
        tabIndex={-1}
        className="win95-container w-full max-w-sm font-retro text-black"
      >
        <div className="win95-header">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true">{ICON[d.kind] ?? ICON.custom}</span>
            <span className="text-xs font-bold truncate">
              {d.kind === "confirm" ? "XÁC NHẬN" : "MEOW_ALERT.EXE"}
            </span>
          </span>
          <button
            type="button"
            className="win95-btn py-0 px-1.5 font-bold"
            aria-label="Đóng"
            onClick={() => closeDialog(d.id, false)}
          >
            \u2715
          </button>
        </div>
        <div className="p-3 bg-win-gray text-[12px] leading-snug whitespace-pre-line">{String(d.message ?? "")}</div>
        <div className="flex justify-end gap-2 p-2 border-t-2 border-win-light bg-win-gray">
          <RetroButton size="sm" onClick={() => closeDialog(d.id, true)}>
            {d.kind === "confirm" ? "OK" : "Đồng ý"}
          </RetroButton>
          {d.kind === "confirm" && (
            <RetroButton size="sm" onClick={() => closeDialog(d.id, false)}>
              Hủy
            </RetroButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default DialogHost;
