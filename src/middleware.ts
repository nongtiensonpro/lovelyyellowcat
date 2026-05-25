import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerClient } from "./lib/supabase";

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);

  // Bảo vệ các tuyến đường thuộc trang quản trị /admin
  if (url.pathname.startsWith("/admin")) {
    console.log("[MIDDLEWARE] ====== Xử lý request /admin ======");
    console.log("[MIDDLEWARE] Full URL:", url.href);
    console.log("[MIDDLEWARE] Cookie present:", !!context.request.headers.get("Cookie"));
    try {
      const supabase = createSupabaseServerClient(context);
      console.log("[MIDDLEWARE] Supabase client tạo thành công");

      // Lấy thông tin người dùng từ token phiên đăng nhập
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log("[MIDDLEWARE] getUser - User ID:", user?.id || "KHÔNG CÓ", "| Error:", userError?.message || "không");

      if (!user) {
        console.log("[MIDDLEWARE] → Redirect: chưa đăng nhập");
        // Chuyển hướng nếu chưa đăng nhập
        return new Response(null, {
          status: 302,
          headers: { Location: `${url.origin}/?error=unauthorized` },
        });
      }

      // Truy vấn thông tin vai trò và trạng thái cấm trong bảng profiles
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, is_banned")
        .eq("id", user.id)
        .single();

      console.log("[MIDDLEWARE] Profile query - Role:", profile?.role || "KHÔNG CÓ", "| Banned:", profile?.is_banned, "| Error:", error?.message || "không");

      // Kiểm tra người dùng bị cấm
      if (profile?.is_banned) {
        console.log("[MIDDLEWARE] → Redirect: tài khoản bị cấm. User:", user.id);
        await supabase.auth.signOut();
        return new Response(null, {
          status: 302,
          headers: { Location: `${url.origin}/?error=banned` },
        });
      }

      if (error || !profile || (profile.role !== "admin" && profile.role !== "editor")) {
        console.log("[MIDDLEWARE] → Redirect: không đủ quyền. Role =", profile?.role);
        // Chuyển hướng nếu không có quyền quản trị/biên tập viên
        return new Response(null, {
          status: 302,
          headers: { Location: `${url.origin}/?error=unauthorized` },
        });
      }

      // Chỉ admin mới truy cập được /admin/users
      if (url.pathname.startsWith("/admin/users") && profile.role !== "admin") {
        console.log("[MIDDLEWARE] → Redirect: editor cố truy cập /admin/users");
        return new Response(null, {
          status: 302,
          headers: { Location: `${url.origin}/admin?error=admin-only` },
        });
      }

      console.log("[MIDDLEWARE] ✅ Cho phép truy cập /admin. User:", user.id, "Role:", profile.role);
    } catch (err) {
      console.error("[MIDDLEWARE] ❌ CRASH:", err);
      return new Response(null, {
        status: 302,
        headers: { Location: `${url.origin}/?error=server-error` },
      });
    }
  }

  // Kiểm tra trạng thái cấm cho các route cần xác thực (submit, API)
  if (url.pathname.startsWith("/submit") || url.pathname.startsWith("/api/submissions") || url.pathname.startsWith("/api/comments") || url.pathname.startsWith("/api/reactions")) {
    try {
      const supabase = createSupabaseServerClient(context);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_banned")
          .eq("id", user.id)
          .single();

        if (profile?.is_banned) {
          console.log("[MIDDLEWARE] → Chặn user bị cấm truy cập:", url.pathname);
          await supabase.auth.signOut();
          return new Response(null, {
            status: 302,
            headers: { Location: `${url.origin}/?error=banned` },
          });
        }
      }
    } catch (err) {
      console.error("[MIDDLEWARE] ❌ Ban check error:", err);
    }
  }

  console.log("[MIDDLEWARE] → Gọi next() cho:", url.pathname);
  return next();
});
