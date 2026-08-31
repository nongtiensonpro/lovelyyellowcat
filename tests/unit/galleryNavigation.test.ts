import { describe, it, expect } from "vitest";
import { nextIndex, prevIndex, indexOfId, autoplayProgress, neighborUrls } from "../../src/components/gallery/galleryNavigation";

describe("nextIndex/prevIndex", () => {
  it("wrap-around: cuối → đầu, đầu → cuối", () => {
    expect(nextIndex(2, 3)).toBe(0);
    expect(prevIndex(0, 3)).toBe(2);
  });
  it("trả -1 khi rỗng", () => {
    expect(nextIndex(0, 0)).toBe(-1);
    expect(prevIndex(0, 0)).toBe(-1);
  });
});

describe("indexOfId", () => {
  it("tìm theo id", () => {
    expect(indexOfId([{ id: "a" }, { id: "b" }], "b")).toBe(1);
  });
  it("null/unknown → -1", () => {
    expect(indexOfId([{ id: "a" }], null)).toBe(-1);
    expect(indexOfId([{ id: "a" }], "x")).toBe(-1);
  });
});

describe("autoplayProgress", () => {
  it("0ms → 0%", () => expect(autoplayProgress(0, 5000)).toBe(0));
  it("nửa thời gian → 50%", () => expect(autoplayProgress(2500, 5000)).toBe(50));
  it("clamp 100% khi vượt", () => expect(autoplayProgress(9999, 5000)).toBe(100));
  it("duration 0 → 0 (tránh chia 0)", () => expect(autoplayProgress(100, 0)).toBe(0));
});

describe("neighborUrls", () => {
  it("trả next + prev không trùng", () => {
    const r = neighborUrls(1, ["a", "b", "c"]);
    expect(r).toEqual(["c", "a"]);
  });
  it("2 phần tử: chỉ 1 URL duy nhất (next=prev)", () => {
    const r = neighborUrls(0, ["a", "b"]);
    expect(r).toEqual(["b"]);
  });
  it("1 phần tử: rỗng", () => {
    expect(neighborUrls(0, ["a"])).toEqual([]);
  });
});
