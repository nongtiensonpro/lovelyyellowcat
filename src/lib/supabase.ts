import { createServerClient, parseCookieHeader, type CookieOptionsWithName } from "@supabase/ssr";  
import type { AstroCookies } from "astro";
import { env } from "cloudflare:workers";

export const cookieOptions: CookieOptionsWithName = {  
  path: "/",  
  secure: true,  
  httpOnly: true,  
  sameSite: "lax",  
};

export function createSupabaseServerClient(context: { request: Request; cookies: AstroCookies }) {  
  const supabaseUrl = (env as any)?.PUBLIC_SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL;  
  const supabaseAnonKey = (env as any)?.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {  
    throw new Error("Biến môi trường của Supabase chưa được thiết lập đầy đủ.");  
  }

  return createServerClient(  
    supabaseUrl,  
    supabaseAnonKey,  
    {  
      cookieOptions,  
      cookies: {  
        getAll() {  
          return parseCookieHeader(context.request.headers.get("Cookie") ?? "");  
        },  
        setAll(cookiesToSet) {  
          cookiesToSet.forEach(({ name, value, options }) => {  
            context.cookies.set(name, value, { ...cookieOptions, ...options });  
          });  
        },  
      },  
    }  
  );  
}

/**
 * Lấy thông tin người dùng hiện tại và hồ sơ (profile).
 * Đảm bảo luôn trả về profile hợp lệ từ Auth metadata kể cả khi bảng `profiles` chưa kịp tạo record.
 */
export async function getCurrentUserProfile(supabase: ReturnType<typeof createSupabaseServerClient>) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return null;

    // 1. Thử truy vấn bảng profiles bằng maybeSingle để không ném lỗi nếu chưa có row
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      return profile;
    }

    // 2. Fallback nếu bảng profiles chưa có row (do trigger chưa chạy)
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Thành viên";
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

    const fallbackProfile = {
      id: user.id,
      email: user.email ?? "",
      full_name: fullName,
      avatar_url: avatarUrl,
      role: "member",
      is_banned: false,
    };

    // Tự động đồng bộ/upsert vào bảng profiles nếu có quyền
    try {
      await supabase.from("profiles").upsert({
        id: user.id,
        email: fallbackProfile.email,
        full_name: fallbackProfile.full_name,
        avatar_url: fallbackProfile.avatar_url,
      }, { onConflict: "id" });
    } catch {
      // Bỏ qua lỗi DB nếu RLS chặn, vẫn dùng fallbackProfile để hiển thị UI đăng nhập
    }

    return fallbackProfile;
  } catch (err) {
    console.error("[AUTH] Lỗi khi lấy thông tin user profile:", err);
    return null;
  }
}
