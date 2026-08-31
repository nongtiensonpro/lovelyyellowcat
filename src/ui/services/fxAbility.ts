// fxAbility.ts — FXBudget: quyết định cấp FX từ preference + capability (ADR-0003).
// Pure function: mọi input là tham số → unit test không cần DOM.

export type FxLevel = "off" | "low" | "medium" | "high";

export interface FxInputs {
  uiMode: "catalog" | "crt" | "access";
  motionPref: "system" | "on" | "off";
  reducedMotionMedia: boolean; // matchMedia("(prefers-reduced-motion: reduce)")
  saveData: boolean;          // navigator.connection.saveData
  effectiveConnectionType?: string; // navigator.connection.effectiveType
  deviceMemoryGB?: number;    // navigator.deviceMemory (Chrome)
  hardwareConcurrency?: number; // navigator.hardwareConcurrency
  userFxOverride?: FxLevel | null; // người dùng ép cấp вручную (settings Phase 7)
}

const LEVEL_ORDER: Record<FxLevel, number> = { off: 0, low: 1, medium: 2, high: 3 };

/** min của các ràng buộc — capability thấp nhất thắng. */
export function computeFxLevel(inputs: FxInputs): FxLevel {
  // 1) ACCESS mode: FX tắt tuyệt đối (a11y escape hatch)
  if (inputs.uiMode === "access") return "off";
  // 2) User override thắng mọi thứ (trừ access)
  if (inputs.userFxOverride) return inputs.userFxOverride;
  // 3) reduced motion: system + media reduce, hoặc user chọn off
  if (inputs.motionPref === "off") return "off";
  if (inputs.motionPref === "system" && inputs.reducedMotionMedia) return "off";
  // 4) Baseline theo mode: CRT = hero FX, catalog = subtle
  let level: FxLevel = inputs.uiMode === "crt" ? "high" : "medium";
  // 5) Capability clamp — hạ dần theo thiết bị/mạng
  if (inputs.saveData) level = "low";
  const ect = inputs.effectiveConnectionType;
  if (ect === "slow-2g" || ect === "2g") level = "low";
  if (typeof inputs.deviceMemoryGB === "number" && inputs.deviceMemoryGB <= 2) level = LEVEL_ORDER[level] > 1 ? "low" : level;
  if (typeof inputs.hardwareConcurrency === "number" && inputs.hardwareConcurrency <= 2) {
    level = LEVEL_ORDER[level] > 2 ? "medium" : level;
  }
  return level;
}

/** CSS class gắn lên <html> cho từng level — mọi FX selector đều dựa trên này. */
export function fxLevelToClass(level: FxLevel): string {
  return `fx-${level}`;
}

/** Đọc capability thật từ browser — trả null-safe defaults khi API thiếu. */
export function readCapability(): Omit<FxInputs, "uiMode" | "motionPref" | "reducedMotionMedia"> {
  if (typeof navigator === "undefined") return { saveData: false };
  const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return {
    saveData: Boolean(conn?.saveData),
    effectiveConnectionType: conn?.effectiveType,
    deviceMemoryGB: (navigator as unknown as { deviceMemory?: number }).deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
  };
}
