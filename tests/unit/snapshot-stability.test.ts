// snapshot-stability.test.ts — chặn React error #185 (Maximum update depth).
// useSyncExternalStore so sánh snapshot bằng Object.is: nếu getSnapshot() tạo
// object/array MỚI mỗi lần gọi khi state không đổi => re-render vô hạn.
// Contract: gọi getSnapshot nhiều lần liên tiếp (không mutate) PHẢI cùng tham chiếu.
import { describe, it, expect } from "vitest";
import { getPreferences, setPreferences } from "../../src/ui/services/preferenceStore";
import { getCommands, registerCommand } from "../../src/ui/shell/commands";
import { getWindows } from "../../src/ui/wm95/windowRuntime";
import { getDialogState } from "../../src/ui/wm95/dialogService";

describe("store snapshot stability (React #185 guard)", () => {
  it("getPreferences: cùng tham chiếu khi không đổi", () => {
    const a = getPreferences();
    const b = getPreferences();
    const c = getPreferences();
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("getPreferences: tham chiếu MỚI sau khi set (để re-render)", () => {
    const before = getPreferences();
    setPreferences({ sound: !before.sound });
    const after = getPreferences();
    expect(after).not.toBe(before);
    expect(after.sound).toBe(!before.sound);
    // và ổn định lại sau đó
    expect(getPreferences()).toBe(after);
    // restore
    setPreferences({ sound: before.sound });
  });

  it("getCommands: cùng tham chiếu khi registry không đổi", () => {
    const a = getCommands();
    const b = getCommands();
    expect(a).toBe(b);
  });

  it("getCommands: tham chiếu mới khi register/unregister", () => {
    const before = getCommands();
    const un = registerCommand({ id: "snap-test", label: "Snap", action: () => {} });
    const during = getCommands();
    expect(during).not.toBe(before);
    un();
    expect(getCommands()).not.toBe(during);
    expect(getCommands()).toBe(getCommands());
  });

  it("getWindows: cùng tham chiếu khi không dispatch", () => {
    const a = getWindows();
    const b = getWindows();
    expect(a).toBe(b);
  });

  it("getDialogState: cùng tham chiếu khi không dispatch", () => {
    const a = getDialogState();
    const b = getDialogState();
    expect(a).toBe(b);
  });
});
