// /api/ui-telemetry — nhận Web Vitals + island error (Phase 8, ADR-0004).
// INSERT-ONLY: không SELECT từ client. Rate-limit cơ bản theo IP trong memory (per-instance).
// Payload nhỏ, validate chặt — fail silently (không bao giờ 500 ra client).
import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../lib/supabase";

const ALLOWED_METRICS = new Set(["LCP", "CLS", "INP", "TTFB", "FCP", "ISLAND_ERROR"]);
const MAX_UA_LEN = 160;

// Per-instance rate limit: tối đa 30 req / 60s / IP (đủ cho 1 user, chặn spam)
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - 60_000;
  const list = (hits.get(ip) || []).filter((t) => t > windowStart);
  list.push(now);
  hits.set(ip, list);
  // dọn định kỳ
  if (hits.size > 10_000) {
    for (const [k, v] of hits) {
      if (v.every((t) => t < windowStart)) hits.delete(k);
    }
  }
  return list.length > 30;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    if (rateLimited(ip)) {
      return new Response(null, { status: 429 });
    }
    const raw = await request.text();
    if (!raw || raw.length > 1_000) return new Response(null, { status: 400 });
    const data = JSON.parse(raw) as Record<string, unknown>;
    const metric = typeof data.metric === "string" ? data.metric : "";
    if (!ALLOWED_METRICS.has(metric)) return new Response(null, { status: 400 });
    const value = typeof data.value === "number" && Number.isFinite(data.value) ? Math.round(data.value) : null;
    if (value === null || value < 0 || value > 1_000_000) return new Response(null, { status: 400 });
    const path = typeof data.path === "string" ? data.path.slice(0, 100) : "";
    const sid = typeof data.sid === "string" ? data.sid.slice(0, 32) : "";
    const ua = typeof data.ua === "string" ? data.ua.slice(0, MAX_UA_LEN) : "";
    const fx = typeof data.fx === "string" ? data.fx.slice(0, 16) : "";

    const supabase = createSupabaseServerClient({ request, cookies: undefined as never });
    // Bảng: ui_events(metric text, value int, path text, sid text, fx text, ua text, created_at timestamptz default now())
    // RLS: insert cho anon, select chỉ admin (migration SQL ở dưới).
    const { error } = await supabase.from("ui_events").insert({ metric, value, path, sid, fx, ua });
    if (error) {
      // Bảng chưa migrate → im lặng, không phá trang
      return new Response(null, { status: 204 });
    }
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 204 });
  }
};
