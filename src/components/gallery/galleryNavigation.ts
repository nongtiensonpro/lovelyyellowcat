// galleryNavigation.ts — pure navigation math (Phase 4).
// Wrap-around index + autoplay timing — không DOM.

export function nextIndex(current: number, length: number): number {
  if (length <= 0) return -1;
  return (current + 1) % length;
}

export function prevIndex(current: number, length: number): number {
  if (length <= 0) return -1;
  return (current - 1 + length) % length;
}

export function indexOfId(items: Array<{ id: string }>, id: string | null): number {
  if (!id) return -1;
  return items.findIndex((it) => it.id === id);
}

/** Progress % của autoplay (elapsed ms so với duration). Clamp 0..100. */
export function autoplayProgress(elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  return Math.min((elapsedMs / durationMs) * 100, 100);
}

/** Preload neighbors: trả về 2 URL (next/prev) không trùng với hiện tại và không trùng nhau. */
export function neighborUrls(current: number, urls: string[]): string[] {
  const out: string[] = [];
  if (urls.length < 2) return out;
  for (const idx of [nextIndex(current, urls.length), prevIndex(current, urls.length)]) {
    const u = urls[idx];
    if (u && u !== urls[current] && !out.includes(u)) out.push(u);
  }
  return out;
}
