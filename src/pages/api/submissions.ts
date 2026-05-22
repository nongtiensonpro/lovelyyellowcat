import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseServerClient({ request, cookies });

  // 1. Kiểm tra session người dùng
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Chưa đăng nhập." }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, image_url, image_pid } = body;

    if (!title || !image_url || !image_pid) {
      return new Response(JSON.stringify({ error: "Vui lòng hoàn thành tải ảnh và điền tiêu đề tác phẩm." }), { status: 400 });
    }

    const { data, error } = await supabase
      .from("submissions")
      .insert({
        author_id: user.id,
        title: title.trim(),
        description: description.trim(),
        image_url: image_url.trim(),
        image_pid: image_pid.trim(),
        status: "pending" // Mặc định chờ duyệt
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
