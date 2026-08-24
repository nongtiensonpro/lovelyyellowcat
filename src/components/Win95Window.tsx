import React, { useState } from "react";

export interface Win95WindowProps {
  title: string;
  icon?: string;
  variant?: "classic" | "neon" | "sunken";
  menuItems?: string[];
  statusBarText?: string;
  statusPanelText?: string;
  isActive?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  widthClass?: string;
  className?: string;
  children: React.ReactNode;
}

export const Win95Window: React.FC<Win95WindowProps> = ({
  title,
  icon = "💾",
  variant = "classic",
  menuItems,
  statusBarText,
  statusPanelText,
  isActive = true,
  onMinimize,
  onMaximize,
  onClose,
  widthClass = "max-w-md w-full",
  className = "",
  children
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  const containerClass = variant === "neon"
    ? `vapor-window ${widthClass} font-retro text-white ${className}`
    : `win95-window ${widthClass} font-retro text-black ${className}`;

  const headerClass = variant === "neon"
    ? "win95-header bg-gradient-to-r from-vapor-purple to-vapor-pink text-white py-1 px-2"
    : isActive
      ? "win95-header py-1 px-2"
      : "win95-header win95-header-inactive py-1 px-2";

  return (
    <div className={containerClass}>
      {/* Titlebar */}
      <div className={headerClass}>
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-xs select-none">{icon}</span>
          <span className="text-xs font-bold truncate tracking-wide">{title}</span>
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            className="win95-btn py-0 px-1 text-[10px] font-bold h-4 w-4 flex items-center justify-center"
            style={{ minHeight: "16px", minWidth: "16px" }}
            aria-label="Minimize"
            onClick={() => {
              if (onMinimize) onMinimize();
              else setIsMinimized(!isMinimized);
            }}
          >
            _
          </button>
          <button
            type="button"
            className="win95-btn py-0 px-1 text-[10px] font-bold h-4 w-4 flex items-center justify-center"
            style={{ minHeight: "16px", minWidth: "16px" }}
            aria-label="Maximize"
            onClick={onMaximize}
          >
            □
          </button>
          {onClose && (
            <button
              type="button"
              className="win95-btn py-0 px-1 text-[10px] font-bold h-4 w-4 flex items-center justify-center"
              style={{ minHeight: "16px", minWidth: "16px" }}
              aria-label="Close"
              onClick={onClose}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Optional Menubar */}
          {menuItems && menuItems.length > 0 && (
            <div className="win95-menubar">
              {menuItems.map((item, idx) => (
                <span key={idx}>{item}</span>
              ))}
            </div>
          )}

          {/* Window Body */}
          <div className={variant === "neon" ? "p-3 bg-cosmic-deep/90 text-text-primary" : "p-3 bg-win-gray"}>
            {children}
          </div>

          {/* Optional Statusbar */}
          {(statusBarText || statusPanelText) && (
            <div className="win95-statusbar justify-between">
              <span className="truncate text-[10px]">{statusBarText || "Ready"}</span>
              {statusPanelText && (
                <span className="win95-statusbar-panel text-[10px] shrink-0 font-mono">
                  {statusPanelText}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
