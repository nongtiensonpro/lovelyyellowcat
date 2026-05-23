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

      // Truy vấn thông tin vai trò trong bảng profiles
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      console.log("[MIDDLEWARE] Profile query - Role:", profile?.role || "KHÔNG CÓ", "| Error:", error?.message || "không");

      if (error || !profile || (profile.role !== "admin" && profile.role !== "editor")) {
        console.log("[MIDDLEWARE] → Redirect: không đủ quyền. Role =", profile?.role);
        // Chuyển hướng nếu không có quyền quản trị/biên tập viên
        return new Response(null, {
          status: 302,
          headers: { Location: `${url.origin}/?error=unauthorized` },
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

  console.log("[MIDDLEWARE] → Gọi next() cho:", url.pathname);
  return next();
});
