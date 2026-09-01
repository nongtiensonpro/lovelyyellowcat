import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../lib/supabase";

/**
 * GET /api/search?q=...
 * Unified Search trả về 3 nhóm: articles (FTS), artworks (tranh đã duyệt), artists (profiles).
 */
export const GET: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseServerClient({ request, cookies });
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";

  if (!q.trim()) {
    return new Response(
      JSON.stringify({ articles: [], artworks: [], artists: [] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const sanitized = q.trim().replace(/'/g, "''");
  const emptyResult = { articles: [], artworks: [], artists: [] };

  try {
    // ── 1. Bài viết: Full-Text Search với fallback ILIKE ──
    let articles: Array<Record<string, unknown>> | null = null;

    const fts = await supabase
      .from("articles")
      .select("id, title, slug, excerpt, cover_url, tags, created_at")
      .eq("status", "published")
      .textSearch("search_vector", `'${sanitized}'`, { config: "simple", type: "plain" })
      .limit(6);

    if (fts.error) {
      console.warn("FTS lỗi, chuyển sang ILIKE:", fts.error.message);
      const ilike = await supabase
        .from("articles")
        .select("id, title, slug, excerpt, cover_url, tags, created_at")
        .eq("status", "published")
        .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`)
        .limit(6);

      if (ilike.error) throw ilike.error;
      articles = ilike.data;
    } else {
      articles = fts.data;
    }

    // ── 2. Tranh cộng đồng (đã duyệt) ──
    const artworksQuery = await supabase
      .from("submissions")
      .select("id, title, description, image_url, created_at")
      .eq("status", "approved")
      .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
      .limit(6);

    // ── 3. Nghệ sĩ (profile công khai) ──
    const artistsQuery = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, bio")
      .or(`full_name.ilike.%${q}%,bio.ilike.%${q}%`)
      .limit(4);

    return new Response(
      JSON.stringify({
        articles: articles || [],
        artworks: artworksQuery.error ? [] : artworksQuery.data || [],
        artists: artistsQuery.error ? [] : artistsQuery.data || [],
      }),
      { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Lỗi unified search:", error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify(emptyResult), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
