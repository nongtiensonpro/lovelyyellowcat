// telemetryBootstrap.ts — client init cho Web Vitals (Phase 8).
// Endpoint: null → chỉ sampling logic chạy, không gửi gì (an toàn khi chưa migrate bảng).
import { initWebVitals, reportIslandError } from "../services/telemetry";

declare global {
  interface Window {
    __LYC_TELEMETRY_ENDPOINT__?: string | null;
  }
}

export const TELEMETRY_ENDPOINT: string | null = "/api/ui-telemetry";

if (typeof window !== "undefined") {
  window.__LYC_TELEMETRY_ENDPOINT__ = TELEMETRY_ENDPOINT;
  initWebVitals(TELEMETRY_ENDPOINT);
}

export { reportIslandError };
