import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../../lib/supabase";

/**
 * GET /api/account/export
 * Xuất toàn bộ dữ liệu cá nhân của người dùng (Data Portability) theo Luật 91/2025/QH15
 */
export const GET: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseServerClient({ request, cookies });

  // 1. Kiểm tra xác thực người dùng
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Yêu cầu đăng nhập để thực hiện xuất dữ liệu cá nhân." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const userId = user.id;

    // 2. Thu thập dữ liệu song song qua RLS (chỉ đọc dữ liệu của chính user)
    const [
      profileRes,
      submissionsRes,
      commentsRes,
      reactionsRes,
      favoritesRes,
      bookmarksRes,
      notificationsRes,
      pointsRes,
      badgesRes,
      aiSessionsRes,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("submissions").select("*").eq("author_id", userId),
      supabase.from("comments").select("*").eq("profile_id", userId),
      supabase.from("reactions").select("*").eq("profile_id", userId),
      supabase.from("favorites").select("*").eq("profile_id", userId),
      supabase.from("bookmarks").select("*").eq("profile_id", userId),
      supabase.from("notifications").select("*").eq("recipient", userId),
      supabase.from("user_points").select("*").eq("profile_id", userId).maybeSingle(),
      supabase.from("user_badges").select("*, badges(*)").eq("profile_id", userId),
      supabase.from("ai_sessions").select("id, title, created_at, updated_at").eq("user_id", userId),
    ]);

    // Lấy tin nhắn AI tương ứng nếu có session
    let aiMessagesData: unknown[] = [];
    if (aiSessionsRes.data && aiSessionsRes.data.length > 0) {
      const sessionIds = aiSessionsRes.data.map((s) => s.id);
      const { data: msgs } = await supabase
        .from("ai_messages")
        .select("id, session_id, role, created_at, ciphertext, iv")
        .in("session_id", sessionIds);
      aiMessagesData = msgs || [];
    }

    // 3. Đóng gói payload theo chuẩn
    const exportPayload = {
      _export_metadata: {
        platform: "LovelyYellowCat — Tạp chí nghệ thuật số Vaporwave",
        legal_basis: "Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 & Nghị định 356/2025/NĐ-CP",
        export_timestamp: new Date().toISOString(),
        user_id: userId,
        email: user.email,
        notice: "Bản sao lưu này chứa toàn bộ dữ liệu cá nhân gắn với tài khoản của bạn tại hệ thống.",
      },
      account: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      },
      profile: profileRes.data || null,
      submissions: submissionsRes.data || [],
      comments: commentsRes.data || [],
      reactions: reactionsRes.data || [],
      favorites: favoritesRes.data || [],
      bookmarks: bookmarksRes.data || [],
      notifications: notificationsRes.data || [],
      points_and_achievements: {
        points: pointsRes.data || null,
        badges: badgesRes.data || [],
      },
      ai_encrypted_workspace: {
        note: "Các tin nhắn AI được mã hóa đầu-cuối (E2EE) bằng thuật toán AES-GCM 256. Chỉ bạn có thể giải mã bằng mật khẩu/khóa của bạn trong Trạm AI.",
        sessions: aiSessionsRes.data || [],
        encrypted_messages: aiMessagesData,
      },
    };

    const filename = `lyc-data-export-${userId.slice(0, 8)}-${Date.now()}.json`;

    return new Response(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: unknown) {
    console.error("[API ACCOUNT EXPORT ERROR]:", err);
    return new Response(
      JSON.stringify({ error: "Không thể trích xuất dữ liệu. Vui lòng thử lại sau." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
