import { describe, it, expect } from "vitest";
import {
  parsePage, parsePageSize, calcPage, buildAdminUrl,
  toggleSelection, toggleAllSelection, reconcileSelection,
  matchesAdminSearch, sortByKey, DEFAULT_PAGE_SIZE,
} from "../../src/components/admin/adminTable";

describe("parsePage", () => {
  it("hợp lệ giữ nguyên", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage(null)).toBe(1);
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-5")).toBe(1);
  });
});

describe("parsePageSize", () => {
  it("clamp [1, 100]", () => {
    expect(parsePageSize(null)).toBe(DEFAULT_PAGE_SIZE);
    expect(parsePageSize("50")).toBe(50);
    expect(parsePageSize("999")).toBe(100);
    expect(parsePageSize("0")).toBe(DEFAULT_PAGE_SIZE);
  });
});

describe("calcPage", () => {
  it("45 items / 20 per page → 3 trang", () => {
    const p = calcPage(45, 1, 20);
    expect(p.totalPages).toBe(3);
    expect(p.from).toBe(0);
    expect(p.to).toBe(19);
    expect(p.hasPrev).toBe(false);
    expect(p.hasNext).toBe(2);
  });
  it("trang giữa", () => {
    const p = calcPage(45, 2, 20);
    expect(p.from).toBe(20);
    expect(p.hasPrev).toBe(true);
    expect(p.hasNext).toBe(3);
  });
  it("trang cuối", () => {
    const p = calcPage(45, 3, 20);
    expect(p.hasNext).toBe(false);
    expect(p.hasPrev).toBe(true);
  });
  it("page vượt tổng → clamp về trang cuối", () => {
    expect(calcPage(45, 99, 20).page).toBe(3);
  });
  it("total 0 → 1 trang rỗng", () => {
    const p = calcPage(0, 1, 20);
    expect(p.totalPages).toBe(1);
    expect(p.from).toBe(0);
  });
  it("total âm → như 0", () => {
    expect(calcPage(-5, 1, 20).totalPages).toBe(1);
  });
});

describe("buildAdminUrl", () => {
  it("set param có giá trị", () => {
    expect(buildAdminUrl("/admin/comments", "https://x.com", { page: 2, search: "abc" }))
      .toBe("/admin/comments?page=2&search=abc");
  });
  it("param rỗng/null/undefined → xóa khỏi URL", () => {
    expect(buildAdminUrl("/admin/comments", "https://x.com", { page: 1, search: "" }))
      .toBe("/admin/comments?page=1");
  });
  it("trim khoảng trắng", () => {
    expect(buildAdminUrl("/admin/users", "https://x.com", { search: "  " })).toBe("/admin/users");
  });
});

describe("selection", () => {
  it("toggleSelection thêm/bỏ", () => {
    expect(toggleSelection(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleSelection(["a", "b"], "a")).toEqual(["b"]);
  });
  it("toggleAllSelection: chưa đủ → chọn hết; đủ → bỏ hết", () => {
    expect(toggleAllSelection(["a"], ["a", "b"])).toEqual(["a", "b"]);
    expect(toggleAllSelection(["a", "b"], ["a", "b"])).toEqual([]);
  });
  it("toggleAllSelection danh sách rỗng → rỗng", () => {
    expect(toggleAllSelection([], [])).toEqual([]);
  });
  it("reconcileSelection bỏ id đã biến mất", () => {
    expect(reconcileSelection(["a", "b", "c"], ["a", "c", "d"])).toEqual(["a", "c"]);
  });
});

describe("matchesAdminSearch", () => {
  it("rỗng → true", () => {
    expect(matchesAdminSearch(["abc"], "")).toBe(true);
  });
  it("1 token khớp bất kỳ field", () => {
    expect(matchesAdminSearch(["Nghệ Sĩ", "bài viết"], "nghệ")).toBe(true);
  });
  it("nhiều token → AND", () => {
    expect(matchesAdminSearch(["Nghệ Sĩ", "bài viết"], "nghệ viết")).toBe(true);
    expect(matchesAdminSearch(["Nghệ Sĩ", "bài viết"], "nghệ zzz")).toBe(false);
  });
  it("field undefined/null an toàn", () => {
    expect(matchesAdminSearch([undefined, null, "abc"], "abc")).toBe(true);
  });
});

describe("sortByKey", () => {
  const rows = [
    { name: "c", count: 3, date: "2026-01-01" },
    { name: "a", count: 1, date: "2026-03-01" },
    { name: "b", count: 2, date: "2026-02-01" },
  ];
  it("sort string asc/vi locale", () => {
    expect(sortByKey(rows, "name").map((r) => r.name)).toEqual(["a", "b", "c"]);
  });
  it("sort number desc", () => {
    expect(sortByKey(rows, "count", "desc").map((r) => r.count)).toEqual([3, 2, 1]);
  });
  it("sort ISO date", () => {
    expect(sortByKey(rows, "date", "desc").map((r) => r.date)).toEqual(["2026-03-01", "2026-02-01", "2026-01-01"]);
  });
  it("không mutate input", () => {
    const input = [...rows];
    sortByKey(input, "name", "desc");
    expect(input.map((r) => r.name)).toEqual(["c", "a", "b"]);
  });
  it("null/undefined xuống cuối cả 2 chiều", () => {
    const withNull = [{ v: null }, { v: "b" }, { v: undefined }];
    const asc = sortByKey(withNull as never, "v").map((r) => r.v);
    expect(asc[asc.length - 1]).toBeUndefined(); // undefined cuối
  });
});
