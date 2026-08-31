// RetroButton.tsx — kernel primitive (kế hoạch v5 §3.3, ADR-0001/0003).
// Nguồn chân lý cho nút Win95: bevel chuẩn, touch target qua token, focus-visible,
// variant/size/density. KHÔNG hex literal — mọi màu qua token/semantic role.
import React from "react";

export type RetroButtonVariant = "solid" | "neon" | "ghost";
export type RetroButtonSize = "sm" | "md" | "lg";

export interface RetroButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: RetroButtonVariant;
  size?: RetroButtonSize;
  /** Icon/emoji trang trí phía trước label (aria-hidden). */
  icon?: string;
  /** Loading: disable + đổi label thành "…" để giữ layout. */
  busy?: boolean;
  /** Full-width trong container. */
  block?: boolean;
}

const SIZE_CLASS: Record<RetroButtonSize, string> = {
  sm: "text-[10px] min-h-[var(--touch-sm)] px-2",
  md: "text-xs min-h-[var(--touch-md)] px-3",
  lg: "text-sm min-h-[var(--touch-lg)] px-4",
};

const VARIANT_CLASS: Record<RetroButtonVariant, string> = {
  // Nút xám Win95 cổ điển
  solid: "bg-win-gray text-black border-2 border-t-win-light border-l-win-light border-b-win-darkest border-r-win-darkest hover:bg-win-light active:border-t-win-darkest active:border-l-win-darkest active:border-b-win-light active:border-r-win-light",
  // Nút neon vaporwave trên nền tối
  neon: "bg-cosmic-surface text-text-primary border border-vapor-pink/60 hover:border-vapor-pink hover:shadow-[var(--shadow-glow-subtle)] active:translate-y-px font-bold",
  // Nút chữ trên nền trong suốt
  ghost: "bg-transparent text-text-secondary border border-transparent hover:text-vapor-blue hover:border-vapor-blue/40",
};

export const RetroButton = React.forwardRef<HTMLButtonElement, RetroButtonProps>(
  ({ variant = "solid", size = "md", icon, busy = false, block = false, className = "", children, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        className={[
          "retro-btn inline-flex items-center justify-center gap-1.5 font-retro font-bold select-none",
          "focus-visible:outline-2 focus-visible:outline-vapor-blue focus-visible:outline-offset-1",
          "transition-[background-color,border-color,box-shadow] duration-[var(--duration-fast)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          SIZE_CLASS[size],
          VARIANT_CLASS[variant],
          block ? "w-full" : "",
          className,
        ].join(" ")}
        {...rest}
      >
        {icon && !busy && (
          <span aria-hidden="true" className="text-[1.1em] leading-none">
            {icon}
          </span>
        )}
        <span className="truncate">{busy ? "…" : children}</span>
      </button>
    );
  }
);
RetroButton.displayName = "RetroButton";
