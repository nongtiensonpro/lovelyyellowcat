import { describe, it, expect } from "vitest";
import {
  windowStoreReducer,
  topmostWindow,
  visibleWindows,
  taskbarWindows,
  nextZ,
  type WindowEntry,
} from "../../src/ui/wm95/windowStore";

const VP = { width: 1024, height: 768 };

function w(over: Partial<WindowEntry> = {}): WindowEntry {
  return {
    id: "w1",
    title: "T",
    state: "active",
    rect: { x: 100, y: 100, width: 480, height: 320 },
    z: 100,
    ...over,
  };
}

describe("windowStoreReducer — open/close", () => {
  it("open: thêm cửa sổ mới với z cao nhất", () => {
    const s1 = windowStoreReducer([], { type: "open", entry: w({ id: "a", title: "A" }) }, { viewport: VP });
    expect(s1).toHaveLength(1);
    expect(s1[0].state).toBe("active");
    expect(s1[0].z).toBeGreaterThanOrEqual(101);
  });
  it("open lại id đang có: focus + tăng z, KHÔNG duplicate", () => {
    const s1 = windowStoreReducer([], { type: "open", entry: w({ id: "a" }) }, { viewport: VP });
    const s2 = windowStoreReducer(s1, { type: "open", entry: w({ id: "b" }) }, { viewport: VP });
    const s3 = windowStoreReducer(s2, { type: "open", entry: w({ id: "a" }) }, { viewport: VP });
    expect(s3).toHaveLength(2);
    expect(s3.find((w) => w.id === "a")!.z).toBeGreaterThan(s3.find((w) => w.id === "b")!.z);
  });
  it("close: xóa cửa sổ", () => {
    const s1 = windowStoreReducer([], { type: "open", entry: w({ id: "a" }) }, { viewport: VP });
    const s2 = windowStoreReducer(s1, { type: "close", id: "a" }, { viewport: VP });
    expect(s2).toHaveLength(0);
  });
  it("close id lạ là no-op", () => {
    const s1 = windowStoreReducer([], { type: "open", entry: w({ id: "a" }) }, { viewport: VP });
    const s2 = windowStoreReducer(s1, { type: "close", id: "ghost" }, { viewport: VP });
    expect(s2).toHaveLength(1);
  });
});

describe("windowStoreReducer — focus/min/max/restore", () => {
  it("focus: tăng z của id", () => {
    const s = windowStoreReducer([], { type: "open", entry: w({ id: "a" }) }, { viewport: VP });
    const z1 = s[0].z;
    const s2 = windowStoreReducer(s, { type: "focus", id: "a" }, { viewport: VP });
    expect(s2[0].z).toBeGreaterThan(z1);
  });
  it("minimize: chuyển state minimized", () => {
    const s = windowStoreReducer([], { type: "open", entry: w({ id: "a" }) }, { viewport: VP });
    const s2 = windowStoreReducer(s, { type: "minimize", id: "a" }, { viewport: VP });
    expect(s2[0].state).toBe("minimized");
  });
  it("toggleMaximize: classic -> max -> classic", () => {
    const s = windowStoreReducer([], { type: "open", entry: w({ id: "a" }) }, { viewport: VP });
    expect(s[0].state).toBe("active");
    const s2 = windowStoreReducer(s, { type: "toggleMaximize", id: "a" }, { viewport: VP });
    expect(s2[0].state).toBe("maximized");
    const s3 = windowStoreReducer(s2, { type: "toggleMaximize", id: "a" }, { viewport: VP });
    expect(s3[0].state).toBe("active");
  });
  it("focus cửa sổ đang minimize: restore + bring to front", () => {
    const s = windowStoreReducer([], { type: "open", entry: w({ id: "a" }) }, { viewport: VP });
    const s2 = windowStoreReducer(s, { type: "minimize", id: "a" }, { viewport: VP });
    const s3 = windowStoreReducer(s2, { type: "focus", id: "a" }, { viewport: VP });
    expect(s3[0].state).toBe("active");
  });
  it("restore: giống focus", () => {
    const s = windowStoreReducer([], { type: "open", entry: w({ id: "a" }) }, { viewport: VP });
    const s2 = windowStoreReducer(s, { type: "minimize", id: "a" }, { viewport: VP });
    const s3 = windowStoreReducer(s2, { type: "restore", id: "a" }, { viewport: VP });
    expect(s3[0].state).toBe("active");
  });
});

