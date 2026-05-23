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
    const { article_id, emoji, action } = body;

    if (action === "add") {
      const { data, error } = await supabase
        .from("reactions")
        .insert({
          article_id,
          profile_id: user.id,
          emoji,
        })
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }

      return new Response(JSON.stringify({ success: true, data }), { status: 200 });
    } else if (action === "remove") {
      const { error } = await supabase
        .from("reactions")
        .delete()
        .eq("article_id", article_id)
        .eq("profile_id", user.id)
        .eq("emoji", emoji);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Action không hợp lệ." }), { status: 400 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
