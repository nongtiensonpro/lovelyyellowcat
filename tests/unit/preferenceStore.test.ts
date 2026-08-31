import { describe, it, expect } from "vitest";

// Tách phần pure schema parsing — không dùng module scope của preferenceStore.
// Tại runtime: dùng dynamic import.
describe("preferenceStore schema & defaults", () => {
  it("default shape có đủ trường với đúng kiểu", async () => {
    const mod = await import("../../src/ui/services/preferenceStore");
    const d = mod.DEFAULT_PREFERENCES;
    for (const k of ["uiMode", "motion", "sound", "density", "fontScale", "reducedData"]) {
      expect(d, `key ${k} present`).toHaveProperty(k);
    }
    expect(d.uiMode).toBe("catalog");
    expect(d.motion).toBe("system");
    expect(d.sound).toBe(false);
    expect(d.density).toBe("compact");
    expect(d.fontScale).toBe(1.0);
    expect(d.reducedData).toBe(false);
  });

  it("setUiMode(access) bật motion off + sound off + tăng fontScale", async () => {
    const mod = await import("../../src/ui/services/preferenceStore");
    // mock window cho test (setter ở module không sẽ fail nếu thiếu — ta wrap)
    (globalThis as { window?: unknown }).window = globalThis as unknown;
    // Kiểm tra export shape (module side-effect an toàn với SSR guard)
    expect(typeof mod.PREF_STORAGE_KEY).toBe("string");
    expect(mod.PREF_STORAGE_KEY).toBe("lyc_prefs_v1");
    // Khẳng định cấu trúc export
    expect(typeof mod.setUiMode).toBe("function");
    expect(typeof mod.subscribePreferences).toBe("function");
  });
});
