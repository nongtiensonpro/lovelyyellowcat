import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../lib/supabase";
import { env } from "cloudflare:workers";

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseServerClient({ request, cookies });

  // 1. Kiểm tra session người dùng
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Chưa đăng nhập." }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, image_url, image_pid, recaptcha_token } = body;

    if (!title || !image_url || !image_pid) {
      return new Response(JSON.stringify({ error: "Vui lòng hoàn thành tải ảnh và điền tiêu đề tác phẩm." }), { status: 400 });
    }

    // 1.5 Xác thực Google reCAPTCHA v2 chống bot spam
    const recaptchaSecret = (env as any)?.RECAPTCHA_SECRET_KEY || import.meta.env.RECAPTCHA_SECRET_KEY;
    if (recaptchaSecret) {
      if (!recaptcha_token) {
        return new Response(JSON.stringify({ error: "Yêu cầu xác minh danh tính qua Google reCAPTCHA." }), { status: 400 });
      }

      const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: recaptchaSecret,
          response: recaptcha_token,
          remoteip: request.headers.get("CF-Connecting-IP") || ""
        })
      });

      const verifyData: any = await verifyRes.json();
      if (!verifyData.success || verifyData.score < 0.5) {
        console.log("[reCAPTCHA v3] Bot detected. Score:", verifyData.score);
        return new Response(JSON.stringify({ error: "Hệ thống chống bot từ chối yêu cầu của bạn (Điểm bảo mật quá thấp)." }), { status: 400 });
      }
    } else {
      console.warn("[API SUBMISSIONS] Cảnh báo: RECAPTCHA_SECRET_KEY chưa được cấu hình ở môi trường.");
    }

    const { data, error } = await supabase
      .from("submissions")
      .insert({
        author_id: user.id,
        title: title.trim(),
        description: description.trim(),
        image_url: image_url.trim(),
        image_pid: image_pid.trim(),
        status: "pending" // Mặc định chờ duyệt
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, data }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
