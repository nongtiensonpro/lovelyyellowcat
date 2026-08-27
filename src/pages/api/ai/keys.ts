import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../../lib/supabase";

/**
 * Helper: yêu cầu đăng nhập + tài khoản hoạt động (is_banned = false)
 * Trả về 401/403 nếu không đạt, ngược lại trả về { supabase, user }
 */
async function requireActiveUser(context: { request: Request; cookies: any }) {
  const supabase = createSupabaseServerClient(context as any);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: new Response(JSON.stringify({ error: "Chưa đăng nhập. Vui lòng đăng nhập để sử dụng AI." }), { status: 401 }) } as const;
  }
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_banned")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { error: new Response(JSON.stringify({ error: "Lỗi kiểm tra tài khoản." }), { status: 500 }) } as const;
  }
  if (profile && (profile as any).is_banned) {
    return { error: new Response(JSON.stringify({ error: "Tài khoản đã bị chặn, không thể sử dụng AI." }), { status: 403 }) } as const;
  }
  // Nếu profile chưa tồn tại (user mới) -> coi như hoạt động (sẽ tạo sau)
  return { supabase, user } as const;
}

export const GET: APIRoute = async (context) => {
  const auth = await requireActiveUser(context);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("ai_user_keys")
    .select("encrypted_master_key, kek_salt, kek_iterations, iv_wrap, created_at, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  if (!data) {
    return new Response(JSON.stringify({ exists: false }), { status: 200 });
  }
  return new Response(JSON.stringify({ exists: true, ...data }), { status: 200 });
};

export const PUT: APIRoute = async (context) => {
  const auth = await requireActiveUser(context);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  try {
    const body = await context.request.json();
    const { encrypted_master_key, kek_salt, kek_iterations, iv_wrap } = body;

    if (!encrypted_master_key || !kek_salt || !iv_wrap) {
      return new Response(JSON.stringify({ error: "Thiếu trường mã hóa." }), { status: 400 });
    }

    const iterations = Number(kek_iterations) || 250000;
    if (iterations < 100000) {
      return new Response(JSON.stringify({ error: "iterations quá thấp." }), { status: 400 });
    }

    const { error } = await supabase.from("ai_user_keys").upsert(
      {
        user_id: user.id,
        encrypted_master_key,
        kek_salt,
        kek_iterations: iterations,
        iv_wrap,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Lỗi server" }), { status: 500 });
  }
};

export const DELETE: APIRoute = async (context) => {
  const auth = await requireActiveUser(context);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  // Xóa khóa = mất khả năng giải mã (zero-knowledge) — cảnh báo ở UI
  const { error } = await supabase.from("ai_user_keys").delete().eq("user_id", user.id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
