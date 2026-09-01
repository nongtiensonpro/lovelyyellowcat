// CommandPalette.tsx — Ctrl+K palette (kế hoạch §3.5, ADR-0002).
// Mount một lần trong AppShell; SearchModal cũ sẽ delegate dần sang đây.
import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { useFocusTrap } from "../../lib/a11y";
import { registerShortcut } from "./keyboardManager";
import { getCommands, subscribeCommands, filterCommands, type Command } from "./commands";

export function CommandPalette({ role = "public" }: { role?: "public" | "auth" | "admin" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const all = useSyncExternalStore(subscribeCommands, getCommands, getCommands);
  const filtered = filterCommands(all, query, role);

  const close = useCallback(() => { setOpen(false); setQuery(""); setSelected(0); }, []);

  // Ctrl+K / Cmd+K toggle — đăng ký 1 lần
  useEffect(() => {
    const unreg = registerShortcut("cmd-palette-toggle", {
      key: "k",
      ctrl: true,
      prevent: true,
      action: () => setOpen((v) => !v),
    });
    return unreg;
  }, []);

  // Focus input khi mở
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  useFocusTrap(dialogRef, open, close);

  const execute = useCallback(
    (cmd: Command) => { close(); cmd.action(); },
    [close]
  );

  if (!open) return null;

  return (
    // Backdrop click-to-close: Esc đã xử lý ở onKeyDown document (batch 8) — phụ kiện bổ sung bằng chuột
    /* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
    <div
      className="fixed inset-0 flex items-start justify-center bg-black/60 backdrop-blur-[2px] p-4 pt-16 sm:pt-24"
      style={{ zIndex: 500 }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Bảng lệnh hệ thống"
        tabIndex={-1}
        className="win95-container w-full max-w-lg font-retro text-black"
      >
        <div className="win95-header px-2">
          <span className="flex items-center gap-1.5 text-xs font-bold">
            <span aria-hidden="true">🔍</span> COMMAND.EXE
          </span>
          <span className="text-[10px] opacity-80 font-mono">{filtered.length} lệnh</span>
        </div>

        <div className="p-2 bg-win-gray border-b-2 border-win-light">
          <input
            ref={inputRef}
            autoComplete="off"
            className="w-full bg-white text-black border-2 border-t-win-darkest border-l-win-darkest border-b-win-light border-r-win-light px-2 py-1 text-xs font-retro outline-none focus-visible:outline-2 focus-visible:outline-vapor-blue"
            placeholder="Gõ tên lệnh hoặc từ khóa…"
            aria-label="Tìm lệnh"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={(e) => {
              if (e.key === "Escape") { close(); return; }
              if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); return; }
              if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); return; }
              if (e.key === "Enter" && filtered[selected]) execute(filtered[selected]);
            }}
          />
        </div>

        <ul className="bg-win-gray max-h-72 overflow-y-auto p-1" role="listbox" aria-label="Danh sách lệnh">
          {filtered.length === 0 && (
            <li className="px-3 py-3 text-center text-xs text-black/60 font-retro">
              {query ? <>Không có lệnh khớp &quot;{query}&quot;.</> : "Chưa có lệnh nào được đăng ký."}
            </li>
          )}
          {filtered.map((cmd, i) => (
            <li
              // li role=option: Enter/Arrows điều khiển từ input onKeyDown — li là target hiển thị
              key={cmd.id}
              role="option"
              aria-selected={i === selected}
              className={[
                "flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer rounded-none",
                i === selected ? "bg-win-titlebar text-white font-bold" : "text-black hover:bg-win-light",
              ].join(" ")}
              onClick={() => execute(cmd)}
              onMouseEnter={() => setSelected(i)}
            >
              <span aria-hidden="true">{cmd.icon ?? "▶"}</span>
              <span className="flex-1 truncate">{cmd.label}</span>
              {(cmd.keywords ?? []).slice(0, 2).map((k) => (
                <kbd key={k} className="bg-win-dark text-white px-1 text-[10px] font-mono shrink-0">{k}</kbd>
              ))}
            </li>
          ))}
        </ul>

        <div className="win95-statusbar px-2 py-0.5 flex items-center justify-between">
          <span className="text-[10px] font-mono">↑↓ di chuyển · Enter chạy · Esc đóng</span>
          <span className="win95-statusbar-panel text-[10px] font-mono">ROLE: {role.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}
