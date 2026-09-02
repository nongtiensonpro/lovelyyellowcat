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
  /** ANNOUNCE.FX v2 — màu nhấn/icon/hiệu ứng (nullable, null = hành vi mặc định cũ). */
  accent?: string | null;
  icon?: string | null;
  fx?: string | null;
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
// ─────────────────────────────────────────────────────────────
// ANNOUNCE.FX v2 — accent (màu chữ) + icon (ký hiệu) + fx (hiệu ứng)
// Màu chỉ dùng token Tailwind vapor-* có sẵn — không hex mới (ratchet policy:ui).
// ─────────────────────────────────────────────────────────────

/** Palette accent hợp lệ — khớp token --color-vapor-*. */
export const ANNOUNCE_ACCENTS = ["pink", "blue", "purple", "green", "yellow", "orange"] as const;
export type AnnouncementAccent = (typeof ANNOUNCE_ACCENTS)[number];

/** Hiệu ứng chữ hợp lệ. */
export const ANNOUNCE_FX = ["none", "neon", "chromatic", "rainbow", "blink"] as const;
export type AnnouncementFx = (typeof ANNOUNCE_FX)[number];

/** Bộ ký hiệu đặc biệt admin chọn được (Auto = để trống, dùng icon mặc định theo type). */
export const ANNOUNCE_ICONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "megaphone", label: "📣" },
  { value: "bullhorn", label: "📢" },
  { value: "warning", label: "⚠️" },
  { value: "party", label: "🎉" },
  { value: "wrench", label: "🔧" },
  { value: "bulb", label: "💡" },
  { value: "pin", label: "📌" },
  { value: "heart", label: "❤️" },
  { value: "star", label: "⭐" },
  { value: "dot", label: "🔴" },
  { value: "frame", label: "🖼️" },
  { value: "window", label: "🪟" },
];

/** Chuẩn hoá accent; giá trị lạ → null (fallback hành vi cũ). */
export function normalizeAccent(v: string | null | undefined): AnnouncementAccent | null {
  return ANNOUNCE_ACCENTS.includes(v as AnnouncementAccent) ? (v as AnnouncementAccent) : null;
}

/** Chuẩn hoá fx; giá trị lạ → null. */
export function normalizeFx(v: string | null | undefined): AnnouncementFx | null {
  return ANNOUNCE_FX.includes(v as AnnouncementFx) ? (v as AnnouncementFx) : null;
}

/** Chuẩn hoá icon theo value ("auto"/"" → null → icon mặc định theo type). */
export function normalizeIcon(v: string | null | undefined): { value: string; label: string } | null {
  const x = v?.trim();
  if (!x || x === "auto") return null;
  return ANNOUNCE_ICONS.find((i) => i.value === x) ?? null;
}

/** Class màu Tailwind theo accent (token vapor-*). */
export function accentClassFor(accent: string | null | undefined): string {
  const a = normalizeAccent(accent);
  return a ? `text-vapor-${a}` : "";
}

/** Class hiệu ứng CSS (định nghĩa trong global.css, tôn trọng reduced-motion). */
export function fxClassFor(fx: string | null | undefined): string {
  const f = normalizeFx(fx);
  if (!f || f === "none") return "";
  return `ann-fx-${f}`;
}

/** Icon hiển thị cho thông báo: icon chọn thủ công > icon mặc định theo type. */
export function iconFor(a: AnnouncementLike): string {
  const manual = normalizeIcon(a.icon);
  if (manual) return manual.label;
  const t = normalizeType(a.type);
  if (t === "popup") return "📢";
  if (t === "banner") return "🚩";
  return "📣";
}

/** Text chạy marquee có icon đầu dòng khi announcement có icon/accent tuỳ chỉnh. */
export function marqueeFxTextFrom(a: AnnouncementLike): string {
  const icon = normalizeIcon(a.icon);
  const prefix = icon ? `${icon.label} ` : "";
  return `${prefix}${marqueeTextFrom(a)}`;
}
