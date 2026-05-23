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
    const { article_id, content, parent_id = null, depth } = body;

    if (!article_id || !content) {
      return new Response(JSON.stringify({ error: "Thiếu article_id hoặc nội dung bình luận." }), { status: 400 });
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({
        article_id,
        profile_id: user.id,
        content,
        parent_id,
        depth,
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
