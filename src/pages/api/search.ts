import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../lib/supabase";

export const GET: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseServerClient({ request, cookies });
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";

  if (!q.trim()) {
    return new Response(JSON.stringify([]), { status: 200 });
  }

  try {
    // 1. Thực hiện Full-Text Search tiếng Việt trên Postgres bằng simple dictionary và search_vector
    const { data, error } = await supabase
      .from("articles")
      .select("id, title, slug, excerpt, cover_url, tags, created_at")
      .eq("status", "published")
      .textSearch("search_vector", `'${q.trim().replace(/'/g, "''")}'`, {
        config: "simple",
        type: "plain"
      });

    if (error) {
      console.warn("FTS lỗi hoặc không khớp, chuyển sang dự phòng ILIKE:", error.message);
      
      // 2. Chế độ dự phòng: Sử dụng câu lệnh ILIKE cơ bản nếu người dùng nhập ký tự đặc biệt làm FTS lỗi
      const { data: ilikeData, error: errIlike } = await supabase
        .from("articles")
        .select("id, title, slug, excerpt, cover_url, tags, created_at")
        .eq("status", "published")
        .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`)
        .limit(10);

      if (errIlike) {
        throw errIlike;
      }
      return new Response(JSON.stringify(ilikeData || []), { status: 200 });
    }

    return new Response(JSON.stringify(data || []), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
