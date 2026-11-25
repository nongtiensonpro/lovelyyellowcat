// src/lib/consent.ts — Quản lý sự đồng ý quyền riêng tư theo Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15

export interface UserConsent {
  /** Google reCAPTCHA chống bot tại form gửi bài */
  security: boolean;
  /** Web Vitals Telemetry đo hiệu năng giao diện */
  performance: boolean;
  /** Thời điểm người dùng xác nhận lựa chọn (ISO string) */
  timestamp: string;
  /** Phiên bản chính sách consent */
  version: string;
}

export const CONSENT_STORAGE_KEY = "lyc_privacy_consent_v1";
export const CONSENT_COOKIE_KEY = "lyc_consent";
export const CURRENT_CONSENT_VERSION = "2026.1";

/**
 * Đọc trạng thái đồng ý từ localStorage (hoặc cookie fallback)
 */
export function getConsent(): UserConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UserConsent;
      if (parsed && typeof parsed.security === "boolean") {
        return parsed;
      }
    }
  } catch {
    // LocalStorage bị chặn hoặc lỗi parse
  }

  // Fallback đọc từ document.cookie
  if (typeof document !== "undefined" && document.cookie) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE_KEY}=([^;]*)`));
    if (match && match[1]) {
      try {
        const decoded = decodeURIComponent(match[1]);
        return JSON.parse(decoded) as UserConsent;
      } catch {
        // bỏ qua
      }
    }
  }

  return null;
}

/**
 * Lưu trạng thái đồng ý vào cả localStorage và cookie 12 tháng
 */
export function saveConsent(choices: { security: boolean; performance: boolean }): UserConsent {
  const consent: UserConsent = {
    security: choices.security,
    performance: choices.performance,
    timestamp: new Date().toISOString(),
    version: CURRENT_CONSENT_VERSION,
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
    } catch {
      // bỏ qua nếu private mode
    }

    try {
      // Lưu cookie 365 ngày
      const maxAge = 365 * 24 * 60 * 60;
      document.cookie = `${CONSENT_COOKIE_KEY}=${encodeURIComponent(
        JSON.stringify(consent)
      )}; path=/; max-age=${maxAge}; SameSite=Lax`;
    } catch {
      // bỏ qua
    }

    // Phát sự kiện cập nhật để các component/script phản ứng ngay lập tức
    window.dispatchEvent(new CustomEvent("lyc-consent-updated", { detail: consent }));
  }

  return consent;
}

/**
 * Kiểm tra xem người dùng đã đưa ra lựa chọn consent chưa
 */
export function hasConsentChoice(): boolean {
  return getConsent() !== null;
}

/**
 * Kiểm tra sự đồng ý cho các script an ninh / chống bot (reCAPTCHA)
 */
export function hasSecurityConsent(): boolean {
  const consent = getConsent();
  return consent ? consent.security : false;
}

/**
 * Kiểm tra sự đồng ý cho Web Vitals Telemetry
 */
export function hasPerformanceConsent(): boolean {
  const consent = getConsent();
  return consent ? consent.performance : false;
}

/**
 * Nạp động script Google reCAPTCHA nếu người dùng đã đồng ý
 */
export function loadRecaptchaIfConsented(sitekey: string): void {
  if (typeof window === "undefined" || !hasSecurityConsent()) return;
  if (!sitekey) return;

  const SCRIPT_ID = "google-recaptcha-script";
  if (document.getElementById(SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(sitekey)}`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}
