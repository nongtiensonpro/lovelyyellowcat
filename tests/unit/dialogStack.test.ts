import { describe, it, expect, vi } from "vitest";
import { dialogStackReducer, topDialog, type DialogEntry } from "../../src/ui/wm95/dialogStack";

const entry = (over: Partial<DialogEntry> = {}): DialogEntry => ({
  id: "d1",
  kind: "confirm",
  dismissible: true,
  ...over,
});

describe("dialogStackReducer", () => {
  it("open push vào đỉnh stack", () => {
    let s = dialogStackReducer([], { type: "open", entry: entry({ id: "a" }) });
    s = dialogStackReducer(s, { type: "open", entry: entry({ id: "b" }) });
    expect(s.map((d) => d.id)).toEqual(["a", "b"]);
    expect(topDialog(s)?.id).toBe("b");
  });

  it("open trùng id => dedupe và đưa lên đỉnh, không nhân bản", () => {
    let s = dialogStackReducer([], { type: "open", entry: entry({ id: "a" }) });
    s = dialogStackReducer(s, { type: "open", entry: entry({ id: "b" }) });
    s = dialogStackReducer(s, { type: "open", entry: entry({ id: "a" }) });
    expect(s.map((d) => d.id)).toEqual(["b", "a"]);
  });

  it("close gọi resolve đúng 1 lần với value mặc định false", () => {
    const resolve = vi.fn();
    const s = dialogStackReducer([], { type: "open", entry: entry({ resolve }) });
    const next = dialogStackReducer(s, { type: "close", id: "d1" });
    expect(next).toEqual([]);
    expect(resolve).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("close id lạ là no-op", () => {
    const resolve = vi.fn();
    const s = dialogStackReducer([], { type: "open", entry: entry({ resolve }) });
    const next = dialogStackReducer(s, { type: "close", id: "ghost" });
    expect(next).toHaveLength(1);
    expect(resolve).not.toHaveBeenCalled();
  });

  it("closeTop resolve giá trị truyền vào (true cho confirm OK)", () => {
    const resolve = vi.fn();
    let s = dialogStackReducer([], { type: "open", entry: entry({ id: "a" }) });
    s = dialogStackReducer(s, { type: "open", entry: entry({ id: "b", resolve }) });
    const next = dialogStackReducer(s, { type: "closeTop", value: true });
    expect(next.map((d) => d.id)).toEqual(["a"]);
    expect(resolve).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("escape chỉ đóng dialog dismissible", () => {
    const r1 = vi.fn();
    const r2 = vi.fn();
    let s = dialogStackReducer([], { type: "open", entry: entry({ id: "lock", dismissible: false, resolve: r1 }) });
    s = dialogStackReducer(s, { type: "escape" });
    expect(s).toHaveLength(1); // không dismiss được
    expect(r1).not.toHaveBeenCalled();
    s = dialogStackReducer(s, { type: "open", entry: entry({ id: "free", resolve: r2 }) });
    s = dialogStackReducer(s, { type: "escape" });
    expect(s.map((d) => d.id)).toEqual(["lock"]);
    expect(r2).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("escape/closeTop trên stack rỗng là no-op an toàn", () => {
    expect(dialogStackReducer([], { type: "escape" })).toEqual([]);
    expect(dialogStackReducer([], { type: "closeTop" })).toEqual([]);
  });
});
