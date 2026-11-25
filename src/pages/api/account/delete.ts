import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { createSupabaseServerClient } from "../../../lib/supabase";
import { deleteCloudinaryImages } from "../../../lib/cloudinary";
import { sendAccountDeletedEmail } from "../../../lib/emailNotification";

/**
 * Trích xuất Cloudinary public_id từ secure_url nếu ảnh thuộc Cloudinary
 */
function extractCloudinaryPublicId(url?: string | null): string | null {
  if (!url || !url.includes("res.cloudinary.com")) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+(?:\?.*)?$/);
  return match?.[1] || null;
}

/**
 * POST /api/account/delete
 * Thực hiện quyền xóa tài khoản & toàn bộ dữ liệu cá nhân theo Luật 91/2025/QH15
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  return handleDeleteAccount({ request, cookies });
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  return handleDeleteAccount({ request, cookies });
};

async function handleDeleteAccount({ request, cookies }: { request: Request; cookies: import("astro").AstroCookies }) {
  const supabase = createSupabaseServerClient({ request, cookies });
  const runtimeEnv = env as unknown as Record<string, string | undefined>;

  // 1. Kiểm tra xác thực người dùng
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Yêu cầu đăng nhập để thực hiện xóa tài khoản." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    let body: { confirmation?: string; reason?: string } = {};
    try {
      body = await request.json();
    } catch {
      // nếu không có json body
    }

    // 2. Xác thực chuỗi xác nhận an toàn chống bấm nhầm
    if (body.confirmation !== "XOA TAI KHOAN") {
      return new Response(
        JSON.stringify({
          error: "Vui lòng nhập chính xác cụm từ 'XOA TAI KHOAN' để xác nhận yêu cầu xóa vĩnh viễn.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    const userEmail = user.email || "";

    // 3. Lấy danh sách ảnh tác phẩm & thông tin hồ sơ để xóa trên Cloudinary CDN
    const [{ data: submissions }, { data: profile }] = await Promise.all([
      supabase.from("submissions").select("image_pid").eq("author_id", userId),
      supabase.from("profiles").select("full_name, banner_url").eq("id", userId).maybeSingle(),
    ]);

    const publicIdsToDelete: string[] = [];
    if (submissions && submissions.length > 0) {
      for (const item of submissions) {
        if (item.image_pid && typeof item.image_pid === "string") {
          publicIdsToDelete.push(item.image_pid);
        }
      }
    }
    const bannerPid = extractCloudinaryPublicId(profile?.banner_url);
    if (bannerPid) publicIdsToDelete.push(bannerPid);

    // 4. Xóa ảnh trên Cloudinary nếu có public_ids
    if (publicIdsToDelete.length > 0) {
      try {
        await deleteCloudinaryImages(publicIdsToDelete, runtimeEnv);
      } catch (cdnErr) {
        console.warn("[DELETE ACCOUNT] Cảnh báo lỗi xóa ảnh Cloudinary:", cdnErr);
      }
    }

    // 5. Xóa khóa AI nếu có
    await supabase.from("ai_user_keys").delete().eq("user_id", userId);

    // 6. Thực hiện xóa hoàn toàn qua RPC delete_own_account() (xóa auth.users -> cascade mọi bảng),
    //    fallback sang xóa trực tiếp public.profiles nếu instance chưa chạy migration RPC.
    const { error: rpcError } = await supabase.rpc("delete_own_account");
    if (rpcError) {
      const { error: profileDeleteError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (profileDeleteError) {
        console.error("[DELETE ACCOUNT ERROR] Lỗi xóa profile:", profileDeleteError);
        return new Response(
          JSON.stringify({ error: "Không thể hoàn tất xóa tài khoản từ cơ sở dữ liệu: " + profileDeleteError.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // 7. Gửi email xác nhận xóa dữ liệu (fail-silent nếu chưa cấu hình SMTP)
    if (userEmail) {
      try {
        await sendAccountDeletedEmail(
          {
            recipientEmail: userEmail,
            recipientName: profile?.full_name || "Thành viên",
            purgedMediaCount: publicIdsToDelete.length,
          },
          runtimeEnv
        );
      } catch {
        // Không làm gián đoạn phản hồi xóa tài khoản nếu SMTP lỗi
      }
    }

    // 8. Đăng xuất phiên làm việc của người dùng
    await supabase.auth.signOut();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Tài khoản và toàn bộ dữ liệu cá nhân liên quan đã được xóa hoàn toàn khỏi LovelyYellowCat.",
        purged_media_count: publicIdsToDelete.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("[DELETE ACCOUNT EXCEPTION]:", err);
    return new Response(
      JSON.stringify({ error: "Đã xảy ra lỗi không xác định khi xử lý xóa tài khoản." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
