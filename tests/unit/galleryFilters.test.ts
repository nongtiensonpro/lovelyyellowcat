import { VISUAL_FILTERS, filterCss } from "../../src/components/gallery/galleryFilters";

import { describe, it, expect } from "vitest";

describe("VISUAL_FILTERS", () => {
  it("đủ 7 filter", () => {
    expect(VISUAL_FILTERS).toHaveLength(7);
  });
  it("mỗi filter có id/label/icon/desc", () => {
    for (const f of VISUAL_FILTERS) {
      expect(f.id).toBeTruthy();
      expect(f.label).toBeTruthy();
      expect(f.icon).toBeTruthy();
      expect(f.desc).toBeTruthy();
    }
  });
});

describe("filterCss", () => {
  it("normal = none", () => {
    expect(filterCss("normal")).toBe("none");
  });
  it("mỗi filter có CSS chain riêng", () => {
    for (const f of VISUAL_FILTERS) {
      expect(filterCss(f.id).length).toBeGreaterThan(0);
    }
  });
  it("id lạ → none (an toàn)", () => {
    // @ts-expect-error — kiểm tra runtime guard
    expect(filterCss("hack")).toBe("none");
  });
});
