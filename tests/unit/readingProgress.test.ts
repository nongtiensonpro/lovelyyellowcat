import { describe, it, expect } from "vitest";
import { readingProgressPct } from "../../src/components/article/readingProgress";

describe("readingProgressPct", () => {
  it("0 scroll → 0%", () => expect(readingProgressPct(0, 800, 3000)).toBe(0));
  it("nửa bài → 50%", () => expect(readingProgressPct(1100, 800, 3000)).toBe(50));
  it("cuối trang → clamp 100%", () => expect(readingProgressPct(99999, 800, 3000)).toBe(100));
  it("trang ngắn hơn viewport → 0 (tránh chia 0/âm)", () => {
    expect(readingProgressPct(100, 800, 500)).toBe(0);
  });
});
