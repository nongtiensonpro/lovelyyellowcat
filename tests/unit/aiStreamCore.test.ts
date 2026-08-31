import { describe, it, expect } from "vitest";
import {
  mergeModelUsage, formatGeminiContents, modelsToTryFor,
  isLocationError, isPolicyError, isPolicyFinishReason, isRecoverableStreamFailure,
  parseSseLine, splitSseBuffer, buildContinuationContents, clampTemperature,
  CLIENT_MAX_OUTPUT_TOKENS, CLIENT_MAX_CONTINUATIONS,
} from "../../src/components/ai/aiStreamCore";

describe("mergeModelUsage", () => {
  it("cả 2 undefined → undefined", () => {
    expect(mergeModelUsage(undefined, undefined)).toBeUndefined();
  });
  it("sum đúng từng field", () => {
    const r = mergeModelUsage(
      { promptTokenCount: 10, totalTokenCount: 20 },
      { promptTokenCount: 5, candidatesTokenCount: 8, totalTokenCount: 13 }
    );
    expect(r?.promptTokenCount).toBe(15);
    expect(r?.candidatesTokenCount).toBe(8);
    expect(r?.totalTokenCount).toBe(33);
  });
});

describe("formatGeminiContents", () => {
  it("cắt context MAX và bắt đầu từ user đầu tiên", () => {
    const msgs = [
      { role: "model", content: "greeting" },
      { role: "user", content: "q1" },
      { role: "model", content: "a1" },
      { role: "user", content: "q2" },
    ];
    const r = formatGeminiContents(msgs);
    expect(r[0].role).toBe("user");
    expect(r[0].parts[0].text).toBe("q1");
  });
  it("bỏ message rỗng", () => {
    const r = formatGeminiContents([
      { role: "user", content: "   " },
      { role: "user", content: "hi" },
    ]);
    expect(r).toHaveLength(1);
  });
});

describe("modelsToTryFor", () => {
  const order = ["m1", "m2", "m3"];
  it("auto → toàn bộ order", () => {
    expect(modelsToTryFor("auto", true, order)).toEqual(order);
  });
  it("model cụ thể + fallback → model trước, phần còn lại theo order", () => {
    expect(modelsToTryFor("m2", true, order)).toEqual(["m2", "m1", "m3"]);
  });
  it("model cụ thể không fallback → chỉ model đó", () => {
    expect(modelsToTryFor("m2", false, order)).toEqual(["m2"]);
  });
});

describe("error classifiers", () => {
  it("location", () => {
    expect(isLocationError("User location is not supported")).toBe(true);
    expect(isLocationError("quota exceeded")).toBe(false);
  });
  it("policy", () => {
    expect(isPolicyError("content blocked by safety")).toBe(true);
    expect(isPolicyFinishReason("SAFETY")).toBe(true);
    expect(isPolicyFinishReason("STOP")).toBe(false);
  });
  it("recoverable: network ok, quota/policy/location không retry", () => {
    expect(isRecoverableStreamFailure("network error")).toBe(true);
    expect(isRecoverableStreamFailure("Quota exceeded")).toBe(false);
    expect(isRecoverableStreamFailure("blocked by policy")).toBe(false);
    expect(isRecoverableStreamFailure("User location is not supported")).toBe(false);
  });
});

describe("parseSseLine", () => {
  it("data: text chunk", () => {
    const r = parseSseLine('data: {"candidates":[{"content":{"parts":[{"text":"Xin"}]}}]}');
    expect(r.text).toBe("Xin");
    expect(r.parseErrors).toBe(0);
  });
  it("data: [DONE]", () => {
    expect(parseSseLine("data: [DONE]").doneMarker).toBe(true);
  });
  it("usage metadata", () => {
    const r = parseSseLine('data: {"usageMetadata":{"totalTokenCount":42}}');
    expect(r.usage?.totalTokenCount).toBe(42);
  });
  it("finishReason", () => {
    const r = parseSseLine('data: {"candidates":[{"finishReason":"STOP"}]}');
    expect(r.finishReason).toBe("STOP");
  });
  it("error trong stream", () => {
    const r = parseSseLine('data: {"error":{"message":"boom"}}');
    expect(r.error).toBe("boom");
  });
  it("JSON hỏng → parseErrors=1, không throw", () => {
    const r = parseSseLine("data: {broken");
    expect(r.parseErrors).toBe(1);
  });
  it("dòng không phải data → empty", () => {
    const r = parseSseLine("event: ping");
    expect(r.text).toBe("");
    expect(r.parseErrors).toBe(0);
  });
});

describe("splitSseBuffer", () => {
  it("tách dòng hoàn chỉnh, giữ remainder", () => {
    const r = splitSseBuffer("", 'data: a\ndata: b\ndata: c');
    expect(r.lines).toEqual(["data: a", "data: b"]);
    expect(r.rest).toBe("data: c");
  });
  it("buffer dở + chunk mới", () => {
    const r = splitSseBuffer("data: a", "\ndata: b\n");
    expect(r.lines).toEqual(["data: a", "data: b"]);
    expect(r.rest).toBe("");
  });
});

describe("buildContinuationContents", () => {
  it("nối partial (role model) + user prompt", () => {
    const base = [{ role: "user", parts: [{ text: "q" }] }];
    const r = buildContinuationContents(base, "partial...");
    expect(r).toHaveLength(3);
    expect(r[1].role).toBe("model");
    expect(r[1].parts[0].text).toBe("partial...");
    expect(r[2].role).toBe("user");
    expect(r[2].parts[0].text).toContain("tiếp tục");
  });
});

describe("clampTemperature", () => {
  it("clamp [0.1, 1.0]", () => {
    expect(clampTemperature(0)).toBe(0.1);
    expect(clampTemperature(5)).toBe(1.0);
    expect(clampTemperature(0.7)).toBe(0.7);
  });
  it("NaN → 0.7", () => {
    expect(clampTemperature(NaN)).toBe(0.7);
  });
});

describe("constants", () => {
  it("giá trị khớp bản cũ", () => {
    expect(CLIENT_MAX_OUTPUT_TOKENS).toBe(4096);
    expect(CLIENT_MAX_CONTINUATIONS).toBe(2);
  });
});
