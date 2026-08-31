import { describe, it, expect } from "vitest";
import { decideHeroVideo } from "../../src/ui/services/mediaPolicy";

const base = { saveData: false, reducedMotionMedia: false, viewportWidth: 1280 };

describe("decideHeroVideo", () => {
  it("mobile viewport: chỉ poster, không tải", () => {
    const d = decideHeroVideo({ ...base, viewportWidth: 375 });
    expect(d.shouldPlay).toBe(false);
    expect(d.shouldPreload).toBe("metadata");
    expect(d.shouldShowPoster).toBe(true);
    expect(d.reason).toContain("mobile");
  });
  it("saveData: poster only", () => {
    const d = decideHeroVideo({ ...base, saveData: true });
    expect(d.shouldPlay).toBe(false);
    expect(d.shouldPreload).toBe("metadata");
  });
  it("reduced motion: poster only", () => {
    const d = decideHeroVideo({ ...base, reducedMotionMedia: true });
    expect(d.shouldPlay).toBe(false);
  });
  it("access mode: poster only (fx-off)", () => {
    const d = decideHeroVideo({ ...base, uiMode: "access" });
    expect(d.shouldPlay).toBe(false);
    expect(d.shouldPreload).toBe("none");
    expect(d.reason).toContain("fx-off");
  });
  it("desktop + cap tốt + không reduce: play", () => {
    const d = decideHeroVideo(base);
    expect(d.shouldPlay).toBe(true);
    expect(d.shouldPreload).toBe("auto");
  });
  it("CRT + desktop: vẫn play", () => {
    const d = decideHeroVideo({ ...base, uiMode: "crt" });
    expect(d.shouldPlay).toBe(true);
  });
});
