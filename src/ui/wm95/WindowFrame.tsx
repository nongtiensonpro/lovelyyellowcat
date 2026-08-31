// WindowFrame.tsx — cửa sổ live: drag, resize, snap, focus (ADR-0002 §3.4).
// Mọi gesture dùng Pointer Events; fallback keyboard (Alt+F4 đóng, Enter focus, Esc exit).
// SSR-safe: chỉ attach listener khi mounted trong browser.
import React, { useEffect, useRef, useState } from "react";
import { useWindows, dispatchWindow } from "./windowRuntime";
import type { WindowEntry } from "./windowStore";

const MIN_W = 240;
const MIN_H = 160;
const TASKBAR_PX = 36;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface WindowFrameProps {
  id: string;
  children?: React.ReactNode;
  /** Hiện thanh titlebar (mặc định true) */
  showTitlebar?: boolean;
}

export const WindowFrame: React.FC<WindowFrameProps> = ({ id, children, showTitlebar = true }) => {
  const windows = useWindows();
  const w = windows.find((w) => w.id === id);
  const dragRef = useRef<{ mode: "move" | "resize"; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number; } | null>(null);
  const [snapHint, setSnapHint] = useState<"left" | "right" | "top" | "topleft" | "topright" | "bottomleft" | "bottomright" | "center" | null>(null);

  useEffect(() => {
    if (!w) return;
    function onMove(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.sx;
      const dy = e.clientY - d.sy;
      if (d.mode === "move") {
        // Snap hints
        const vw = window.innerWidth, vh = window.innerHeight;
        const cx = d.ox + dx + d.ow / 2;
        const cy = d.oy + dy + d.oh / 2;
        const xLeft = cx < vw * 0.25;
        const xRight = cx > vw * 0.75;
        const yTop = cy < vh * 0.25;
        const yBottom = cy > vh * 0.75;
        if (xLeft && yTop) { setSnapHint("topleft"); return; }
        if (xRight && yTop) { setSnapHint("topright"); return; }
        if (xLeft && yBottom) { setSnapHint("bottomleft"); return; }
        if (xRight && yBottom) { setSnapHint("bottomright"); return; }
        if (yTop) { setSnapHint("top"); return; }
        if (xLeft) { setSnapHint("left"); return; }
        if (xRight) { setSnapHint("right"); return; }
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) { setSnapHint("center"); return; }
        setSnapHint(null);
      } else {
        // resize
        const newW = clamp(d.ow + dx, MIN_W, window.innerWidth - 32);
        const newH = clamp(d.oh + dy, MIN_H, window.innerHeight - TASKBAR_PX - 32);
        dispatchWindow({ type: "resize", id: id, to: { width: newW, height: newH } });
      }
    }
    function onUp(e: PointerEvent) {
      const d = dragRef.current;
      if (d?.mode === "move" && snapHint) {
        dispatchWindow({ type: "snap", id: id, zone: snapHint });
      }
      dragRef.current = null;
      setSnapHint(null);
      (e.target as Element)?.releasePointerCapture?.(e.pointerId);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [id, snapHint]);

  if (!w) return null;
  if (w.state === "minimized") return null;
  const isMax = w.state === "maximized";

  const onTitlebarDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dispatchWindow({ type: "focus", id });
    if (isMax) {
      // Restore để có thể drag
      dispatchWindow({ type: "toggleMaximize", id });
      return;
    }
    dragRef.current = { mode: "move", sx: e.clientX, sy: e.clientY, ox: w.rect.x, oy: w.rect.y, ow: w.rect.width, oh: w.rect.height };
  };
  const onResizeDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    dispatchWindow({ type: "focus", id });
    dragRef.current = { mode: "resize", sx: e.clientX, sy: e.clientY, ox: w.rect.x, oy: w.rect.y, ow: w.rect.width, oh: w.rect.height };
  };

  const style: React.CSSProperties = {
    left: isMax ? 0 : w.rect.x,
    top: isMax ? 0 : w.rect.y,
    width: isMax ? "100vw" : w.rect.width,
    height: isMax ? `calc(100vh - ${TASKBAR_PX}px)` : w.rect.height,
    zIndex: w.z,
  };

  return (
    <>
      {/* Snap guide overlay */}
      {snapHint && <SnapGuide zone={snapHint} />}
      <div
        role="dialog"
        aria-label={w.title}
        tabIndex={-1}
        onMouseDown={() => dispatchWindow({ type: "focus", id })}
        onKeyDown={(e) => {
          if (e.key === "F4" && e.altKey) { e.preventDefault(); dispatchWindow({ type: "close", id }); }
          if (e.key === "Enter" || e.key === " ") { dispatchWindow({ type: "focus", id }); }
        }}
        className="absolute win95-container"
        style={style}
      >
        {showTitlebar && (
          <div
            className="win95-header px-2 select-none"
            onPointerDown={onTitlebarDown}
            style={{ cursor: isMax ? "default" : "move" }}
          >
            <span className="flex items-center gap-1.5 text-xs font-bold truncate">
              {w.icon && <span aria-hidden="true">{w.icon}</span>}
              {w.title}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                aria-label="Minimize"
                className="win95-btn py-0 px-1 text-[10px] font-bold"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => dispatchWindow({ type: "minimize", id })}
              >_</button>
              <button
                type="button"
                aria-label="Maximize"
                className="win95-btn py-0 px-1 text-[10px] font-bold"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => dispatchWindow({ type: "toggleMaximize", id })}
              >□</button>
              <button
                type="button"
                aria-label="Close"
                className="win95-btn py-0 px-1 text-[10px] font-bold"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => dispatchWindow({ type: "close", id })}
              >✕</button>
            </div>
          </div>
        )}
        <div className="overflow-auto" style={{ height: isMax ? `calc(100vh - ${TASKBAR_PX}px - 22px)` : w.rect.height - 22 }}>
          {children}
        </div>
        {!isMax && (
          <div
            aria-label="Resize"
            role="separator"
            onPointerDown={onResizeDown}
            className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
            style={{ background: "linear-gradient(135deg, transparent 50%, var(--color-win-dark) 50%)" }}
          />
        )}
      </div>
    </>
  );
};

