// announcementsFx.test.ts — test pure logic ANNOUNCE.FX v2 (accent/icon/fx).
import { describe, it, expect } from "vitest";
import {
  ANNOUNCE_ACCENTS,
  ANNOUNCE_FX,
  ANNOUNCE_ICONS,
  normalizeAccent,
  normalizeFx,
  normalizeIcon,
  accentClassFor,
  fxClassFor,
  iconFor,
  marqueeFxTextFrom,
  type AnnouncementLike,
} from "../../src/lib/announcementUtils";

describe("ANNOUNCE.FX — normalize", () => {
  it("accent hợp lệ giữ nguyên, lạ → null", () => {
    for (const a of ANNOUNCE_ACCENTS) expect(normalizeAccent(a)).toBe(a);
    expect(normalizeAccent("gold")).toBeNull();
    expect(normalizeAccent(null)).toBeNull();
    expect(normalizeAccent(undefined)).toBeNull();
    expect(normalizeAccent("")).toBeNull();
    expect(normalizeAccent("PINK")).toBeNull(); // case-sensitive, chống lỏng
  });

  it("fx hợp lệ giữ nguyên, lạ → null", () => {
    for (const f of ANNOUNCE_FX) expect(normalizeFx(f)).toBe(f);
    expect(normalizeFx("glow")).toBeNull();
    expect(normalizeFx(null)).toBeNull();
  });

  it("icon theo value; auto/rỗng → null; lạ → null", () => {
    expect(normalizeIcon("star")?.label).toBe("⭐");
    expect(normalizeIcon("auto")).toBeNull();
    expect(normalizeIcon("")).toBeNull();
    expect(normalizeIcon("unicorn")).toBeNull();
    expect(normalizeIcon(null)).toBeNull();
    // 12 icon, mỗi icon có label + value duy nhất
    expect(ANNOUNCE_ICONS.length).toBe(12);
    expect(new Set(ANNOUNCE_ICONS.map((i) => i.value)).size).toBe(12);
  });
});

describe("ANNOUNCE.FX — class builders", () => {
  it("accentClassFor → token Tailwind vapor-*", () => {
    expect(accentClassFor("pink")).toBe("text-vapor-pink");
    expect(accentClassFor("green")).toBe("text-vapor-green");
    expect(accentClassFor(null)).toBe("");
    expect(accentClassFor("nope")).toBe("");
  });

  it("fxClassFor → ann-fx-*; none/rỗng → chuỗi rỗng", () => {
    expect(fxClassFor("neon")).toBe("ann-fx-neon");
    expect(fxClassFor("chromatic")).toBe("ann-fx-chromatic");
    expect(fxClassFor("rainbow")).toBe("ann-fx-rainbow");
    expect(fxClassFor("blink")).toBe("ann-fx-blink");
    expect(fxClassFor("none")).toBe("");
    expect(fxClassFor(null)).toBe("");
    expect(fxClassFor("weird")).toBe("");
  });
});

describe("ANNOUNCE.FX — iconFor theo type", () => {
  const base: AnnouncementLike = { id: "x", title: "T" };
  it("icon mặc định theo type khi không chọn", () => {
    expect(iconFor({ ...base, type: "popup" })).toBe("📢");
    expect(iconFor({ ...base, type: "banner" })).toBe("🚩");
    expect(iconFor({ ...base, type: "marquee" })).toBe("📣");
    expect(iconFor(base)).toBe("📣"); // type null/undefined → marquee fallback
  });
  it("icon chọn thủ công đè mặc định", () => {
    expect(iconFor({ ...base, type: "popup", icon: "party" })).toBe("🎉");
    expect(iconFor({ ...base, type: "banner", icon: "auto" })).toBe("🚩"); // auto → mặc định
  });
});

describe("ANNOUNCE.FX — marquee text", () => {
  it("không icon → giống marqueeTextFrom cũ", () => {
    const a: AnnouncementLike = { id: "x", title: "Bảo trì", body: "22h", type: "marquee" };
    expect(marqueeFxTextFrom(a)).toBe("[THÔNG BÁO] Bảo trì — 22h");
  });
  it("có icon → prefix đầu dòng", () => {
    const a: AnnouncementLike = { id: "x", title: "Sự kiện", type: "marquee", icon: "party" };
    expect(marqueeFxTextFrom(a)).toBe("🎉 [THÔNG BÁO] Sự kiện");
  });
});
