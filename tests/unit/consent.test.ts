// @vitest-environment jsdom
// tests/unit/consent.test.ts — Unit tests cho Quản lý Consent theo Luật 91/2025
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getConsent,
  saveConsent,
  hasConsentChoice,
  hasSecurityConsent,
  hasPerformanceConsent,
  CONSENT_STORAGE_KEY,
} from "../../src/lib/consent";

describe("consent module", () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = "lyc_consent=; max-age=0; path=/";
  });

  it("hasConsentChoice trả về false khi chưa lưu lựa chọn", () => {
    expect(hasConsentChoice()).toBe(false);
    expect(getConsent()).toBeNull();
    expect(hasSecurityConsent()).toBe(false);
    expect(hasPerformanceConsent()).toBe(false);
  });

  it("saveConsent lưu lựa chọn vào localStorage và cookie", () => {
    const saved = saveConsent({ security: true, performance: false });

    expect(saved.security).toBe(true);
    expect(saved.performance).toBe(false);
    expect(saved.version).toBeDefined();
    expect(saved.timestamp).toBeDefined();

    expect(hasConsentChoice()).toBe(true);
    expect(hasSecurityConsent()).toBe(true);
    expect(hasPerformanceConsent()).toBe(false);

    // Kiểm tra localStorage
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).security).toBe(true);
  });

  it("saveConsent phát ra custom event lyc-consent-updated", () => {
    const eventHandler = vi.fn();
    window.addEventListener("lyc-consent-updated", eventHandler);

    saveConsent({ security: false, performance: true });

    expect(eventHandler).toHaveBeenCalledTimes(1);
    const eventDetail = eventHandler.mock.calls[0][0].detail;
    expect(eventDetail.security).toBe(false);
    expect(eventDetail.performance).toBe(true);

    window.removeEventListener("lyc-consent-updated", eventHandler);
  });

  it("getConsent xử lý an toàn khi localStorage bị hỏng JSON", () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, "invalid-json-content");
    expect(getConsent()).toBeNull();
  });
});
