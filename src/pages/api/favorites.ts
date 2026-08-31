import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../lib/supabase";

export const GET: APIRoute = async ({ request, cookies, url }) => {
  const supabase = createSupabaseServerClient({ request, cookies });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(
      JSON.stringify({ isFavorited: false, favoriteIds: [], submissions: [] }), 
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const submissionId = url.searchParams.get("submission_id");
  const idsOnly = url.searchParams.get("ids_only");

  // Kiểm tra 1 submission cụ thể
  if (submissionId) {
    const { data, error } = await supabase
      .from("favorites")
      .select("submission_id")
      .eq("profile_id", user.id)
      .eq("submission_id", submissionId)
      .maybeSingle();

    return new Response(
      JSON.stringify({ isFavorited: !!data && !error }), 
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Lấy danh sách ID đã yêu thích
  if (idsOnly === "true") {
    const { data } = await supabase
      .from("favorites")
      .select("submission_id")
      .eq("profile_id", user.id);

    const favoriteIds = (data || []).map((f: any) => f.submission_id);
    return new Response(
      JSON.stringify({ favoriteIds }), 
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Lấy toàn bộ chi tiết submissions yêu thích
  const { data: dbFavorites, error } = await supabase
    .from("favorites")
    .select(`
      saved_at,
      submissions:submissions!submission_id(
        *,
        profiles:profiles!author_id(full_name, avatar_url)
      )
    `)
    .eq("profile_id", user.id)
    .order("saved_at", { ascending: false });

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message, submissions: [] }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const submissions = (dbFavorites || [])
    .map((f: any) => f.submissions)
    .filter((s: any) => s !== null && s.status === "approved");

  return new Response(
    JSON.stringify({ success: true, submissions }), 
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseServerClient({ request, cookies });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Chưa đăng nhập." }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { submission_id, action } = body;

    if (action === "add") {
      const { data, error } = await supabase
        .from("favorites")
        .insert({
          profile_id: user.id,
          submission_id,
        })
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }

      return new Response(JSON.stringify({ success: true, data }), { status: 200 });
    } else if (action === "remove") {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("profile_id", user.id)
        .eq("submission_id", submission_id);

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
