// WindowManagerProvider.tsx — Island React: cung cấp WM runtime + Ctrl+K palette
// cho mọi component sử dụng. Phase 3 chỉ cung cấp:
//  - openWindow(id, title, opts) API gọn từ child
//  - render CommandPalette + WindowFrame cho tất cả active windows
// Phase 4+ sẽ mở rộng (taskbar, drag handles, v.v.)
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useWindows, openWindow, dispatchWindow } from "../hooks/useWindowRuntime";
import { usePreferences } from "../hooks/usePreferences";
import { CommandPalette } from "./CommandPalette";
import { focusTrap } from "../wm95/focusScope";
import type { WindowEntry } from "../wm95/windowStore";

interface Props {
  role?: "public" | "auth" | "admin";
}

export const WindowManagerProvider: React.FC<Props> = ({ role = "public" }) => {
  const windows = useWindows();
  // preferences chỉ cần để detect access mode (disable drag)
  void usePreferences();
  // Khi user gõ "Ctrl+Alt+T" -> mở window demo "Cửa sổ Mẫu" (dùng làm smoke test cho runtime)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.ctrlKey && (e.key === "t" || e.key === "T")) {
        e.preventDefault();
        openWindow({
          id: "demo-window",
          title: "CỬA_SỔ_MẪU.EXE",
          icon: "🪟",
          variant: "classic",
          persistKey: "demo",
        });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const visible = windows.filter((w) => w.state === "active" || w.state === "maximized");

  return (
    <>
      {visible.map((w) => (
        <WindowFrame key={w.id} entry={w} />
      ))}
      <CommandPalette role={role} />
    </>
  );
};

// ── WindowFrame: rendering 1 cửa sổ với drag/resize/snap/titlebar ──
const WindowFrame: React.FC<{ entry: WindowEntry }> = ({ entry }) => {
  const ref = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const resizeState = useRef<{ startX: number; startY: number; baseW: number; baseH: number } | null>(null);
  const [_, force] = useState(0);

  // Focus trap (dùng core a11y) — chỉ khi cửa sổ active
  useEffect(() => focusTrap(ref, entry.state === "active" || entry.state === "maximized"), [entry.state, entry.id]);

  // Drag — pointerdown trên titlebar
  const onTitleDown = useCallback((e: React.PointerEvent) => {
    if (entry.state === "maximized") return;
    const target = e.target as HTMLElement;
    if (target.closest("button")) return; // không drag khi click control button
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = {
      startX: e.clientX, startY: e.clientY,
      baseX: entry.rect.x, baseY: entry.rect.y,
    };
    dispatchWindow({ type: "focus", id: entry.id });
  }, [entry.id, entry.rect.x, entry.rect.y, entry.state]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragState.current) {
      const dx = e.clientX - dragState.current.startX;
      const dy = e.clientY - dragState.current.startY;
      dispatchWindow({ type: "move", id: entry.id, to: { x: dragState.current.baseX + dx, y: dragState.current.baseY + dy } });
    } else if (resizeState.current) {
      const dw = e.clientX - resizeState.current.startX;
      const dh = e.clientY - resizeState.current.startY;
      dispatchWindow({ type: "resize", id: entry.id, to: {
        width: Math.max(240, resizeState.current.baseW + dw),
        height: Math.max(160, resizeState.current.baseH + dh),
      } });
    }
    force((n) => n + 1);
  }, [entry.id]);

  const onPointerUp = useCallback(() => { dragState.current = null; resizeState.current = null; }, []);

  // Snap khi double-click titlebar
  const onTitleDouble = useCallback(() => {
    dispatchWindow({ type: "toggleMaximize", id: entry.id });
  }, [entry.id]);

  // Resize handle (góc dưới phải)
  const onResizeDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    resizeState.current = {
      startX: e.clientX, startY: e.clientY,
      baseW: entry.rect.width, baseH: entry.rect.height,
    };
  }, [entry.rect.width, entry.rect.height]);

  const isMax = entry.state === "maximized";

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={entry.title}
      tabIndex={-1}
      className="absolute"
      style={{
        left: isMax ? 0 : entry.rect.x,
        top: isMax ? 0 : entry.rect.y,
        width: isMax ? "100vw" : entry.rect.width,
        height: isMax ? "calc(100vh - 36px)" : entry.rect.height,
        zIndex: entry.z,
      }}
      onPointerDown={() => dispatchWindow({ type: "focus", id: entry.id })}
    >
      <div className={entry.variant === "neon" ? "vapor-window h-full flex flex-col" : "win95-window h-full flex flex-col"}>
        <div
          className="win95-header px-2 flex items-center justify-between select-none"
          onPointerDown={onTitleDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onDoubleClick={onTitleDouble}
          style={{ cursor: isMax ? "default" : "move" }}
        >
          <span className="text-xs font-bold truncate flex items-center gap-1.5">
            <span aria-hidden="true">{entry.icon ?? "🪟"}</span>{entry.title}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              className="win95-btn win95-titlebar-btn text-[10px] font-bold"
              aria-label="Thu nhỏ"
              onClick={() => dispatchWindow({ type: "minimize", id: entry.id })}
            >_</button>
            <button
              type="button"
              className="win95-btn win95-titlebar-btn text-[10px] font-bold"
              aria-label={isMax ? "Khôi phục" : "Phóng to"}
              onClick={() => dispatchWindow({ type: "toggleMaximize", id: entry.id })}
            >{isMax ? "❐" : "□"}</button>
            <button
              type="button"
              className="win95-btn win95-titlebar-btn text-[10px] font-bold"
              aria-label="Đóng"
              onClick={() => dispatchWindow({ type: "close", id: entry.id })}
            >✕</button>
          </div>
        </div>
        <div className={entry.variant === "neon" ? "p-3 bg-cosmic-deep/90 text-text-primary flex-1 overflow-auto" : "p-3 bg-win-gray flex-1 overflow-auto"}>
          <WindowContent id={entry.id} />
        </div>
        {/* Resize handle */}
        {!isMax && (
          <div
            onPointerDown={onResizeDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{
              position: "absolute",
              right: 0, bottom: 0,
              width: 16, height: 16,
              cursor: "nwse-resize",
              background: "linear-gradient(135deg, transparent 50%, var(--color-win-dark, #808080) 50%)",
            }}
            aria-label="Kéo để thay đổi kích thước"
          />
        )}
      </div>
    </div>
  );
};

// ── WindowContent — Phase 3 chỉ có 1 cửa sổ demo mặc định ──
// Phase 4+ sẽ thay bằng registry thật cho từng id
const WindowContent: React.FC<{ id: string }> = ({ id }) => {
  if (id === "demo-window") {
    return (
      <div className="font-retro text-xs space-y-2">
        <p>🪟 Bạn đang dùng <strong>Window Manager runtime</strong> thật (Phase 3).</p>
        <p>Thử kéo titlebar để di chuyển, kéo góc dưới phải để resize, double-click titlebar để maximize, hoặc nhấn <kbd className="bg-win-light px-1 border border-win-dark">Esc</kbd> rồi click ngoài để đóng.</p>
        <hr className="border-win-dark" />
        <p className="text-text-secondary">Mở rộng: <code>openWindow(&quot;id&quot;, &quot;title&quot;)</code> từ bất kỳ component nào.</p>
      </div>
    );
  }
  return <p className="text-xs font-mono">No content registered for {id}</p>;
};
