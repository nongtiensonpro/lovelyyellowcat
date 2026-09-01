// WindowFrame.tsx — live window UI cho Window Manager (kế hoạch §3.4, ADR-0002).
// Drag bằng Pointer Events; resize qua 8 cạnh; snap zone cạnh màn hình.
import React, { useRef, useCallback, useEffect, useState } from "react";
import { useFocusTrap } from "../../lib/a11y";
import { dispatchWindow } from "../wm95/windowRuntime";
import type { WindowEntry, WindowAction } from "../wm95/windowStore";

const SNAP_THRESHOLD = 24;
const MIN_W = 240;
const MIN_H = 160;

interface WindowFrameProps {
  entry: WindowEntry;
  onClose?: () => void;
  /** Component cửa sổ con — rendered trong body. */
  children?: React.ReactNode;
}

type ResizeEdge = "n" | "e" | "s" | "w" | "ne" | "se" | "sw" | "nw";

export const WindowFrame: React.FC<WindowFrameProps> = ({ entry, onClose, children }) => {
  const [prevFocus, setPrevFocus] = useState<HTMLElement | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef<{ x: number; y: number; rect: WindowEntry["rect"] } | null>(null);
  const resizeOrigin = useRef<{ x: number; y: number; rect: WindowEntry["rect"]; edge: ResizeEdge } | null>(null);
  type SnapZone = NonNullable<Extract<WindowAction, { type: "snap" }>["zone"]>;
  const [snapZone, setSnapZone] = useState<SnapZone | null>(null);
  useFocusTrap(bodyRef, true, onClose);

  // focus + aria
  useEffect(() => {
    setPrevFocus((document.activeElement as HTMLElement) ?? null);
    bodyRef.current?.focus();
    return () => { prevFocus?.focus?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Drag (titlebar) ──
  const onDragStart = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (entry.state !== "active") return;
      e.preventDefault();
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      dragOrigin.current = { x: e.clientX, y: e.clientY, rect: entry.rect };
      dispatchWindow({ type: "focus", id: entry.id });
    },
    [entry.id, entry.rect, entry.state]
  );

  const onDragMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!dragOrigin.current) return;
      const { x, y, rect } = dragOrigin.current;
      const dx = e.clientX - x, dy = e.clientY - y;
      const newX = rect.x + dx, newY = rect.y + dy;
      // detect snap
      const vw = window.innerWidth;
      const zone: SnapZone | null =
        newX < SNAP_THRESHOLD ? "left" :
        vw - (newX + rect.width) < SNAP_THRESHOLD ? "right" :
        newY < SNAP_THRESHOLD ? "top" : null;
      setSnapZone(zone); // zone đã là SnapZone | null — cast thừa từ bản cũ
      dispatchWindow({ type: "move", id: entry.id, to: { x: newX, y: newY } });
    },
    [entry.id]
  );

  const onDragEnd = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!dragOrigin.current) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      dragOrigin.current = null;
      if (snapZone) {
        dispatchWindow({ type: "snap", id: entry.id, zone: snapZone });
      }
      setSnapZone(null);
    },
    [entry.id, snapZone]
  );

  // ── Resize (8 handles) ──
  const onResizeStart = useCallback(
    (edge: ResizeEdge) => (e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      resizeOrigin.current = { x: e.clientX, y: e.clientY, rect: entry.rect, edge };
      dispatchWindow({ type: "focus", id: entry.id });
    },
    [entry.id, entry.rect]
  );

  const onResizeMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!resizeOrigin.current) return;
      const { x, y, rect, edge } = resizeOrigin.current;
      const dx = e.clientX - x, dy = e.clientY - y;
      let nw = rect.width, nh = rect.height, nx = rect.x, ny = rect.y;
      if (edge.includes("e")) nw = Math.max(MIN_W, rect.width + dx);
      if (edge.includes("s")) nh = Math.max(MIN_H, rect.height + dy);
      if (edge.includes("w")) { nw = Math.max(MIN_W, rect.width - dx); nx = rect.x + (rect.width - nw); }
      if (edge.includes("n")) { nh = Math.max(MIN_H, rect.height - dy); ny = rect.y + (rect.height - nh); }
      if (edge.includes("n") || edge.includes("s")) dispatchWindow({ type: "move", id: entry.id, to: { x: nx, y: ny } });
      dispatchWindow({ type: "resize", id: entry.id, to: { width: nw, height: nh } });
    },
    [entry.id]
  );

  const onResizeEnd = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!resizeOrigin.current) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      resizeOrigin.current = null;
    },
    []
  );

  // ── Double-click titlebar: toggleMaximize ──
  const onDblClick = useCallback(() => {
    dispatchWindow({ type: "toggleMaximize", id: entry.id });
  }, [entry.id]);

  // ── Keyboard: Escape close, arrows move ──
  const onKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") { onClose?.(); return; }
      const step = e.shiftKey ? 32 : 8;
      if (e.key === "ArrowLeft") { e.preventDefault(); dispatchWindow({ type: "move", id: entry.id, to: { x: entry.rect.x - step, y: entry.rect.y } }); }
      if (e.key === "ArrowRight") { e.preventDefault(); dispatchWindow({ type: "move", id: entry.id, to: { x: entry.rect.x + step, y: entry.rect.y } }); }
      if (e.key === "ArrowUp") { e.preventDefault(); dispatchWindow({ type: "move", id: entry.id, to: { x: entry.rect.x, y: entry.rect.y - step } }); }
      if (e.key === "ArrowDown") { e.preventDefault(); dispatchWindow({ type: "move", id: entry.id, to: { x: entry.rect.x, y: entry.rect.y + step } }); }
    },
    [entry.id, entry.rect.x, entry.rect.y, onClose]
  );

  const isMax = entry.state === "maximized";
  // ── Early returns (SAU tất cả hooks — Rules of Hooks: hooks chạy cùng thứ tự mỗi render) ──
  if (typeof window === "undefined") return null;
  if (entry.state === "closed") return null;
  if (entry.state === "minimized") return null;

  // Batch 8: dialog có đầy đủ onKeyDown (onKey) — rule không nhận role=dialog
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={bodyRef}
      role="dialog"
      aria-label={entry.title}
      aria-modal={entry.modalParentId ? "true" : undefined}
      tabIndex={-1}
      onKeyDown={onKey}
      onPointerDown={() => dispatchWindow({ type: "focus", id: entry.id })}
      className={`win95-window absolute font-retro text-black ${entry.variant === "neon" ? "neon" : ""}`}
      style={{ left: entry.rect.x, top: entry.rect.y, width: entry.rect.width, height: entry.rect.height, zIndex: entry.z }}
    >
      {/* Titlebar */}
      <div
        className="win95-header px-2 py-0.5 flex items-center gap-2 select-none touch-none"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        onDoubleClick={onDblClick}
      >
        <span aria-hidden="true">{entry.icon ?? "💾"}</span>
        <span className="text-xs font-bold truncate flex-1">{entry.title}</span>
        <button
          type="button"
          className="win95-btn win95-titlebar-btn py-0 px-1 text-[10px] font-bold"
          aria-label="Minimize"
          onClick={(e) => { e.stopPropagation(); dispatchWindow({ type: "minimize", id: entry.id }); }}
        >_</button>
        <button
          type="button"
          className="win95-btn win95-titlebar-btn py-0 px-1 text-[10px] font-bold"
          aria-label={isMax ? "Restore" : "Maximize"}
          onClick={(e) => { e.stopPropagation(); dispatchWindow({ type: "toggleMaximize", id: entry.id }); }}
        >{isMax ? "❐" : "□"}</button>
        {onClose && (
          <button
            type="button"
            className="win95-btn win95-titlebar-btn py-0 px-1 text-[10px] font-bold"
            aria-label="Close"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
          >✕</button>
        )}
      </div>

      {/* Body */}
      <div className="overflow-auto p-2 bg-win-gray" style={{ height: "calc(100% - 18px)" }}>
        {children}
      </div>

      {/* Resize handles (8) — only when not maximized */}
      {!isMax && (
        <>
          {(["n","e","s","w","ne","se","sw","nw"] as ResizeEdge[]).map((edge) => (
            <span
              key={edge}
              role="presentation"
              onPointerDown={onResizeStart(edge)}
              onPointerMove={onResizeMove}
              onPointerUp={onResizeEnd}
              className={`absolute touch-none ${cursorForEdge(edge)} ${edgeClass(edge)}`}
            />
          ))}
        </>
      )}

      {/* Snap zone visual */}
      {snapZone && <span className="absolute inset-0 ring-2 ring-vapor-pink pointer-events-none" aria-hidden="true" />}
    </div>
  );
};

function cursorForEdge(edge: ResizeEdge): string {
  return edge === "n" || edge === "s" ? "cursor-ns-resize"
    : edge === "e" || edge === "w" ? "cursor-ew-resize"
    : edge === "ne" || edge === "sw" ? "cursor-nesw-resize"
    : "cursor-nwse-resize";
}
function edgeClass(edge: ResizeEdge): string {
  const base = "bg-transparent";
  switch (edge) {
    case "n":  return base + " top-0 left-2 right-2 h-1";
    case "s":  return base + " bottom-0 left-2 right-2 h-1";
    case "e":  return base + " right-0 top-2 bottom-2 w-1";
    case "w":  return base + " left-0 top-2 bottom-2 w-1";
    case "ne": return base + " top-0 right-0 w-2 h-2";
    case "nw": return base + " top-0 left-0 w-2 h-2";
    case "se": return base + " bottom-0 right-0 w-2 h-2";
    case "sw": return base + " bottom-0 left-0 w-2 h-2";
  }
}
