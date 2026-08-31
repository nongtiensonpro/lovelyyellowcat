import { describe, it, expect } from "vitest";
import {
  collectTags, matchesTag, matchesQuery, stableHash, sortItems,
  processGalleryItems, paginate, shouldRefetch, ALL_TAGS_LABEL,
  type GalleryItem,
} from "../../src/components/gallery/galleryQuery";

const item = (over: Partial<GalleryItem> = {}): GalleryItem => ({
  id: Math.random().toString(36).slice(2),
  title: "Untitled",
  created_at: "2026-01-01T00:00:00Z",
  ...over,
});

describe("collectTags", () => {
  it("gom tag duy nhất giữ thứ tự, trim, bỏ rỗng", () => {
    const tags = collectTags([
      item({ tags: ["neon", " retro ", "neon", ""] }),
      item({ tags: ["retro", "vhs"] }),
      item({ tags: undefined }),
    ]);
    expect(tags).toEqual(["neon", "retro", "vhs"]);
  });
});

describe("matchesTag", () => {
  const it1 = item({ tags: ["neon"] });
  it("Tất Cả khớp mọi item", () => {
    expect(matchesTag(it1, ALL_TAGS_LABEL)).toBe(true);
  });
  it("khớp tag chính xác (sau trim)", () => {
    expect(matchesTag(item({ tags: [" neon "] }), "neon")).toBe(true);
  });
  it("không khớp tag khác / thiếu tags", () => {
    expect(matchesTag(it1, "vhs")).toBe(false);
    expect(matchesTag(item({}), "neon")).toBe(false);
  });
});

describe("matchesQuery", () => {
  const it1 = item({ title: "Neon Dreamscape", profiles: { full_name: "Cat Artist" }, description: "retro vibes" });
  it("rỗng → khớp hết", () => expect(matchesQuery(it1, "  ")).toBe(true));
  it("tìm theo title/full_name/description", () => {
    expect(matchesQuery(it1, "neon")).toBe(true);
    expect(matchesQuery(it1, "cat artist")).toBe(true);
    expect(matchesQuery(it1, "RETRO")).toBe(true);
    expect(matchesQuery(it1, "zzz")).toBe(false);
  });
});

describe("stableHash", () => {
  it("deterministic", () => {
    expect(stableHash("abc")).toBe(stableHash("abc"));
  });
  it("khác nhau giữa id khác nhau (gần chắc chắn)", () => {
    expect(stableHash("a")).not.toBe(stableHash("b"));
  });
});

describe("sortItems", () => {
  const a = item({ id: "a", created_at: "2026-01-01T00:00:00Z" });
  const b = item({ id: "b", created_at: "2026-06-01T00:00:00Z" });
  const c = item({ id: "c", created_at: "2026-03-01T00:00:00Z" });
  it("newest trước", () => {
    expect(sortItems([a, b, c], "newest", {}).map((x) => x.id)).toEqual(["b", "c", "a"]);
  });
  it("reactions theo count giảm dần", () => {
    expect(sortItems([a, b, c], "reactions", { a: 5, c: 9 }).map((x) => x.id)).toEqual(["c", "a", "b"]);
  });
  it("random deterministic với cùng seed", () => {
    const r1 = sortItems([a, b, c], "random", {}, "seed1").map((x) => x.id);
    const r2 = sortItems([a, b, c], "random", {}, "seed1").map((x) => x.id);
    expect(r1).toEqual(r2);
  });
  it("không mutate input", () => {
    const input = [a, b, c];
    sortItems(input, "newest", {});
    expect(input.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});

describe("processGalleryItems", () => {
  const items = [
    item({ id: "1", title: "Neon A", tags: ["neon"], created_at: "2026-01-01T00:00:00Z" }),
    item({ id: "2", title: "VHS B", tags: ["vhs"], created_at: "2026-05-01T00:00:00Z" }),
    item({ id: "3", title: "Neon C", tags: ["neon"], created_at: "2026-03-01T00:00:00Z" }),
  ];
  it("filter tag + sort newest", () => {
    const r = processGalleryItems(items, { selectedTag: "neon", searchQuery: "", sortBy: "newest", reactionCounts: {} });
    expect(r.map((x) => x.id)).toEqual(["3", "1"]);
  });
  it("filter search + Tất Cả", () => {
    const r = processGalleryItems(items, { selectedTag: ALL_TAGS_LABEL, searchQuery: "vhs", sortBy: "newest", reactionCounts: {} });
    expect(r.map((x) => x.id)).toEqual(["2"]);
  });
});

describe("paginate / shouldRefetch", () => {
  it("paginate slice đúng", () => {
    expect(paginate([1, 2, 3, 4, 5], 3)).toEqual([1, 2, 3]);
    expect(paginate([1], 0)).toEqual([]);
  });
  it("shouldRefetch: lần đầu true, trong gap false, sau gap true", () => {
    expect(shouldRefetch(null, 1000)).toBe(true);
    expect(shouldRefetch(1000, 1100)).toBe(false);
    expect(shouldRefetch(1000, 1300)).toBe(true);
  });
});
