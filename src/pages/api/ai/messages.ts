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
    return { error: new Response(JSON.stringify({ error: "Tài khoản bị chặn, không thể sử dụng AI." }), { status: 403 }) } as const;
  }
  return { supabase, user } as const;
}

export const GET: APIRoute = async (context) => {
  const auth = await requireActiveUser(context);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const url = new URL(context.request.url);
  const session_id = url.searchParams.get("session_id");
  if (!session_id) return new Response(JSON.stringify({ error: "Thiếu session_id" }), { status: 400 });

  // Kiểm tra session thuộc user (RLS cũng bảo vệ nhưng check sớm để trả 403 rõ ràng)
  const { data: session } = await supabase.from("ai_sessions").select("id").eq("id", session_id).eq("user_id", user.id).maybeSingle();
  if (!session) return new Response(JSON.stringify({ error: "Phiên không tồn tại hoặc không thuộc bạn." }), { status: 403 });

  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 200);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0"), 0);

  const { data, error } = await supabase
    .from("ai_messages")
    .select("id, session_id, role, ciphertext, iv, model_name, is_error, created_at")
    .eq("session_id", session_id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ messages: data || [] }), { status: 200, headers: { "Cache-Control": "no-store" } });
};

export const POST: APIRoute = async (context) => {
  const auth = await requireActiveUser(context);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  try {
    const body = await context.request.json();
    const { session_id, role, ciphertext, iv, model_name, is_error } = body;

    if (!session_id || !role || !ciphertext || !iv) {
      return new Response(JSON.stringify({ error: "Thiếu session_id, role, ciphertext, iv" }), { status: 400 });
    }
    if (!["user","model"].includes(role)) {
      return new Response(JSON.stringify({ error: "role không hợp lệ" }), { status: 400 });
    }

    // Verify session ownership
    const { data: session } = await supabase.from("ai_sessions").select("id").eq("id", session_id).eq("user_id", user.id).maybeSingle();
    if (!session) return new Response(JSON.stringify({ error: "Phiên không tồn tại." }), { status: 403 });

    const { data, error } = await supabase
      .from("ai_messages")
      .insert({
        session_id,
        user_id: user.id,
        role,
        ciphertext,
        iv,
        model_name: model_name || null,
        is_error: !!is_error,
      })
      .select("id, session_id, role, ciphertext, iv, model_name, is_error, created_at")
      .single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

    // Cập nhật updated_at cho session để sort đúng
    await supabase.from("ai_sessions").update({ updated_at: new Date().toISOString() }).eq("id", session_id).eq("user_id", user.id);

    return new Response(JSON.stringify({ message: data }), { status: 201 });
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
  const session_id = url.searchParams.get("session_id");

  // Xóa 1 message hoặc toàn bộ session messages
  if (id) {
    const { error } = await supabase.from("ai_messages").delete().eq("id", id).eq("user_id", user.id);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }
  if (session_id) {
    const { error } = await supabase.from("ai_messages").delete().eq("session_id", session_id).eq("user_id", user.id);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }
  return new Response(JSON.stringify({ error: "Thiếu id hoặc session_id" }), { status: 400 });
};
