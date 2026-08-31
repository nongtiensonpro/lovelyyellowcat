// wordpadState.ts — pure logic cho WordPad toolbar (Phase 5, kế hoạch §5).
// Tách từ articles/[slug].astro script block — test 100% không cần DOM.

export type WpAlign = "left" | "center" | "right" | "justify";

export interface WordPadState {
  nightMode: boolean;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  align: WpAlign;
  zoom: number; // 70..150, bước 10
}

export const ZOOM_MIN = 70;
export const ZOOM_MAX = 150;
export const ZOOM_STEP = 10;

export const INITIAL_WORDPAD: WordPadState = {
  nightMode: false,
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  align: "left",
  zoom: 100,
};

/** text-decoration tổng hợp từ underline + strike (logic cũ từng là ternary lặp 2 chỗ). */
export function textDecorationFor(s: Pick<WordPadState, "underline" | "strike">): string {
  if (s.underline && s.strike) return "underline line-through";
  if (s.underline) return "underline";
  if (s.strike) return "line-through";
  return "";
}

/** Zoom clamp + bước. */
export function zoomStep(zoom: number, direction: "in" | "out"): number {
  const next = direction === "in" ? zoom + ZOOM_STEP : zoom - ZOOM_STEP;
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next));
}

/** Style transform cho khung tài liệu khi zoom (giữ công thức cũ 10000/zoom). */
export function zoomStyleFor(zoom: number): { transform: string; transformOrigin: string; width: string } {
  return {
    transform: `scale(${zoom / 100})`,
    transformOrigin: "top left",
    width: `${10000 / zoom}%`,
  };
}

const ALIGN_LABEL: Record<WpAlign, string> = { left: "Trái", center: "Giữa", right: "Phải", justify: "Đều" };

/** Chuỗi statusbar "Định dạng: ..." — same format như bản cũ. */
export function formatStatusFor(s: WordPadState): string {
  const parts: string[] = [];
  if (s.bold) parts.push("Đậm");
  if (s.italic) parts.push("Nghiêng");
  if (s.underline) parts.push("Gạch chân");
  if (s.strike) parts.push("Gạch ngang");
  if (s.nightMode) parts.push("\u{1F319} Đêm");
  if (s.align !== "left") parts.push(`Căn: ${ALIGN_LABEL[s.align]}`);
  if (s.zoom !== 100) parts.push(`${s.zoom}%`);
  return parts.length > 0 ? parts.join(" · ") : "Định dạng: Mặc định";
}

/** Đếm từ (giống logic cũ — split trên whitespace, bỏ chuỗi rỗng). */
export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}
