# ADR-0004: Telemetry UI — không PII, local-first, opt-in upload

- **Trạng thái:** Accepted (2026-08-22)
- **Ngữ cảnh:** Không có đo lường nào (không Lighthouse CI, không RUM) nên không biết UI tốt hơn hay kém sau mỗi đợt refactor. Budget $0, deploy Cloudflare Workers.
- **Quyết định:**
  1. `src/ui/services/telemetry.ts` thu: Web Vitals (LCP/CLS/INP/TTFB), island error, interaction latency — chỉ theo `navigator.sendBeacon`, sampling 10%.
  2. Không PII: không URL có query chứa token, không input value, không user id thô (hash salt per-session).
  3. Mặc định ghi vào console + `sessionStorage` ring buffer (debug mode); chỉ POST lên `/api/ui-telemetry` khi bật flag. Endpoint ghi vào bảng Supabase (RLS: chỉ insert anonymous, không select public).
  4. CI đo offline qua Lighthouse CI + bundle budget; RUM chỉ là bổ sung.
- **Hệ quả:** có số trước/sau mỗi phase; chi phí: ~2KB client code, 1 endpoint + 1 bảng (triển khai Phase 8).
