import { describe, it, expect, beforeEach } from "vitest";
import { registerCommand, getCommands, filterCommands, subscribeCommands } from "../../src/ui/shell/commands";

const noop = () => {};

describe("registerCommand", () => {
  beforeEach(() => {
    // clear registry by unregistering all
    for (const c of getCommands()) {
      // can't directly unregister without handle; use delete pattern by re-registering
    }
  });

  it("đăng ký lệnh, danh sách tăng", () => {
    const before = getCommands().length;
    const un = registerCommand({ id: "test-a", label: "Test A", action: noop });
    expect(getCommands().length).toBe(before + 1);
    un();
    expect(getCommands().length).toBe(before);
  });

  it("unregister đúng id", () => {
    const un = registerCommand({ id: "test-b", label: "B", action: noop });
    expect(getCommands().find((c) => c.id === "test-b")).toBeTruthy();
    un();
    expect(getCommands().find((c) => c.id === "test-b")).toBeFalsy();
  });

  it("subscribeCommands nhận lệnh mới", () => {
    const calls: number[] = [];
    const u1 = subscribeCommands((c) => calls.push(c.length));
    const un = registerCommand({ id: "test-c", label: "C", action: noop });
    expect(calls.length).toBeGreaterThanOrEqual(2); // 1 initial + 1 emit
    u1(); un();
  });
});

describe("filterCommands", () => {
  it("lọc theo label không phân biệt hoa thường", () => {
    const result = filterCommands(
      [
        { id: "a", label: "Tìm kiếm bài viết", action: noop },
        { id: "b", label: "Bật chế độ CRT", action: noop },
        { id: "c", label: "Toggle UI Mode", action: noop },
      ],
      "crt", "public"
    );
    expect(result.map((c) => c.id)).toEqual(["b"]); // chỉ "Bật chế độ CRT" chứa "crt"
  });

  it("tìm trong keywords", () => {
    const result = filterCommands(
      [
        { id: "a", label: "Open dialog", keywords: ["modal", "popup"], action: noop },
        { id: "b", label: "Switch theme", action: noop },
      ],
      "popup", "public"
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });

  it("role filter: public scope thấy ở mọi role", () => {
    const c = { id: "pub", label: "L", scope: "public" as const, action: noop };
    expect(filterCommands([c], "", "public")).toHaveLength(1);
    expect(filterCommands([c], "", "auth")).toHaveLength(1);
    expect(filterCommands([c], "", "admin")).toHaveLength(1);
  });

  it("role filter: admin scope chỉ admin thấy", () => {
    const c = { id: "adm", label: "L", scope: "admin" as const, action: noop };
    expect(filterCommands([c], "", "public")).toHaveLength(0);
    expect(filterCommands([c], "", "auth")).toHaveLength(0);
    expect(filterCommands([c], "", "admin")).toHaveLength(1);
  });

  it("role filter: auth scope thấy ở auth + admin", () => {
    const c = { id: "au", label: "L", scope: "auth" as const, action: noop };
    expect(filterCommands([c], "", "public")).toHaveLength(0);
    expect(filterCommands([c], "", "auth")).toHaveLength(1);
    expect(filterCommands([c], "", "admin")).toHaveLength(1);
  });

  it("không scope = ai cũng thấy", () => {
    const c = { id: "any", label: "L", action: noop };
    for (const r of ["public", "auth", "admin"] as const) {
      expect(filterCommands([c], "", r)).toHaveLength(1);
    }
  });

  it("query rỗng: trả tất cả sau role filter", () => {
    const result = filterCommands(
      [
        { id: "a", label: "A", action: noop },
        { id: "b", label: "B", scope: "admin" as const, action: noop },
      ],
      "",
      "public"
    );
    expect(result).toHaveLength(1);
  });
});
