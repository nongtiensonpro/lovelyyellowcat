// Win95Window.tsx — v5: delegating sang kernel RetroWindow (kế hoạch §3.3).
// Public API giữ nguyên cho các call site hiện có; phương hướng mới dùng thẳng src/ui/kernel/RetroWindow.
import React from "react";
import { RetroWindow, type RetroWindowVariant } from "../ui/kernel/RetroWindow";

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
  icon = "\u{1F4BE}",
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
  children,
}) => {
  const retroVariant: RetroWindowVariant =
    variant === "neon" ? "neon" : variant === "sunken" ? "sunken" : "classic";

  return (
    <RetroWindow
      title={title}
      icon={icon}
      variant={retroVariant}
      menuItems={menuItems}
      statusBarText={statusBarText}
      statusPanelText={statusPanelText}
      active={isActive}
      onMinimize={onMinimize}
      onMaximize={onMaximize}
      onClose={onClose}
      widthClass={widthClass}
      className={className}
    >
      {children}
    </RetroWindow>
  );
};
