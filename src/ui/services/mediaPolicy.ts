// mediaPolicy.ts — quyết định media playback dựa trên FXBudget (ADR-0003, kế hoạch §2.3).
// Thuần logic: dùng cho tất cả <video>/<img> có policy. DOM sẽ tự áp dụng.

import { computeFxLevel, readCapability, type FxInputs } from "./fxAbility";

export interface HeroVideoOptions {
  saveData: boolean;
  reducedMotionMedia: boolean;
  viewportWidth: number;
  /** override fxBudget từ preference (nếu muốn). */
  uiMode?: "catalog" | "crt" | "access";
  motionPref?: "system" | "on" | "off";
}

export interface HeroVideoDecision {
  shouldPlay: boolean;
  shouldPreload: "auto" | "metadata" | "none";
  shouldShowPoster: boolean;
  reason: string;
}

/** Quyết định chính sách cho video hero (6MB → tiết kiệm 1-2MB LCP mobile). */
export function decideHeroVideo(opts: HeroVideoOptions): HeroVideoDecision {
  const base: FxInputs = {
    uiMode: opts.uiMode ?? "catalog",
    motionPref: opts.motionPref ?? "system",
    reducedMotionMedia: opts.reducedMotionMedia,
    ...readCapability(),
    saveData: opts.saveData || (readCapability().saveData ?? false),
  };
  const level = computeFxLevel(base);

  // ACCESS mode + reduced motion + Save-Data + máy yếu => poster + metadata only
  if (level === "off") {
    return { shouldPlay: false, shouldPreload: "none", shouldShowPoster: true, reason: "fx-off: poster only" };
  }
  if (opts.saveData || opts.reducedMotionMedia) {
    return { shouldPlay: false, shouldPreload: "metadata", shouldShowPoster: true, reason: "save-data or reduced-motion" };
  }
  if (opts.viewportWidth < 640) {
    return { shouldPlay: false, shouldPreload: "metadata", shouldShowPoster: true, reason: "mobile viewport" };
  }
  if (level === "low") {
    return { shouldPlay: false, shouldPreload: "metadata", shouldShowPoster: true, reason: "fx-low" };
  }
  return { shouldPlay: true, shouldPreload: "auto", shouldShowPoster: true, reason: "fx-medium/high" };
}

/** Sinh poster URL từ Cloudinary transform trên video frame (tùy dự án). */
export function videoPosterFromSrc(src: string, opts?: { width?: number; format?: "jpg" | "webp" }): string {
  const w = opts?.width ?? 800;
  const fmt = opts?.format ?? "webp";
  // Cloudinary video: /video/upload/{transforms}/{publicId}.{ext}
  // Poster: lấy frame đầu tiên bằng cách đổi extension sang image
  if (src.includes("/upload/")) {
    // chèn transform w_<width> trước extension — Cloudinary sinh poster frame đầu ở đúng kích thước
    return src
      .replace(/\.(mp4|webm|mov)(\?.*)?$/, "")
      .replace("/video/", "/image/")
      + `,w_${w}.${fmt}`;
  }
  return src;
}
