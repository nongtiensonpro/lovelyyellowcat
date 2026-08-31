// telemetry.ts — UI telemetry (Phase 8, ADR-0004).
// Thu thập Web Vitals + island error. KHÔNG PII: không URL query, không input,
// không user id thô (hash per-session). Mặc định console-only; chỉ POST khi endpoint bật.

export interface VitalPayload {
  /** metric name: LCP | CLS | INP | TTFB | FCP */
  metric: string;
  /** giá trị đã làm tròn (ms hoặc score*100 cho CLS). */
  value: number;
  /** chỉ path không query (vd "/gallery"). */
  path: string;
  /** hash session (không định danh). */
  sid: string;
  /** fx level đang chạy — phân tích tương quan hiệu năng/FX. */
  fx: string;
  /** client hint rút gọn: mobile/desktop + effectiveType. */
  ua: string;
}

const SESSION_SALT_KEY = "lyc_telemetry_sid";

/** Session id hash — ngẫu nhiên per-session, KHÔNG phải user id. */
export function getSessionId(): string {
  if (typeof sessionStorage === "undefined") return "ssr";
  try {
    let sid = sessionStorage.getItem(SESSION_SALT_KEY);
    if (!sid) {
      sid = Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem(SESSION_SALT_KEY, sid);
    }
    return sid;
  } catch {
    return "anon";
  }
}

/** Path an toàn: chỉ pathname, bỏ query/hash (chống lộ token qua URL). */
export function safePath(): string {
  if (typeof location === "undefined") return "";
  return location.pathname;
}

/** UA rút gọn: mobile/desktop + connection type — không chuỗi UA đầy đủ. */
export function compactUA(): string {
  if (typeof navigator === "undefined") return "ssr";
  const mobile = /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "m" : "d";
  const conn = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
  return `${mobile}${conn?.effectiveType ? ":" + conn.effectiveType : ""}`;
}

/** Sampling: true với 10% session (để tránh phá budget Supabase free). */
export function isSampled(rate: number = 0.1): boolean {
  try {
    const key = "lyc_telemetry_sampled";
    const stored = sessionStorage.getItem(key);
    if (stored !== null) return stored === "1";
    const sampled = Math.random() < rate;
    sessionStorage.setItem(key, sampled ? "1" : "0");
    return sampled;
  } catch {
    return Math.random() < rate;
  }
}

/** Gửi payload: sendBeacon nếu có, fallback fetch keepalive. Silent-fail mọi nơi. */
export function sendTelemetry(endpoint: string, payload: VitalPayload): void {
  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
      return;
    }
    if (typeof fetch === "function") {
      void fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch {
    // tuyệt đối không nổi bọt lỗi telemetry lên người dùng
  }
}

/** Đo Web Vitals bằng PerformanceObserver native (không thư viện, ~0KB deps). */
export function initWebVitals(endpoint: string | null): void {
  if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") return;
  if (!endpoint || !isSampled()) return;
  const sid = getSessionId();
  const fx = document.documentElement.getAttribute("data-fx") || "unknown";
  const path = safePath();
  const ua = compactUA();
  const report = (metric: string, value: number) => {
    sendTelemetry(endpoint, { metric, value: Math.round(value), path, sid, fx, ua });
  };

  // LCP
  try {
    let lcpValue = 0;
    const po = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        const last = entries[entries.length - 1] as PerformanceEntry & { startTime?: number };
        lcpValue = last.startTime || 0;
      }
    });
    po.observe({ type: "largest-contentful-paint", buffered: true } as PerformanceObserverInit);
    // gửi khi trang rời đi
    window.addEventListener("pagehide", () => { if (lcpValue > 0) report("LCP", lcpValue); }, { once: true });
  } catch {
    // OBS không hỗ trợ — bỏ qua
  }

  // CLS
  try {
    let clsValue = 0;
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<PerformanceEntry & { value?: number; hadRecentInput?: boolean }>) {
        if (!entry.hadRecentInput && typeof entry.value === "number") clsValue += entry.value;
      }
    });
    po.observe({ type: "layout-shift", buffered: true } as PerformanceObserverInit);
    window.addEventListener("pagehide", () => { if (clsValue > 0) report("CLS", clsValue * 100); }, { once: true });
  } catch {
    // bỏ qua
  }

  // INP (event timing) — giá trị gần đúng bằng duration event dài nhất
  try {
    let maxDuration = 0;
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<PerformanceEntry & { duration?: number; interactionId?: number }>) {
        if (entry.interactionId && typeof entry.duration === "number") {
          maxDuration = Math.max(maxDuration, entry.duration);
        }
      }
    });
    po.observe({ type: "event", buffered: true, durationThreshold: 40 } as PerformanceObserverInit);
    window.addEventListener("pagehide", () => { if (maxDuration > 0) report("INP", maxDuration); }, { once: true });
  } catch {
    // bỏ qua
  }
}

/** Báo island error qua cùng endpoint — không stack trace đầy đủ (chỉ message ngắn). */
export function reportIslandError(endpoint: string | null, moduleName: string, error: Error): void {
  if (!endpoint) return;
  sendTelemetry(endpoint, {
    metric: "ISLAND_ERROR",
    value: 0,
    path: safePath(),
    sid: getSessionId(),
    fx: document.documentElement.getAttribute("data-fx") || "unknown",
    ua: `${compactUA()}|${moduleName}|${error.message.slice(0, 80)}`,
  });
}
