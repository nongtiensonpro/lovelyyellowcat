import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../lib/supabase";

/**
 * GET /api/bookmarks                → danh sách bookmark của user hiện tại
 * GET /api/bookmarks?articleId=xyz  → { bookmarked: boolean }
 */
export const GET: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseServerClient({ request, cookies });
  const url = new URL(request.url);
  const articleId = url.searchParams.get("articleId");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    if (articleId) {
      return new Response(JSON.stringify({ bookmarked: false }), { status: 200 });
    }
    return new Response(JSON.stringify([]), { status: 200 });
  }

  if (articleId) {
    const { count } = await supabase
      .from("bookmarks")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .eq("article_id", articleId);
    return new Response(
      JSON.stringify({ bookmarked: (count || 0) > 0 }),
      { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
    );
  }

  const { data, error } = await supabase
    .from("bookmarks")
    .select("article_id, saved_at")
    .eq("profile_id", user.id)
    .order("saved_at", { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(
    JSON.stringify(data || []),
    { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
  );
};

/**
 * POST /api/bookmarks   body: { articleId }
 * Toggle lưu/bỏ lưu bài viết.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseServerClient({ request, cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(
      JSON.stringify({ success: false, error: "Chưa đăng nhập." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();
    const articleId = String(body.articleId || "").trim();
    if (!articleId) {
      return new Response(
        JSON.stringify({ success: false, error: "Thiếu articleId." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { count } = await supabase
      .from("bookmarks")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .eq("article_id", articleId);

    if ((count || 0) > 0) {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("profile_id", user.id)
        .eq("article_id", articleId);
      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, bookmarked: false }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const { error } = await supabase
      .from("bookmarks")
      .insert({ profile_id: user.id, article_id: articleId });
    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, bookmarked: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[BOOKMARKS] toggle failed:", err instanceof Error ? err.message : String(err));
    return new Response(
      JSON.stringify({ success: false, error: "Sự cố hệ thống khi lưu bài viết." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
