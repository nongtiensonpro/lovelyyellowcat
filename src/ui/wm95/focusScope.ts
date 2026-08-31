// focusScope.ts — adapter gọn: bind/unbind focus trap cho window entry.
// Phase 3 dùng tạm logic đơn giản (restore previous focus) cho cửa sổ.
const prevFocusStack: HTMLElement[] = [];

export function focusScope(ref: { current: HTMLElement | null }, active: boolean): () => void {
  if (!active) return () => {};
  const container = ref.current;
  if (!container) return () => {};
  const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  if (prev) prevFocusStack.push(prev);
  // focus first focusable
  const focusable = container.querySelector<HTMLElement>(
    "a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])"
  );
  (focusable ?? container).focus();
  return () => {
    const last = prevFocusStack.pop();
    last?.focus?.();
  };
}