const SnapGuide: React.FC<{ zone: NonNullable<WindowEntry["state"]> | "topleft" | "topright" | "bottomleft" | "bottomright" | "top" | "left" | "right" | "center" }> = ({ zone }) => {
  const styles: Record<string, React.CSSProperties> = {
    left: { left: 16, top: 16, width: "calc(50vw - 24px)", height: "calc(100vh - 52px)" },
    right: { right: 16, top: 16, width: "calc(50vw - 24px)", height: "calc(100vh - 52px)" },
    top: { left: 16, top: 16, width: "calc(100vw - 32px)", height: "calc(50vh - 26px)" },
    topleft: { left: 16, top: 16, width: "calc(50vw - 24px)", height: "calc(50vh - 26px)" },
    topright: { right: 16, top: 16, width: "calc(50vw - 24px)", height: "calc(50vh - 26px)" },
    bottomleft: { left: 16, bottom: TASKBAR_PX + 8, width: "calc(50vw - 24px)", height: "calc(50vh - 26px)" },
    bottomright: { right: 16, bottom: TASKBAR_PX + 8, width: "calc(50vw - 24px)", height: "calc(50vh - 26px)" },
    center: { left: "25%", top: "25%", width: "50%", height: "calc(50% - 36px)" },
  };
  return (
    <div aria-hidden="true" className="fixed pointer-events-none" style={{ ...styles[zone], zIndex: 999, border: "2px dashed var(--color-vapor-pink, #ff71ce)", background: "rgb(255 113 206 / 0.08)" }} />
  );
};
