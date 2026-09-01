import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseServerClient({ request, cookies });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Chưa đăng nhập." }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { article_id, content, parent_id = null, depth = 0 } = body;

    if (!article_id || typeof content !== "string" || !content.trim()) {
      return new Response(JSON.stringify({ error: "Thiếu article_id hoặc nội dung bình luận." }), { status: 400 });
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length > 2000) {
      return new Response(JSON.stringify({ error: "Nội dung bình luận không được vượt quá 2000 ký tự." }), { status: 400 });
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({
        article_id,
        profile_id: user.id,
        content: trimmedContent,
        parent_id,
        depth: Math.min(Math.max(0, depth || 0), 5), // Giới hạn độ sâu tối đa 5 cấp
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, data }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500 });
  }
};
