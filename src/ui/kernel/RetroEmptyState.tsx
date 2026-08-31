// RetroEmptyState.tsx — trạng thái rỗng/lỗi chuẩn (icon pixel + nút hành động).
import React from "react";
import { RetroButton } from "./RetroButton";

export interface RetroEmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const RetroEmptyState: React.FC<RetroEmptyStateProps> = ({
  icon = "\u{1F4C4}", title, description, actionLabel, onAction,
}) => (
  <div className="flex flex-col items-center justify-center gap-2 p-8 text-center font-retro">
    <span aria-hidden="true" className="text-3xl select-none">{icon}</span>
    <p className="font-bold text-sm text-text-primary">{title}</p>
    {description && <p className="text-xs text-text-secondary max-w-sm">{description}</p>}
    {actionLabel && onAction && (
      <RetroButton size="sm" variant="neon" onClick={onAction} className="mt-1">
        {actionLabel}
      </RetroButton>
    )}
  </div>
);

export default RetroEmptyState;
