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

  // Màn hình 403 độc lập: giữ nguyên URL redirect `/?error=unauthorized`
  // nhưng không khởi động toàn bộ trang chủ hoặc các component cần đăng nhập.
  if (pathname === "/" && url.searchParams.get("error") === "unauthorized") {
    return context.rewrite(new URL("/unauthorized", url));
  }

  // Màn hình BANNED độc lập: hiển thị trang chặn rõ ràng thay vì trang chủ mờ nhạt
  // Giữ lại query ?reason & ?at nếu có để hiển thị chi tiết lệnh chặn
  if (pathname === "/" && url.searchParams.get("error") === "banned") {
    const rewriteUrl = new URL("/banned", url);
    rewriteUrl.search = url.search;
    return context.rewrite(rewriteUrl);
  }

  // Cho phép truy cập trực tiếp /banned và /unauthorized mà không bị chặn bởi maintenance
  if (pathname === "/banned" || pathname === "/unauthorized") {
    return next();
  }

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
        .select("role, is_banned, ban_reason, banned_at")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.is_banned) {
        const reason = (profile as any).ban_reason || "";
        const at = (profile as any).banned_at || "";
        await supabase.auth.signOut();
        const bannedUrl = new URL("/banned", url.origin);
        if (reason) bannedUrl.searchParams.set("reason", reason);
        if (at) bannedUrl.searchParams.set("at", at);
        return new Response(null, {
          status: 302,
          headers: { Location: bannedUrl.toString() },
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
    <hr style="border:none;border-top:1px dashed rgba(255,255,255,.35);margin:18px 0" />
    <p style="font-size:12px">
      🔑 Bạn là quản trị viên?
      <a href="/api/auth/signin" style="color:#ffff55;font-weight:bold">Đăng nhập tại đây</a>
      — sau khi đăng nhập bằng tài khoản admin/editor, trang sẽ tự mở lại bình thường
      và bạn có thể tắt bảo trì trong <a href="/admin/settings" style="color:#ffff55">C:\ADMIN\SETTINGS</a>.
    </p>
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
          .select("is_banned, ban_reason, banned_at")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.is_banned) {
          const reason = (profile as any).ban_reason || "";
          const at = (profile as any).banned_at || "";
          await supabase.auth.signOut();
          const bannedUrl = new URL("/banned", url.origin);
          if (reason) bannedUrl.searchParams.set("reason", reason);
          if (at) bannedUrl.searchParams.set("at", at);
          return new Response(null, {
            status: 302,
            headers: { Location: bannedUrl.toString() },
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

  // ────────────────────────────────────────────────
  // 5) Bắt lỗi SSR toàn cục: log vào Workers Logs và hiển thị cửa sổ
  //    chẩn đoán cho route /admin thay vì 500 trắng tinh vô hình.
  // ────────────────────────────────────────────────
  try {
    return await next();
  } catch (err: any) {
    console.error(`[SSR ERROR] ${context.request.method} ${pathname}:`, err);

    const rawDetail = err?.stack || err?.message || String(err);
    const detail = rawDetail.slice(0, 4000).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    if (pathname.startsWith("/admin")) {
      return new Response(
        `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>LỖI HỆ THỐNG — LOVELYYELLOWCAT ADMIN</title>
<style>
  body{background:#0b001a;color:#e8d5ff;font-family:'Courier New',monospace;margin:0;padding:24px;display:flex;justify-content:center}
  .box{max-width:860px;width:100%;background:#c0c0c0;color:#000;padding:3px;box-shadow:inset -1px -1px 0 #404040,inset 1px 1px 0 #dfdfdf,inset -2px -2px 0 #808080,inset 2px 2px 0 #c0c0c0}
  .bar{background:linear-gradient(90deg,#000080,#1084d0);color:#fff;font-weight:bold;font-size:12px;padding:3px 6px;display:flex;justify-content:space-between}
  .body{padding:14px;font-size:13px;line-height:1.6}
  pre{background:#000;color:#05ffa1;padding:10px;overflow:auto;max-height:340px;font-size:11px;white-space:pre-wrap;word-break:break-all;border:2px inset #808080}
  a.btn{display:inline-block;background:#c0c0c0;color:#000;text-decoration:none;font-weight:bold;font-size:12px;padding:6px 12px;margin-right:8px;border:2px outset #fff}
  .hint{font-size:11px;color:#444;margin-top:10px}
</style>
</head>
<body>
  <div class="box">
    <div class="bar"><span>❌ SYSTEM_CRASH.DMP — ${pathname}</span><span>500</span></div>
    <div class="body">
      <p><strong>Trang quản trị gặp lỗi khi render phía server.</strong> Chi tiết kỹ thuật bên dưới — hãy gửi cho lập trình viên hoặc tự đối chiếu:</p>
      <pre>${detail}</pre>
      <p class="hint">Nội dung này cũng đã được ghi vào Cloudflare Workers Logs (tab Logs trên Dashboard Cloudflare).</p>
      <p style="margin-top:14px">
        <a class="btn" href="/admin">🏠 Về Bảng Điều Khiển</a>
        <a class="btn" href="/">↩ Thoát ra Trang Chủ</a>
      </p>
    </div>
  </div>
</body>
</html>`,
        {
          status: 500,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          },
        }
      );
    }

    return new Response("Lỗi máy chủ nội bộ. Vui lòng thử lại sau.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
});
