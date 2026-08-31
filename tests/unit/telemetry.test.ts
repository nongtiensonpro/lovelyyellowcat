// telemetry.test.ts — Phase 8: no-PII contract + sampling + safe path.
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSessionId, safePath, compactUA, isSampled, sendTelemetry,
} from "../../src/ui/services/telemetry";

describe("safePath", () => {
  it("bỏ query + hash (chống lộ token trong URL)", () => {
    vi.stubGlobal("location", new URL("https://x.com/gallery?token=SECRET#hash"));
    expect(safePath()).toBe("/gallery");
    vi.unstubAllGlobals();
  });
});

describe("compactUA", () => {
  it("chỉ mobile/desktop + connection — không chuỗi UA đầy đủ", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0) Detail/Leaked",
      connection: { effectiveType: "4g" },
    });
    const ua = compactUA();
    expect(ua).toBe("d:4g");
    expect(ua).not.toContain("Windows");
    vi.unstubAllGlobals();
  });
});

describe("isSampled", () => {
  it("rate 1 → luôn sampled; rate 0 → không", () => {
    expect(isSampled(1)).toBe(true);
    expect(isSampled(0)).toBe(false);
  });
});

describe("sendTelemetry", () => {
  it("dùng sendBeacon khi có", () => {
    const beacon = vi.fn();
    vi.stubGlobal("navigator", { sendBeacon: beacon });
    sendTelemetry("/api/ui-telemetry", {
      metric: "LCP", value: 1200, path: "/x", sid: "abc", fx: "low", ua: "d",
    });
    expect(beacon).toHaveBeenCalledTimes(1);
    const [url, blob] = beacon.mock.calls[0];
    expect(url).toBe("/api/ui-telemetry");
    expect(blob.type).toContain("json");
  });
  it("không bao giờ throw (silent fail)", () => {
    vi.stubGlobal("navigator", { sendBeacon: () => { throw new Error("boom"); } });
    expect(() =>
      sendTelemetry("/e", { metric: "LCP", value: 1, path: "/", sid: "s", fx: "off", ua: "d" })
    ).not.toThrow();
    vi.unstubAllGlobals();
  });
});
