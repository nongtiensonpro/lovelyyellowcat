// RetroWindow.tsx — kernel window (kế hoạch §3.3, ADR-0002).
// Vỏ cửa sổ Win95 chuẩn: titlebar + control buttons (bevel thật, không inline style),
// menubar/statusbar tùy chọn, aria cho control buttons. Phase 3 sẽ đăng ký vào WM/95.
import React, { useState } from "react";

export type RetroWindowVariant = "classic" | "neon" | "sunken";

export interface RetroWindowProps {
  title: string;
  icon?: string;
  variant?: RetroWindowVariant;
  menuItems?: string[];
  statusBarText?: string;
  statusPanelText?: string;
  /** Cửa sổ đang focus (titlebar đậm). */
  active?: boolean;
  /** Không cung cấp onMinimize => kernel tự toggle collapsed. */
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  widthClass?: string;
  className?: string;
  children: React.ReactNode;
}

export const RetroWindow: React.FC<RetroWindowProps> = ({
  title,
  icon = "\u{1F4BE}",
  variant = "classic",
  menuItems,
  statusBarText,
  statusPanelText,
  active = true,
  onMinimize,
  onMaximize,
  onClose,
  widthClass = "max-w-md w-full",
  className = "",
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const shell =
    variant === "neon"
      ? `vapor-window ${widthClass} font-retro text-white ${className}`
      : `win95-window ${widthClass} font-retro text-black ${className}`;

  const header =
    variant === "neon"
      ? "win95-header bg-gradient-to-r from-vapor-purple to-vapor-pink text-white py-1 px-2"
      : active
        ? "win95-header py-1 px-2"
        : "win95-header win95-header-inactive py-1 px-2";

  return (
    <div className={shell}>
      {/* Titlebar */}
      <div className={header}>
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-xs select-none" aria-hidden="true">{icon}</span>
          <span className="text-xs font-bold truncate tracking-wide">{title}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            className="win95-btn win95-titlebar-btn py-0 px-1 text-[10px] font-bold"
            aria-label="Minimize"
            onClick={() => {
              if (onMinimize) onMinimize();
              else setCollapsed((c) => !c);
            }}
          >
            _
          </button>
          <button
            type="button"
            className="win95-btn win95-titlebar-btn py-0 px-1 text-[10px] font-bold"
            aria-label="Maximize"
            onClick={onMaximize}
          >
            \u25A1
          </button>
          {onClose && (
            <button
              type="button"
              className="win95-btn win95-titlebar-btn py-0 px-1 text-[10px] font-bold"
              aria-label="Close"
              onClick={onClose}
            >
              \u2715
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          {menuItems && menuItems.length > 0 && (
            <div className="win95-menubar">
              {menuItems.map((item, idx) => (
                <span key={idx}>{item}</span>
              ))}
            </div>
          )}

          <div className={variant === "neon" ? "p-3 bg-cosmic-deep/90 text-text-primary" : "p-3 bg-win-gray"}>
            {children}
          </div>

          {(statusBarText || statusPanelText) && (
            <div className="win95-statusbar justify-between">
              <span className="truncate text-[10px]">{statusBarText || "Ready"}</span>
              {statusPanelText && (
                <span className="win95-statusbar-panel text-[10px] shrink-0 font-mono">{statusPanelText}</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
