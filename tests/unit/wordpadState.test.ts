import { describe, it, expect } from "vitest";
import {
  textDecorationFor, zoomStep, zoomStyleFor, formatStatusFor, wordCount,
  INITIAL_WORDPAD, ZOOM_MIN, ZOOM_MAX,
} from "../../src/components/article/wordpadState";

describe("textDecorationFor", () => {
  it("kết hợp underline + strike", () => {
    expect(textDecorationFor({ underline: true, strike: true })).toBe("underline line-through");
  });
  it("đơn lẻ", () => {
    expect(textDecorationFor({ underline: true, strike: false })).toBe("underline");
    expect(textDecorationFor({ underline: false, strike: true })).toBe("line-through");
  });
  it("không có gì → rỗng", () => {
    expect(textDecorationFor({ underline: false, strike: false })).toBe("");
  });
});

describe("zoomStep", () => {
  it("in/out đúng bước 10", () => {
    expect(zoomStep(100, "in")).toBe(110);
    expect(zoomStep(100, "out")).toBe(90);
  });
  it("clamp [70,150]", () => {
    expect(zoomStep(ZOOM_MAX, "in")).toBe(ZOOM_MAX);
    expect(zoomStep(ZOOM_MIN, "out")).toBe(ZOOM_MIN);
  });
});

describe("zoomStyleFor", () => {
  it("scale + width 10000/zoom (công thức cũ)", () => {
    expect(zoomStyleFor(120)).toEqual({
      transform: "scale(1.2)",
      transformOrigin: "top left",
      width: `${10000 / 120}%`,
    });
  });
});

describe("formatStatusFor", () => {
  it("mặc định", () => {
    expect(formatStatusFor(INITIAL_WORDPAD)).toBe("Định dạng: Mặc định");
  });
  it("ghép nhiều part đúng thứ tự", () => {
    const s = { ...INITIAL_WORDPAD, bold: true, underline: true, align: "center" as const, zoom: 120 };
    expect(formatStatusFor(s)).toBe("Đậm · Gạch chân · Căn: Giữa · 120%");
  });
  it("night mode thêm biểu tượng", () => {
    expect(formatStatusFor({ ...INITIAL_WORDPAD, nightMode: true })).toContain("Đêm");
  });
});

describe("wordCount", () => {
  it("đếm đúng, bỏ khoảng trắng thừa", () => {
    expect(wordCount("  xin   chào  thế giới ")).toBe(4);
  });
  it("rỗng → 0", () => {
    expect(wordCount("   ")).toBe(0);
  });
});
