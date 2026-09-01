// Tâm: chặn hồi quy lỗ hổng ratchet đã lộ trong audit v5.2 — "chỉ so tổng"
// cho phép rule A tăng khi rule B giảm nhiều (tổng giảm nhưng nợ thật tăng).
// Import trực tiếp module .mjs thuần — logic ratchet giờ có test đúng nghĩa.
import { describe, expect, it } from "vitest";
import { checkRatchet, countWarnings, totalOf } from "../../scripts/lint-baseline-core.mjs";

const mkFile = (ruleId: string, severity = 1) => ({
  messages: [{ severity, ruleId }],
});

describe("countWarnings", () => {
  it("đếm warning theo ruleId", () => {
    const counts = countWarnings([
      mkFile("@typescript-eslint/no-unused-vars"),
      mkFile("@typescript-eslint/no-unused-vars"),
      mkFile("no-console"),
    ]);
    expect(counts).toEqual({
      "@typescript-eslint/no-unused-vars": 2,
      "no-console": 1,
    });
  });

  it("bỏ qua error (severity 2) — error làm eslint exit != 0, không cần ratchet", () => {
    const counts = countWarnings([mkFile("no-restricted-syntax", 2)]);
    expect(counts).toEqual({});
  });

  it("bỏ qua message không có ruleId (vd. file ignored)", () => {
    const counts = countWarnings([{ messages: [{ severity: 1, ruleId: null }] }]);
    expect(counts).toEqual({});
  });

  it("chống undefined messages — dùng ?? [] thay vì crash", () => {
    const counts = countWarnings([{ messages: undefined }, {}]);
    expect(counts).toEqual({});
  });
});

describe("totalOf", () => {
  it("cộng tổng các rule", () => {
    expect(totalOf({ a: 2, b: 3 })).toBe(5);
  });
  it("rỗng → 0", () => {
    expect(totalOf({})).toBe(0);
  });
});

describe("checkRatchet — per-rule, không chỉ tổng", () => {
  const baseline = { total: 4, rules: { "rule-a": 1, "rule-b": 3 } };

  it("HỒI QUY: tổng giảm nhưng 1 rule tăng → TỪ CHỐI (lỗ hổng v5.2 audit)", () => {
    // rule-a 1→2 (tăng), rule-b 3→1 (giảm) — tổng 4→3 nhưng rule-a đã nợ thêm
    const counts = { "rule-a": 2, "rule-b": 1 };
    const failures = checkRatchet(baseline, counts);
    expect(failures).toEqual(["rule-a (2 > 1)"]);
  });

  it("mọi rule giảm → pass", () => {
    expect(checkRatchet(baseline, { "rule-a": 0, "rule-b": 2 })).toEqual([]);
  });

  it("rule mới xuất hiện → fail ngay cả khi tổng nhỏ hơn baseline", () => {
    expect(checkRatchet(baseline, { "rule-moi": 1 })).toEqual(["rule-moi mới xuất hiện (1)"]);
  });

  it("rule cũ mất hẳn khỏi counts (đã dọn) → pass", () => {
    expect(checkRatchet(baseline, {})).toEqual([]);
  });

  it("baseline 0 như hiện tại: bất kỳ warning nào cũng fail", () => {
    const zero = { total: 0, rules: {} };
    expect(checkRatchet(zero, { "no-console": 1 })).toEqual(["no-console mới xuất hiện (1)"]);
  });

  it("không thay đổi → pass", () => {
    expect(checkRatchet(baseline, { "rule-a": 1, "rule-b": 3 })).toEqual([]);
  });
});
