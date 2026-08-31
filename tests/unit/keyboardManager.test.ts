import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerShortcut } from "../../src/ui/shell/keyboardManager";

// registerShortcut: thêm vào Map HANDLERS nội bộ, KHÔNG tự attach DOM listener.
// Để dispatch thật cần initKeyboardManager() trong môi trường có window/document.

describe("keyboardManager — registry", () => {
  beforeEach(() => { /* clean */ });

  it("registerShortcut trả về fn, id có thể trùng nhau (HANDLERS cho phép last write)", () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    const u1 = registerShortcut("a", { key: "k", action: h1 });
    const u2 = registerShortcut("a", { key: "k", action: h2 });
    expect(typeof u1).toBe("function");
    expect(typeof u2).toBe("function");
    // unregister theo thứ tự LIFO
    u2();
    u1();
  });

  it("unregister không throw khi gọi nhiều lần (idempotent)", () => {
    const un = registerShortcut("k-b", { key: "x", action: vi.fn() });
    un();
    expect(() => un()).not.toThrow();
  });

  it("nhiều handler có thể tồn tại song song", () => {
    const un1 = registerShortcut("k1", { key: "1", action: vi.fn() });
    const un2 = registerShortcut("k2", { key: "2", action: vi.fn() });
    const un3 = registerShortcut("k3", { key: "3", action: vi.fn() });
    expect(un1).toBeTypeOf("function");
    expect(un2).toBeTypeOf("function");
    expect(un3).toBeTypeOf("function");
    un1(); un2(); un3();
  });
});
