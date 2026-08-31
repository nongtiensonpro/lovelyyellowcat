import { describe, it, expect } from "vitest";
import {
  zoomTo, zoomIn, zoomOut, panTo, rotate, flipH, transformToCss, zoomPercent,
  INITIAL_TRANSFORM, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP,
  type TransformState,
} from "../../src/components/gallery/galleryTransform";

const st = (over: Partial<TransformState> = {}): TransformState => ({
  ...INITIAL_TRANSFORM,
  ...over,
  pan: { ...INITIAL_TRANSFORM.pan, ...(over.pan ?? {}) },
});

describe("zoomTo", () => {
  it("clamp vào [0.8, 4.0]", () => {
    expect(zoomTo(st(), 99).zoom).toBe(ZOOM_MAX);
    expect(zoomTo(st(), -5).zoom).toBe(ZOOM_MIN);
  });
  it("zoom ≤ 1 reset pan về 0,0", () => {
    const r = zoomTo(st({ zoom: 2, pan: { x: 40, y: -30 } }), 0.9);
    expect(r.zoom).toBe(0.9);
    expect(r.pan).toEqual({ x: 0, y: 0 });
  });
  it("zoom > 1 giữ pan", () => {
    const r = zoomTo(st({ zoom: 2, pan: { x: 40, y: -30 } }), 2.5);
    expect(r.pan).toEqual({ x: 40, y: -30 });
  });
});

describe("zoomIn/zoomOut", () => {
  it("tăng/giảm đúng ZOOM_STEP", () => {
    expect(zoomIn(st()).zoom).toBeCloseTo(1 + ZOOM_STEP, 2);
  });
  it("zoomOut từ 1: clamp về ZOOM_MIN và reset pan", () => {
    const r = zoomOut(st());
    expect(r.zoom).toBe(ZOOM_MIN);
    expect(r.pan).toEqual({ x: 0, y: 0 });
  });
  it("in liên tiếp không vượt ZOOM_MAX", () => {
    let s = st();
    for (let i = 0; i < 20; i++) s = zoomIn(s);
    expect(s.zoom).toBe(ZOOM_MAX);
  });
});

describe("panTo", () => {
  it("zoom ≤ 1: bỏ qua pan (trả state nguyên vẹn)", () => {
    const s = st({ zoom: 1 });
    const r = panTo(s, 10, 20);
    expect(r).toBe(s); // cùng tham chiếu — không clone thừa
  });
  it("zoom > 1: pan theo tham số", () => {
    const r = panTo(st({ zoom: 2 }), 10, 20);
    expect(r.pan).toEqual({ x: 10, y: 20 });
  });
});

describe("rotate/flipH", () => {
  it("rotate wrap 0→90→180→270→0", () => {
    let s = st();
    const seq: number[] = [];
    for (let i = 0; i < 4; i++) { s = rotate(s); seq.push(s.rotation); }
    expect(seq).toEqual([90, 180, 270, 0]);
  });
  it("flipH toggle", () => {
    expect(flipH(st()).flipH).toBe(true);
    expect(flipH(flipH(st())).flipH).toBe(false);
  });
});

describe("transformToCss", () => {
  it("ghép translate/scale/rotate", () => {
    const css = transformToCss(st({ zoom: 1.5, pan: { x: 10, y: -5 }, rotation: 90 }));
    expect(css).toContain("translate(10px, -5px)");
    expect(css).toContain("scale(1.5)");
    expect(css).toContain("rotate(90deg)");
  });
  it("flipH thêm scaleX(-1)", () => {
    expect(transformToCss(st({ flipH: true }))).toContain("scaleX(-1)");
  });
});

describe("zoomPercent", () => {
  it("1.35 → 135", () => {
    expect(zoomPercent(1.35)).toBe(135);
  });
});
