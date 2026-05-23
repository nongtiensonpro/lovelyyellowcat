import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerClient } from "./lib/supabase";

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);

  // Bảo vệ các tuyến đường thuộc trang quản trị /admin
  if (url.pathname.startsWith("/admin")) {
    try {
      const supabase = createSupabaseServerClient(context);

      // Lấy thông tin người dùng từ token phiên đăng nhập
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
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

      if (error || !profile || (profile.role !== "admin" && profile.role !== "editor")) {
        // Chuyển hướng nếu không có quyền quản trị/biên tập viên
        return new Response(null, {
          status: 302,
          headers: { Location: `${url.origin}/?error=unauthorized` },
        });
      }
    } catch (err) {
      console.error("Middleware /admin error:", err);
      return new Response(null, {
        status: 302,
        headers: { Location: `${url.origin}/?error=server-error` },
      });
    }
  }

  return next();
});
