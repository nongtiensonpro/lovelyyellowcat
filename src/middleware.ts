import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerClient } from "./lib/supabase";

// Các route quản trị CHỈ dành cho admin (editor bị chặn)
const ADMIN_ONLY_PREFIXES = [
  "/admin/users",
  "/admin/settings",
  "/admin/analytics",
  "/admin/announcements",
  "/admin/trash",
  "/admin/media",
];

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // ────────────────────────────────────────────────
  // 1) Bảo vệ khu vực /admin
  // ────────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    try {
      const supabase = createSupabaseServerClient(context);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return new Response(null, {
          status: 302,
          headers: { Location: `${url.origin}/?error=unauthorized` },
        });
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, is_banned")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.is_banned) {
        await supabase.auth.signOut();
        return new Response(null, {
          status: 302,
          headers: { Location: `${url.origin}/?error=banned` },
        });
      }

      if (error || !profile || (profile.role !== "admin" && profile.role !== "editor")) {
        return new Response(null, {
          status: 302,
          headers: { Location: `${url.origin}/?error=unauthorized` },
        });
      }

      if (ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) && profile.role !== "admin") {
        return new Response(null, {
          status: 302,
          headers: { Location: `${url.origin}/admin?error=admin-only` },
        });
      }
    } catch (err) {
      console.error("[MIDDLEWARE] Admin gate crash:", err);
      return new Response(null, {
        status: 302,
        headers: { Location: `${url.origin}/?error=server-error` },
      });
    }
  }

  // ────────────────────────────────────────────────
  // 2) Cổng MAINTENANCE MODE — chỉ kiểm tra với yêu cầu trang công khai (GET)
  //    Fast-path: nếu cờ tắt thì không tốn thêm truy vấn user nào.
  // ────────────────────────────────────────────────
  const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(pathname);
  const isPublicPage =
    context.request.method === "GET" &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/auth") &&
    !hasFileExtension;

  if (isPublicPage) {
    try {
      const supabase = createSupabaseServerClient(context);
      const { data: setting } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "maintenance_mode")
        .maybeSingle();

      if (setting?.value?.enabled === true) {
        const { data: { user } } = await supabase.auth.getUser();
        let isStaff = false;
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();
          isStaff = profile?.role === "admin" || profile?.role === "editor";
        }

        if (!isStaff) {
          return new Response(
            `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>HỆ THỐNG BẢO TRÌ — LOVELYYELLOWCAT</title>
<meta name="robots" content="noindex, nofollow" />
<style>
  body{background:#0000aa;color:#fff;font-family:'Courier New',monospace;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:16px}
  .box{max-width:560px;text-align:center;line-height:1.7}
  h1{font-size:20px;letter-spacing:2px}
  .chip{background:#aaa;color:#00a;padding:2px 8px;font-weight:bold;font-size:12px}
  a{color:#ffff55}
</style>
</head>
<body>
  <div class="box">
    <p class="chip">LOVELYYELLOWCAT</p>
    <h1>🛠️ HỆ THỐNG ĐANG BẢO TRÌ 🛠️</h1>
    <p>Chúng tôi đang nâng cấp máy chủ Cybernet để mang lại trải nghiệm mượt mà hơn.<br />Vui lòng quay lại sau ít phút nhé! 🐱💾</p>
    <p style="font-size:12px;opacity:.8">ERROR: SYSTEM_MAINTENANCE.EXE · CODE 0x503</p>
  </div>
</body>
</html>`,
            {
              status: 503,
              headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "no-store",
                "Retry-After": "300",
              },
            }
          );
        }
      }
    } catch {
      // Bảng site_settings chưa tồn tại (chưa chạy migration) → bỏ qua cổng bảo trì
    }
  }

  // ────────────────────────────────────────────────
  // 3) Chặn tài khoản bị cấm ở các route cần xác thực
  // ────────────────────────────────────────────────
  if (pathname.startsWith("/submit") || pathname.startsWith("/api/submissions") || pathname.startsWith("/api/comments") || pathname.startsWith("/api/reactions")) {
    try {
      const supabase = createSupabaseServerClient(context);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_banned")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.is_banned) {
          await supabase.auth.signOut();
          return new Response(null, {
            status: 302,
            headers: { Location: `${url.origin}/?error=banned` },
          });
        }
      }
    } catch (err) {
      console.error("[MIDDLEWARE] Ban check error:", err);
    }
  }

  // ────────────────────────────────────────────────
  // 4) Route xác thực auth không được cache bởi CDN/browser
  // ────────────────────────────────────────────────
  if (pathname === "/auth/callback" || pathname.startsWith("/api/auth/")) {
    const response = await next();
    response.headers.set("Cache-Control", "no-store, private, max-age=0");
    response.headers.set("CDN-Cache-Control", "no-store");
    response.headers.set("Pragma", "no-cache");
    return response;
  }

  return next();
});
