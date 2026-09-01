import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../../lib/supabase";
import { deleteArticleWithRelations } from "../../../lib/adminModeration";
import { logAdminAction } from "../../../lib/adminAudit";

/**
 * Helper: Xác thực editor/admin cho các thao tác trên bài viết.
 * Trả về { error } hoặc { supabase, userId, role, isAdmin }.
 */
type SupabaseClientAA = ReturnType<typeof import("../../../lib/supabase").createSupabaseServerClient>;
type StaffAuthResult =
  | { error: Response }
  | { supabase: SupabaseClientAA; userId: string; role: "editor" | "admin"; isAdmin: boolean };
async function authenticateStaff(context: { request: Request; cookies: import("astro").AstroCookies }): Promise<StaffAuthResult> {
  const supabase = createSupabaseServerClient({
    request: context.request,
    cookies: context.cookies,
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: new Response(JSON.stringify({ success: false, error: "Chưa đăng nhập." }), { status: 401, headers: { "Content-Type": "application/json" } }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "editor")) {
    return { error: new Response(JSON.stringify({ success: false, error: "Không đủ quyền truy cập." }), { status: 403, headers: { "Content-Type": "application/json" } }) };
  }

  return { supabase, userId: user.id, role: profile.role as "editor" | "admin", isAdmin: profile.role === "admin" };
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/**
 * GET /api/admin/articles?search=&status=&page=1&limit=20
 * Danh sách bài viết phân trang (editor chỉ thấy bài public + của mình theo RLS).
 */
export const GET: APIRoute = async (context) => {
  const auth = await authenticateStaff(context);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  try {
    const url = new URL(context.request.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const status = url.searchParams.get("status") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));

    let query = supabase
      .from("articles")
      .select("id, title, slug, status, view_count, created_at, published_at, tags, author_id, profiles(full_name)", { count: "exact" });

    if (search) query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%`);
    if (["published", "draft", "archived"].includes(status)) query = query.eq("status", status);

    query = query.order("created_at", { ascending: false });

    const from = (page - 1) * limit;
    const { data, count, error } = await query.range(from, from + limit - 1);

    if (error) throw new Error(error.message);

    return jsonResponse({
      success: true,
      data,
      pagination: { page, limit, total: count ?? 0, totalPages: Math.max(1, Math.ceil((count ?? 0) / limit)) },
    });
  } catch (err) {
    console.error("[API articles] GET failed:", err instanceof Error ? err.message : String(err));
    return jsonResponse({ success: false, error: "Lỗi khi tải danh sách bài viết." }, 500);
  }
};

/**
 * PATCH /api/admin/articles
 * Body: { ids: string[], status: "published" | "draft" | "archived" }
 * Đổi trạng thái một hoặc nhiều bài. Editor chỉ được tác động lên bài của mình;
 * admin tác động được mọi bài. Ghi audit log cho từng bài thành công.
 */
export const PATCH: APIRoute = async (context) => {
  const auth = await authenticateStaff(context);
  if ("error" in auth) return auth.error;
  const { supabase, userId, isAdmin } = auth;

  try {
    const body = await context.request.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : [];
    const status = String(body.status || "");

    if (ids.length === 0 || !["published", "draft", "archived"].includes(status)) {
      return jsonResponse({ success: false, error: "Thiếu ids hoặc status không hợp lệ." }, 400);
    }

    let done = 0;
    let skipped = 0;

    for (const id of ids) {
      const { data: art } = await supabase
        .from("articles")
        .select("id, title, status, author_id")
        .eq("id", id)
        .maybeSingle();

      if (!art || (!isAdmin && art.author_id !== userId)) {
        skipped++;
        continue;
      }

      const patch: Record<string, unknown> = { status };
      if (status === "published") patch.published_at = new Date().toISOString();

      const { error } = await supabase.from("articles").update(patch).eq("id", id);
      if (error) {
        skipped++;
        continue;
      }

      await logAdminAction(supabase, {
        adminId: userId,
        action: "article_status_change",
        targetType: "article",
        targetId: id,
        details: { from: art.status, to: status, via: "api" },
      });
      done++;
    }

    return jsonResponse({ success: done > 0, updated: done, skipped });
  } catch (err) {
    console.error("[API articles] PATCH failed:", err instanceof Error ? err.message : String(err));
    return jsonResponse({ success: false, error: "Lỗi khi cập nhật bài viết." }, 500);
  }
};

/**
 * DELETE /api/admin/articles
 * Body: { id: string }
 * Chỉ ADMIN. Xóa vĩnh viễn bài + bình luận/reactions/ảnh Cloudinary liên quan.
 */
export const DELETE: APIRoute = async (context) => {
  const auth = await authenticateStaff(context);
  if ("error" in auth) return auth.error;
  const { supabase, userId, isAdmin } = auth;

  if (!isAdmin) {
    return jsonResponse({ success: false, error: "Chỉ admin mới có quyền xóa bài viết." }, 403);
  }

  try {
    const body = await context.request.json();
    const id = String(body.id || "");
    if (!id) return jsonResponse({ success: false, error: "Thiếu id bài viết." }, 400);

    const result = await deleteArticleWithRelations(supabase, id);
    await logAdminAction(supabase, {
      adminId: userId,
      action: "article_delete",
      targetType: "article",
      targetId: id,
      details: { success: result.success, message: result.message, via: "api" },
    });

    return jsonResponse(result, result.success ? 200 : 422);
  } catch (err) {
    console.error("[API articles] DELETE failed:", err instanceof Error ? err.message : String(err));
    return jsonResponse({ success: false, message: "Sự cố hệ thống khi xóa bài viết." }, 500);
  }
};
