// adminTable.ts — pure helpers cho bảng dữ liệu admin (Phase 7, kế hoạch §7).
// Tách pattern lặp trong comments/users/articles/submissions: query params, pagination,
// buildUrl giữ query, bulk selection. Không DOM, không React — test 100%.

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Parse page param an toàn: NaN/<1 → 1. */
export function parsePage(raw: string | null | undefined): number {
  const n = parseInt(raw || "", 10);
  if (Number.isNaN(n) || n < 1) return 1;
  return Math.min(n, 1_000_000);
}

/** Parse page size clamp [1, MAX_PAGE_SIZE], mặc định DEFAULT. */
export function parsePageSize(raw: string | null | undefined): number {
  const n = parseInt(raw || "", 10);
  if (Number.isNaN(n) || n < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(n, MAX_PAGE_SIZE);
}

export interface PageCalc {
  page: number;
  from: number;
  to: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: number | false;
}

/** Tính pagination từ tổng số item. total<=0 → 1 trang rỗng. */
export function calcPage(total: number, page: number, pageSize: number = DEFAULT_PAGE_SIZE): PageCalc {
  const totalPages = Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = (safePage - 1) * pageSize;
  return {
    page: safePage,
    from,
    to: from + pageSize - 1,
    totalPages,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages ? safePage + 1 : false,
  };
}

/** buildUrl giữ query: set param có giá trị, xóa param rỗng — same behavior bản cũ. */
export function buildAdminUrl(pathname: string, origin: string, params: Record<string, string | number | undefined | null>): string {
  const u = new URL(pathname, origin);
  for (const [k, v] of Object.entries(params)) {
    const s = v === undefined || v === null ? "" : String(v).trim();
    if (s) u.searchParams.set(k, s);
    else u.searchParams.delete(k);
  }
  return u.pathname + u.search;
}

// ── Bulk selection (pure logic) ──

/** Toggle 1 id trong Set-like array (thứ tự giữ nguyên, không trùng). */
export function toggleSelection(selected: string[], id: string): string[] {
  return selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
}

/** Toggle all: nếu tất cả đang chọn → bỏ hết; ngược lại chọn toàn bộ ids hiện thị. */
export function toggleAllSelection(selected: string[], visibleIds: string[]): string[] {
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  return allSelected ? [] : [...visibleIds];
}

/** Chỉ giữ id còn tồn tại trong danh sách hiện tại (sau khi data refetch). */
export function reconcileSelection(selected: string[], visibleIds: string[]): string[] {
  const set = new Set(visibleIds);
  return selected.filter((id) => set.has(id));
}

/** Search tokenize: lowercase, trim, nhiều từ → mọi từ phải khớp (AND). */
export function matchesAdminSearch(haystacks: Array<string | undefined | null>, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const tokens = q.split(/\s+/);
  const joined = haystacks.filter(Boolean).join(" ").toLowerCase();
  return tokens.every((tk) => joined.includes(tk));
}

/** Sort đa cột 1 cấp: key + direction, số/Chuỗi/date tự nhận. */
export type SortDirection = "asc" | "desc";
export function sortByKey<T extends Record<string, unknown>>(items: T[], key: keyof T, direction: SortDirection = "asc"): T[] {
  const copy = [...items];
  const mul = direction === "asc" ? 1 : -1;
  return copy.sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av === bv) return 0;
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * mul;
    const as = String(av);
    const bs = String(bv);
    // date-like ISO strings
    if (/^\d{4}-\d{2}-\d{2}/.test(as) && /^\d{4}-\d{2}-\d{2}/.test(bs)) {
      return (new Date(as).getTime() - new Date(bs).getTime()) * mul;
    }
    return as.localeCompare(bs, "vi") * mul;
  });
}