describe("windowStoreReducer — move/resize clamp viewport", () => {
  it("move: clamp x/y vào viewport (luôn thấy titlebar)", () => {
    const s = windowStoreReducer([], { type: "open", entry: w({ id: "a", rect: { x: -500, y: -500, width: 480, height: 320 } }) }, { viewport: VP });
    expect(s[0].rect.x).toBeGreaterThanOrEqual(16 - 80);
    expect(s[0].rect.y).toBeGreaterThanOrEqual(16);
  });
  it("resize: min 240x160, max viewport-margin*2", () => {
    const s = windowStoreReducer([], { type: "open", entry: w({ id: "a" }) }, { viewport: VP });
    const s2 = windowStoreReducer(s, { type: "resize", id: "a", to: { width: 50, height: 50 } }, { viewport: VP });
    expect(s2[0].rect.width).toBeGreaterThanOrEqual(240);
    expect(s2[0].rect.height).toBeGreaterThanOrEqual(160);
  });
  it("resize: không cho rộng hơn viewport - margin*2", () => {
    const s = windowStoreReducer([], { type: "open", entry: w({ id: "a" }) }, { viewport: VP });
    const s2 = windowStoreReducer(s, { type: "resize", id: "a", to: { width: 9999, height: 9999 } }, { viewport: VP });
    expect(s2[0].rect.width).toBeLessThanOrEqual(VP.width - 32);
  });
});

describe("windowStoreReducer — snap", () => {
  it("snap left: chiếm nửa trái viewport", () => {
    const s = windowStoreReducer([], { type: "open", entry: w({ id: "a" }) }, { viewport: VP });
    const s2 = windowStoreReducer(s, { type: "snap", id: "a", zone: "left" }, { viewport: VP });
    expect(s2[0].rect.x).toBe(16);
    expect(s2[0].rect.y).toBe(16);
  });
  it("snap right: chiếm nửa phải", () => {
    const s = windowStoreReducer([], { type: "open", entry: w({ id: "a" }) }, { viewport: VP });
    const s2 = windowStoreReducer(s, { type: "snap", id: "a", zone: "right" }, { viewport: VP });
    expect(s2[0].rect.x).toBeGreaterThan(VP.width / 2);
  });
  it("snap top: chiếm nửa trên", () => {
    const s = windowStoreReducer([], { type: "open", entry: w({ id: "a" }) }, { viewport: VP });
    const s2 = windowStoreReducer(s, { type: "snap", id: "a", zone: "top" }, { viewport: VP });
    expect(s2[0].rect.height).toBeLessThan(VP.height / 2);
  });
  it("snap topleft: 1/4 viewport", () => {
    const s = windowStoreReducer([], { type: "open", entry: w({ id: "a" }) }, { viewport: VP });
    const s2 = windowStoreReducer(s, { type: "snap", id: "a", zone: "topleft" }, { viewport: VP });
    expect(s2[0].rect.width).toBeLessThan(VP.width / 2);
    expect(s2[0].rect.height).toBeLessThan(VP.height / 2);
  });
});

describe("helpers", () => {
  it("topmostWindow: cửa sổ có z cao nhất (state active) và không có modalParent", () => {
    const s = windowStoreReducer([], { type: "open", entry: w({ id: "a" }) }, { viewport: VP });
    const s2 = windowStoreReducer(s, { type: "open", entry: w({ id: "b" }) }, { viewport: VP });
    const s3 = windowStoreReducer(s2, { type: "focus", id: "a" }, { viewport: VP });
    expect(topmostWindow(s3)?.id).toBe("a");
  });
  it("topmostWindow: ẩn cửa sổ modalParent (chờ user xử lý)", () => {
    const s = windowStoreReducer([], { type: "open", entry: w({ id: "a" }) }, { viewport: VP });
    const s2 = windowStoreReducer(s, { type: "open", entry: w({ id: "modal", modalParentId: "modal" }) }, { viewport: VP });
    const top = topmostWindow(s2);
    expect(top?.id).toBe("a");
  });
  it("visibleWindows: bao gồm active + maximized, sắp xếp z tăng dần (vẽ dưới → trên)", () => {
    const s = windowStoreReducer([], { type: "open", entry: w({ id: "a" }) }, { viewport: VP });
    const s2 = windowStoreReducer(s, { type: "open", entry: w({ id: "b" }) }, { viewport: VP });
    const list = visibleWindows(s2);
    expect(list.length).toBe(2);
    expect(list[0].z).toBeLessThanOrEqual(list[1].z);
  });
  it("taskbarWindows: bao gồm cả active + minimized", () => {
    const s = windowStoreReducer([], { type: "open", entry: w({ id: "a" }) }, { viewport: VP });
    const s2 = windowStoreReducer(s, { type: "open", entry: w({ id: "b" }) }, { viewport: VP });
    const s3 = windowStoreReducer(s2, { type: "minimize", id: "a" }, { viewport: VP });
    const list = taskbarWindows(s3);
    expect(list.length).toBe(2);
    expect(list.find((w) => w.id === "a")?.state).toBe("minimized");
  });
  it("nextZ: tăng đơn điệu, không trùng", () => {
    const a = nextZ(); const b = nextZ(); const c = nextZ();
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });
});
