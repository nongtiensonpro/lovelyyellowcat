import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseServerClient({ request, cookies });

  // 1. Kiểm tra session người dùng
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Chưa đăng nhập." }), { status: 401 });
  }

  // 2. Kiểm tra vai trò của người dùng
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "editor")) {
    return new Response(JSON.stringify({ error: "Không có quyền truy cập." }), { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, title, slug, excerpt, body_md, cover_url, status, tags } = body;

    if (!title || !slug || !body_md) {
      return new Response(JSON.stringify({ error: "Vui lòng nhập đầy đủ Tiêu đề, Slug và Nội dung." }), { status: 400 });
    }

    const articleData = {
      title,
      slug,
      excerpt,
      body_md,
      cover_url,
      status: status || "draft",
      tags: tags || [],
      author_id: user.id,
      published_at: status === "published" ? new Date().toISOString() : null
    };

    let result;
    if (id) {
      // Cập nhật bài viết
      result = await supabase
        .from("articles")
        .update(articleData)
        .eq("id", id)
        .select()
        .single();
    } else {
      // Tạo mới bài viết
      result = await supabase
        .from("articles")
        .insert(articleData)
        .select()
        .single();
    }

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, data: result.data }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
