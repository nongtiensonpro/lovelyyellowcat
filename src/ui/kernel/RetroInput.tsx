// RetroInput.tsx — input/select/textarea kernel (Win95 sunken bevel, touch target token).
import React from "react";

const BASE =
  "bg-white text-black border-2 border-t-win-darkest border-l-win-darkest border-b-win-light border-r-win-light " +
  "font-retro text-xs px-2 focus-visible:outline-2 focus-visible:outline-vapor-blue focus-visible:outline-offset-0 " +
  "disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-win-dark";

export interface RetroInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}
export const RetroInput = React.forwardRef<HTMLInputElement, RetroInputProps>(
  ({ invalid, className = "", ...rest }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={[BASE, "min-h-[var(--touch-md)]", invalid ? "border-b-state-error" : "", className].join(" ")}
      {...rest}
    />
  )
);
RetroInput.displayName = "RetroInput";

export type RetroSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;
export const RetroSelect = React.forwardRef<HTMLSelectElement, RetroSelectProps>(
  ({ className = "", children, ...rest }, ref) => (
    <select
      ref={ref}
      className={[BASE, "min-h-[var(--touch-md)]", className].join(" ")}
      {...rest}
    >
      {children}
    </select>
  )
);
RetroSelect.displayName = "RetroSelect";

export type RetroTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;
export const RetroTextarea = React.forwardRef<HTMLTextAreaElement, RetroTextareaProps>(
  ({ className = "", ...rest }, ref) => (
    <textarea
      ref={ref}
      className={[BASE, className].join(" ")}
      {...rest}
    />
  )
);
RetroTextarea.displayName = "RetroTextarea";
