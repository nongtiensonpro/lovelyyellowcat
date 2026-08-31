// fonts.ts — tập trung font policy (kế hoạch §2.2, §4.2).
// Phase 2: vẫn dùng Google Fonts CDN với preconnect + display=swap (giảm FOUT).
// Phase 9: chuyển sang self-host với subset Latin-Vietnamese nếu perf budget yêu cầu.

/** URL Google Fonts load 3 họ: VT323 (pixel + tiếng Việt), Press Start 2P (decor), JetBrains Mono (UI). */
export const fmFontHref =
  "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Press+Start+2P&family=VT323&display=swap";

/** Key 3 họ font — dùng tham chiếu Tailwind theme, khi self-host đổi sang woff2. */
export const FM_FONT_FAMILIES = ["vt323", "press-start-2p", "jetbrains-mono"] as const;
export type FmFontFamily = (typeof FM_FONT_FAMILIES)[number];
