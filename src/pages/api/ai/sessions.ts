import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../../lib/supabase";

async function requireActiveUser(context: { request: Request; cookies: any }) {
  const supabase = createSupabaseServerClient(context as any);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: new Response(JSON.stringify({ error: "Chưa đăng nhập." }), { status: 401 }) } as const;
  }
  const { data: profile } = await supabase.from("profiles").select("is_banned").eq("id", user.id).maybeSingle();
  if ((profile as any)?.is_banned) {
    return { error: new Response(JSON.stringify({ error: "Tài khoản bị chặn." }), { status: 403 }) } as const;
  }
  return { supabase, user } as const;
}

export const GET: APIRoute = async (context) => {
  const auth = await requireActiveUser(context);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

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
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
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
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
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
