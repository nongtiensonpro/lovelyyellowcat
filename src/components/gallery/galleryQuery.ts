// galleryQuery.ts — pure filter/sort/paginate cho gallery (Phase 4, kế hoạch §4).
// Không DOM — test 100%. Component chỉ đưa data vào và render kết quả.

export interface GalleryItem {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  created_at: string;
  profiles?: { full_name?: string } | null;
}

export type SortMode = "newest" | "reactions" | "random";

export const ALL_TAGS_LABEL = "Tất Cả";

/** Tag list duy nhất, giữ thứ tự xuất hiện, trim, bỏ rỗng. */
export function collectTags(items: GalleryItem[]): string[] {
  const out: string[] = [];
  for (const it of items) {
    if (Array.isArray(it.tags)) {
      for (const raw of it.tags) {
        const tag = raw.trim();
        if (tag && !out.includes(tag)) out.push(tag);
      }
    }
  }
  return out;
}

export function matchesTag(item: GalleryItem, selectedTag: string): boolean {
  if (selectedTag === ALL_TAGS_LABEL) return true;
  return Array.isArray(item.tags) && item.tags.some((t) => t.trim() === selectedTag);
}

export function matchesQuery(item: GalleryItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.title.toLowerCase().includes(q) ||
    (item.profiles?.full_name ?? "").toLowerCase().includes(q) ||
    (item.description ?? "").toLowerCase().includes(q)
  );
}

/** Hash ổn định từ string (djb2) — sort "random" phải deterministic theo session. */
export function stableHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function sortItems(
  items: GalleryItem[],
  mode: SortMode,
  reactionCounts: Record<string, number>,
  seed: string = ""
): GalleryItem[] {
  const copy = [...items];
  switch (mode) {
    case "newest":
      return copy.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    case "reactions":
      return copy.sort((a, b) => (reactionCounts[b.id] || 0) - (reactionCounts[a.id] || 0));
    case "random":
      return copy.sort(
        (a, b) => stableHash(a.id + seed) - stableHash(b.id + seed)
      );
  }
}

/** Pipeline hoàn chỉnh: filter tag + query, rồi sort. */
export function processGalleryItems(
  items: GalleryItem[],
  opts: { selectedTag: string; searchQuery: string; sortBy: SortMode; reactionCounts: Record<string, number>; seed?: string }
): GalleryItem[] {
  const filtered = items.filter(
    (it) => matchesTag(it, opts.selectedTag) && matchesQuery(it, opts.searchQuery)
  );
  return sortItems(filtered, opts.sortBy, opts.reactionCounts, opts.seed);
}

/** Infinite scroll slice — đếm hiển thị theo bước. */
export function paginate<T>(items: T[], visibleCount: number): T[] {
  return items.slice(0, Math.max(0, visibleCount));
}

/** Debounce map cho realtime refetch — tránh fetch lại mỗi event. */
export function shouldRefetch(lastMs: number | null, nowMs: number, minGapMs: number = 250): boolean {
  return lastMs === null || nowMs - lastMs >= minGapMs;
}
