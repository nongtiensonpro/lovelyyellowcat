import { describe, it, expect } from "vitest";
import { computeFxLevel, fxLevelToClass, type FxInputs } from "../../src/ui/services/fxAbility";

const base: FxInputs = {
  uiMode: "catalog",
  motionPref: "system",
  reducedMotionMedia: false,
  saveData: false,
};

describe("computeFxLevel", () => {
  it("ACCESS mode luôn tắt", () => {
    expect(computeFxLevel({ ...base, uiMode: "access" })).toBe("off");
  });
  it("user override thắng mọi thứ (trừ access)", () => {
    expect(computeFxLevel({ ...base, uiMode: "catalog", userFxOverride: "low" })).toBe("low");
    expect(computeFxLevel({ ...base, uiMode: "crt", userFxOverride: "off" })).toBe("off");
  });
  it("reduced motion: tắt FX", () => {
    expect(computeFxLevel({ ...base, reducedMotionMedia: true })).toBe("off");
  });
  it("motion off: tắt", () => {
    expect(computeFxLevel({ ...base, motionPref: "off" })).toBe("off");
  });
  it("CRT mode + motion on + cap tốt = high", () => {
    expect(computeFxLevel({ ...base, uiMode: "crt", motionPref: "on" })).toBe("high");
  });
  it("CATALOG mode + cap tốt = medium", () => {
    expect(computeFxLevel(base)).toBe("medium");
  });
  it("Save-Data hạ xuống low", () => {
    expect(computeFxLevel({ ...base, uiMode: "crt", motionPref: "on", saveData: true })).toBe("low");
  });
  it("2g/slow-2g hạ xuống low", () => {
    expect(computeFxLevel({ ...base, effectiveConnectionType: "2g" })).toBe("low");
    expect(computeFxLevel({ ...base, effectiveConnectionType: "slow-2g" })).toBe("low");
  });
  it("deviceMemory ≤ 2GB hạ từ medium về low (không đổi off)", () => {
    expect(computeFxLevel({ ...base, deviceMemoryGB: 2 })).toBe("low");
    expect(computeFxLevel({ ...base, deviceMemoryGB: 1 })).toBe("low");
  });
  it("deviceMemory ≤ 2GB không ảnh hưởng nếu đã off", () => {
    expect(computeFxLevel({ ...base, uiMode: "access", deviceMemoryGB: 1 })).toBe("off");
  });
  it("hardwareConcurrency ≤ 2 hạ high → medium", () => {
    expect(computeFxLevel({ ...base, uiMode: "crt", motionPref: "on", hardwareConcurrency: 2 })).toBe("medium");
  });
  it("kết hợp nhiều ràng buộc — lấy mức thấp nhất", () => {
    expect(
      computeFxLevel({
        uiMode: "crt",
        motionPref: "on",
        reducedMotionMedia: false,
        saveData: true,
        effectiveConnectionType: "3g",
      })
    ).toBe("low");
  });
});

describe("fxLevelToClass", () => {
  it("ánh xạ tên sang class CSS", () => {
    expect(fxLevelToClass("off")).toBe("fx-off");
    expect(fxLevelToClass("low")).toBe("fx-low");
    expect(fxLevelToClass("medium")).toBe("fx-medium");
    expect(fxLevelToClass("high")).toBe("fx-high");
  });
});
