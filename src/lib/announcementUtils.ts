// announcementUtils.ts — pure logic cho hệ thống Thông Báo (WinPopup Station).
// Tách khỏi layout/component để unit test 100% (bài học gallery: logic trong
// pure module, component chỉ orchestrate).

export interface AnnouncementLike {
  id: string;
  title: string;
  body?: string | null;
  type?: string | null;
  is_active?: boolean | null;
  end_at?: string | null;
  created_at?: string | null;
}

export type AnnouncementType = "banner" | "marquee" | "popup";
export const ANNOUNCEMENT_TYPES: AnnouncementType[] = ["banner", "marquee", "popup"];

/** Chuẩn hoá type; giá trị lạ → null (bỏ qua khi render). */
export function normalizeType(t: string | null | undefined): AnnouncementType | null {
  return ANNOUNCEMENT_TYPES.includes(t as AnnouncementType) ? (t as AnnouncementType) : null;
}

/** Đã hết hạn chưa? end_at null = không hết hạn. */
export function isExpired(endAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!endAt) return false;
  const d = new Date(endAt);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() <= now.getTime();
}

/** Lọc danh sách thành các thông báo đang "phát được": active, đúng type, chưa hết hạn. */
export function filterLive(items: AnnouncementLike[], now: Date = new Date()): AnnouncementLike[] {
  return items.filter(
    (a) => a.is_active === true && !isExpired(a.end_at, now) && normalizeType(a.type) !== null,
  );
}

/**
 * Chia danh sách live theo loại, mỗi loại mới nhất trước (đầu vào đã sort
 * created_at desc). Popup chỉ lấy 1 (mới nhất) — spec "một lần".
 */
export function partitionByType(
  items: AnnouncementLike[],
  now: Date = new Date(),
): {
  marquee: AnnouncementLike | null;
  banner: AnnouncementLike | null;
  popup: AnnouncementLike | null;
} {
  const live = filterLive(items, now);
  const firstOf = (t: AnnouncementType) => live.find((a) => normalizeType(a.type) === t) ?? null;
  return { marquee: firstOf("marquee"), banner: firstOf("banner"), popup: firstOf("popup") };
}

/** Text chạy trên marquee khi có announcement. */
export function marqueeTextFrom(a: AnnouncementLike): string {
  const body = a.body?.trim();
  return `[THÔNG BÁO] ${a.title}${body ? ` — ${body}` : ""}`;
}

/** Key sessionStorage cho dismiss một lần theo id (popup/banner). */
export function dismissKey(id: string): string {
  return `lyc_ann_dismissed_${id}`;
}

/** Token cho data-attribute: chỉ cho phép ký tự an toàn. */
export function safeIdToken(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}
