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
    const { action, notification_id } = body;

    if (action === "mark_read" && notification_id) {
      // Đánh dấu một thông báo đã đọc
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification_id)
        .eq("recipient", user.id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });

    } else if (action === "mark_all_read") {
      // Đánh dấu tất cả thông báo đã đọc
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("recipient", user.id);

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
