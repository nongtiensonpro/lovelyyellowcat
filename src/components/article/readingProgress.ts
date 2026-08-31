// readingProgress.ts — pure tính toán thanh tiến độ đọc (Phase 5).

/** % tiến độ đọc: scrollY / (scrollHeight - viewportHeight). Clamp 0..100. */
export function readingProgressPct(scrollY: number, viewportH: number, scrollHeight: number): number {
  const total = scrollHeight - viewportH;
  if (total <= 0) return 0;
  return Math.min((scrollY / total) * 100, 100);
}
