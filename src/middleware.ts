import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerClient } from "./lib/supabase";

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);

  // Bảo vệ các tuyến đường thuộc trang quản trị /admin
  if (url.pathname.startsWith("/admin")) {
    const supabase = createSupabaseServerClient(context);
    
    // Lấy thông tin người dùng từ token phiên đăng nhập
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Chuyển hướng nếu chưa đăng nhập
      return context.redirect(new URL("/?error=unauthorized", context.url).toString());
    }

    // Truy vấn thông tin vai trò trong bảng profiles
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error || !profile || (profile.role !== "admin" && profile.role !== "editor")) {
      // Chuyển hướng nếu không có quyền quản trị/biên tập viên
      return context.redirect(new URL("/?error=unauthorized", context.url).toString());
    }
  }

  return next();
});
