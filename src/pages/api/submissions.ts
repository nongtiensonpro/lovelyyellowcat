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
    // 0. Kiểm tra công tắc nhận tranh từ site_settings (editor/admin được bỏ qua)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const isStaff = profile?.role === "admin" || profile?.role === "editor";

    if (!isStaff) {
      const { data: gate } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "submissions_open")
        .maybeSingle();
      if (gate && gate.value?.enabled === false) {
        return new Response(
          JSON.stringify({ error: "Phòng triển lãm tạm đóng cửa nhận tác phẩm mới. Vui lòng quay lại sau nhé! 🐱" }),
          { status: 423 }
        );
      }
    }

    const body = await request.json();
    const {
      title,
      description,
      image_url,
      image_pid,
      tags,
      recaptcha_token,
      recaptcha_declined,
      website_hp,
      rights_confirmed,
      is_ai_generated,
    } = body;

    // Chống bot honeypot
    if (typeof website_hp === "string" && website_hp.trim() !== "") {
      return new Response(JSON.stringify({ error: "Yêu cầu bị từ chối bởi bộ lọc chống spam." }), { status: 400 });
    }

    if (!title || !image_url || !image_pid) {
      return new Response(JSON.stringify({ error: "Vui lòng hoàn thành tải ảnh và điền tiêu đề tác phẩm." }), { status: 400 });
    }

    if (rights_confirmed !== true) {
      return new Response(
        JSON.stringify({ error: "Vui lòng xác nhận quyền tác giả và đồng ý hiển thị tác phẩm trước khi gửi." }),
        { status: 400 }
      );
    }

    // 1.5 Xác thực Google reCAPTCHA v3 hoặc fallback an toàn khi người dùng từ chối consent reCAPTCHA (Luật 91/2025)
    const recaptchaSecret = (env as unknown as Record<string, string | undefined>)?.RECAPTCHA_SECRET_KEY || import.meta.env.RECAPTCHA_SECRET_KEY;
    if (recaptchaSecret) {
      if (recaptcha_token) {
        const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            secret: recaptchaSecret,
            response: recaptcha_token,
            remoteip: request.headers.get("CF-Connecting-IP") || ""
          })
        });

        const verifyData = (await verifyRes.json()) as { success?: boolean; score?: number };
        if (!verifyData.success || (verifyData.score ?? 0) < 0.5) {
          console.log("[reCAPTCHA v3] Bot detected. Score:", verifyData.score);
          return new Response(JSON.stringify({ error: "Hệ thống chống bot từ chối yêu cầu của bạn (Điểm bảo mật quá thấp)." }), { status: 400 });
        }
      } else if (recaptcha_declined === true) {
        // Fallback rate limit theo user_id (tối đa 5 bài / giờ) khi người dùng không bật consent reCAPTCHA
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from("submissions")
          .select("id", { count: "exact", head: true })
          .eq("author_id", user.id)
          .gte("created_at", oneHourAgo);

        if ((count ?? 0) >= 5 && !isStaff) {
          return new Response(
            JSON.stringify({ error: "Bạn đã đạt giới hạn tối đa 5 tác phẩm mỗi giờ (chế độ không reCAPTCHA). Vui lòng thử lại sau." }),
            { status: 429 }
          );
        }
      } else {
        return new Response(JSON.stringify({ error: "Yêu cầu xác minh danh tính qua Google reCAPTCHA hoặc chọn chế độ dự phòng." }), { status: 400 });
      }
    } else {
      console.warn("[API SUBMISSIONS] Cảnh báo: RECAPTCHA_SECRET_KEY chưa được cấu hình ở môi trường.");
    }

    // Chuẩn hóa tags & tự động gắn nhãn ai_generated (Điều 18 NĐ 142/2026)
    const sanitizedTags: string[] = Array.isArray(tags)
      ? tags
          .filter((t): t is string => typeof t === "string" && /^[a-z0-9_]{2,32}$/i.test(t.trim()))
          .map((t) => t.trim().toLowerCase())
          .slice(0, 10)
      : ["vaporwave"];
    if (is_ai_generated === true && !sanitizedTags.includes("ai_generated")) {
      sanitizedTags.push("ai_generated");
    }

    const { data, error } = await supabase
      .from("submissions")
      .insert({
        author_id: user.id,
        title: String(title).trim(),
        description: typeof description === "string" ? description.trim() : "",
        image_url: String(image_url).trim(),
        image_pid: String(image_pid).trim(),
        tags: sanitizedTags,
        status: "pending" // Mặc định chờ duyệt
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, data }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500 });
  }
};
