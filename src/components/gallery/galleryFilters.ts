// galleryFilters.ts — bộ lọc CRT/VHS/GameBoy... dạng pure data (Phase 4).
// CSS filter chain sinh từ token map — component chỉ apply string.

export type VisualFilter = "normal" | "crt" | "vhs" | "gameboy" | "cyber" | "dither" | "marble";

export interface FilterDef {
  id: VisualFilter;
  label: string;
  icon: string;
  desc: string;
}

export const VISUAL_FILTERS: FilterDef[] = [
  { id: "normal", label: "Gốc (Original)", icon: "\u{1F5BC}\uFE0F", desc: "Màu sắc nguyên bản chuẩn xác của tác phẩm" },
  { id: "crt", label: "CRT Monitor 1995", icon: "\u{1F4FA}", desc: "Đường quét scanline & bóng đèn hình Trinitron" },
  { id: "vhs", label: "VHS Tape Glitch", icon: "\u{1F4FC}", desc: "Lệch màu quang sai RGB & vệt tĩnh điện analog" },
  { id: "gameboy", label: "GameBoy 1989", icon: "\u{1F47E}", desc: "Bảng màu 4 sắc độ xanh lá kinh điển của Game Boy" },
  { id: "cyber", label: "Cyberpunk HUD", icon: "\u{1F5DF}\uFE0F", desc: "Kính nhìn đêm neon xanh ngọc & thước đo kỹ thuật" },
  { id: "dither", label: "PC-98 16-Bit", icon: "\u{1F579}\uFE0F", desc: "Hạ bảng màu pixel art sắc nét phong cách máy tính Nhật" },
  { id: "marble", label: "Vapor Marble", icon: "\u{1F3DB}\uFE0F", desc: "Đen trắng tượng thần Hy Lạp ánh tím mơ màng" },
];

export const FILTER_LABEL: Record<VisualFilter, string> = Object.fromEntries(
  VISUAL_FILTERS.map((f) => [f.id, f.label])
) as Record<VisualFilter, string>;

/** CSS filter chain cho từng chế độ — pure, dùng lại ở mọi component. */
export const FILTER_CSS: Record<VisualFilter, string> = {
  normal: "none",
  crt: "saturate(1.25) contrast(1.1) brightness(0.96) sepia(0.08)",
  vhs: "saturate(1.5) contrast(1.15) hue-rotate(-6deg) brightness(1.02)",
  gameboy: "grayscale(1) sepia(1) hue-rotate(60deg) saturate(2.4) contrast(1.1) brightness(0.95)",
  cyber: "saturate(1.6) contrast(1.2) hue-rotate(140deg) brightness(0.9)",
  dither: "contrast(1.35) saturate(0.75) brightness(1.05)",
  marble: "grayscale(1) brightness(1.02) contrast(0.95) sepia(0.12) hue-rotate(220deg) saturate(0.6)",
};

export function filterCss(id: VisualFilter): string {
  return FILTER_CSS[id] ?? "none";
}
