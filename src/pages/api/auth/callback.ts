import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../../lib/supabase";
import { sendWelcomeEmail } from "../../../lib/emailNotification";
import { env } from "cloudflare:workers";

/**
 * Kiểm tra và làm sạch URL chuyển hướng chống lỗ hổng Open Redirect (CWE-601)
 */
function sanitizeRedirectUrl(target: string | null | undefined): string {
  if (!target) return "/";
  const trimmed = target.trim();
  // Chỉ cho phép đường dẫn tương đối nội bộ (bắt đầu bằng / và không phải // hoặc /\)
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\")) {
    return trimmed;
  }
  return "/";
}

export const GET: APIRoute = async ({ request, cookies, redirect, url }) => {
  const code = url.searchParams.get("code");
  const rawNext = url.searchParams.get("next");
  const next = sanitizeRedirectUrl(rawNext);

  if (code) {
    const supabase = createSupabaseServerClient({ request, cookies });

    // Trao đổi mã code lấy token phiên đăng nhập (session token) từ Supabase Auth
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Đảm bảo profile luôn tồn tại và kiểm tra welcome email
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Thành viên mới";
          const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

          // 1. Tự động upsert vào bảng profiles để chắc chắn database luôn có thông tin user
          try {
            await supabase.from("profiles").upsert({
              id: user.id,
              email: user.email,
              full_name: fullName,
              avatar_url: avatarUrl,
            }, { onConflict: "id" });
          } catch (upsertErr) {
            console.error("[AUTH] Lỗi upsert profile:", upsertErr);
          }

          // 2. Lấy profile để kiểm tra welcome email
          const { data: profile } = await supabase
            .from("profiles")
            .select("created_at, full_name, email")
            .eq("id", user.id)
            .maybeSingle();

          // Nếu profile mới tạo trong 60 giây → là người dùng mới → gửi welcome email
          if (profile?.created_at) {
            const createdAt = new Date(profile.created_at).getTime();
            const now = Date.now();
            const isNewUser = (now - createdAt) < 60_000;

            if (isNewUser && (profile.email || user.email)) {
              sendWelcomeEmail({
                recipientEmail: profile.email || user.email!,
                recipientName: profile.full_name || user.user_metadata?.full_name || "Thành viên mới",
                contactEmail: "nongtiensonpro@gmail.com",
              }, env).catch((err: any) => {
                console.error("[AUTH] Lỗi gửi welcome email:", err.message);
              });
            }
          }
        }
      } catch (welcomeErr: any) {
        console.error("[AUTH] Welcome email check error:", welcomeErr.message);
      }

      // Astro APIRoute tự động gộp tất cả cookies được tạo bởi cookies.set() vào Response redirect
      return redirect(next, 307);
    }

    // Xử lý duplicate request / replay flow nếu đã có phiên
    const errorCode = (error as any)?.code || "";
    const errorMessage = (error as any)?.message || "";
    const isReplayedFlow =
      errorCode === "flow_state_already_used" ||
      errorMessage.includes("flow_state_already_used") ||
      errorMessage.includes("State has already been used");

    if (isReplayedFlow) {
      const { data: { user: existingUser } } = await supabase.auth.getUser();
      if (existingUser) {
        return redirect(next, 307);
      }
    }

    console.error("Lỗi trao đổi mã code xác thực:", error.message);
  }

  // Chuyển hướng về trang chủ kèm cờ thông báo lỗi nếu thất bại
  return redirect("/?error=auth-failed", 307);
};
