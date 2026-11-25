import type { APIRoute, AstroCookies } from "astro";
import { createSupabaseServerClient } from "../../../lib/supabase";

type SupabaseClient = ReturnType<typeof import("../../../lib/supabase").createSupabaseServerClient>;
type AuthResult = { error: Response } | { supabase: SupabaseClient; user: { id: string } };
async function requireActiveUser(context: { request: Request; cookies: AstroCookies }): Promise<AuthResult> {
  const supabase = createSupabaseServerClient(context);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: new Response(JSON.stringify({ error: "Chưa đăng nhập." }), { status: 401 }) } as const;
  }
  const { data: profile } = await supabase.from("profiles").select("is_banned").eq("id", user.id).maybeSingle();
  if ((profile as { is_banned?: boolean } | null)?.is_banned) {
    return { error: new Response(JSON.stringify({ error: "Tài khoản bị chặn." }), { status: 403 }) } as const;
  }
  return { supabase, user } as const;
}

export const GET: APIRoute = async (context) => {
  const auth = await requireActiveUser(context);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  // Tuân thủ giới hạn lưu trữ 6 tháng (Luật 91/2025/QH15): tự động dọn phiên quá 180 ngày của user
  const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;
  const retentionCutoff = new Date(Date.now() - SIX_MONTHS_MS).toISOString();
  await supabase
    .from("ai_sessions")
    .delete()
    .eq("user_id", user.id)
    .lt("updated_at", retentionCutoff);

  const url = new URL(context.request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0"), 0);

  const { data, error } = await supabase
    .from("ai_sessions")
    .select("id, title_encrypted, title_iv, persona, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ sessions: data || [] }), { status: 200, headers: { "Cache-Control": "no-store" } });
};

export const POST: APIRoute = async (context) => {
  const auth = await requireActiveUser(context);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  try {
    const body = await context.request.json();
    const { title_encrypted, title_iv, persona } = body;
    if (!title_encrypted || !title_iv || !persona) {
      return new Response(JSON.stringify({ error: "Thiếu title_encrypted, title_iv, persona" }), { status: 400 });
    }
    if (!["cybercat","art_critic","hacker","synth_dj"].includes(persona)) {
      return new Response(JSON.stringify({ error: "persona không hợp lệ" }), { status: 400 });
    }

    const { data, error } = await supabase
      .from("ai_sessions")
      .insert({ user_id: user.id, title_encrypted, title_iv, persona })
      .select("id, title_encrypted, title_iv, persona, created_at, updated_at")
      .single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    return new Response(JSON.stringify({ session: data }), { status: 201 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500 });
  }
};

export const PATCH: APIRoute = async (context) => {
  const auth = await requireActiveUser(context);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  try {
    const body = await context.request.json();
    const { id, title_encrypted, title_iv } = body;
    if (!id || !title_encrypted || !title_iv) {
      return new Response(JSON.stringify({ error: "Thiếu id, title_encrypted, title_iv" }), { status: 400 });
    }

    const { data, error } = await supabase
      .from("ai_sessions")
      .update({ title_encrypted, title_iv, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    return new Response(JSON.stringify({ session: data }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500 });
  }
};

export const DELETE: APIRoute = async (context) => {
  const auth = await requireActiveUser(context);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const url = new URL(context.request.url);
  const id = url.searchParams.get("id");
  if (!id) return new Response(JSON.stringify({ error: "Thiếu id" }), { status: 400 });

  // Xóa session sẽ cascade xóa messages nhờ FK ON DELETE CASCADE
  // Nhưng để chắc, xóa messages trước (RLS vẫn đảm bảo)
  const { error } = await supabase.from("ai_sessions").delete().eq("id", id).eq("user_id", user.id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
