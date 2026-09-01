import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../lib/supabase";

export const GET: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseServerClient({ request, cookies });
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  try {
    // Bài viết đã xuất bản
    const { data: articles = [] } = await supabase
      .from("articles")
      .select("slug, created_at, published_at")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    // Tranh cộng đồng đã duyệt
    const { data: artworks = [] } = await supabase
      .from("submissions")
      .select("id, reviewed_at, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(2000);

    // Nghệ sĩ đã có tác phẩm duyệt
    const { data: artists = [] } = await supabase
      .from("artist_stats")
      .select("artist_id")
      .limit(1000);

    const escapeXml = (s: string) =>
      s.replace(/[<>&'"]/g, (c) =>
        ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] as string)
      );

    const staticPages = [
      { loc: `${baseUrl}/`, freq: "daily", pri: "1.0" },
      { loc: `${baseUrl}/gallery`, freq: "daily", pri: "0.9" },
      { loc: `${baseUrl}/artists`, freq: "weekly", pri: "0.7" },
      { loc: `${baseUrl}/ai`, freq: "weekly", pri: "0.5" },
      { loc: `${baseUrl}/terms`, freq: "monthly", pri: "0.3" },
    ];

    const staticXml = staticPages
      .map((p) => `  <url>
    <loc>${p.loc}</loc>
    <changefreq>${p.freq}</changefreq>
    <priority>${p.pri}</priority>
  </url>`)
      .join("\n");

    const articleXml = (articles || [])
      .map(
        (art: { slug: string; created_at: string; published_at: string | null }) => `  <url>
    <loc>${baseUrl}/articles/${escapeXml(art.slug)}</loc>
    <lastmod>${new Date(art.published_at || art.created_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
      )
      .join("\n");

    const artworkXml = (artworks || [])
      .map(
        (sub: { id: string; reviewed_at: string | null; created_at: string }) => `  <url>
    <loc>${baseUrl}/gallery/${sub.id}</loc>
    <lastmod>${new Date(sub.reviewed_at || sub.created_at).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`
      )
      .join("\n");

    const artistXml = (artists || [])
      .map(
        (a: { artist_id: string }) => `  <url>
    <loc>${baseUrl}/profile/${a.artist_id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`
      )
      .join("\n");

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[staticXml, articleXml, artworkXml, artistXml].filter(Boolean).join("\n")}
</urlset>`;

    return new Response(sitemapXml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    console.error("Lỗi sitemap generation:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`,
      {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=utf-8"
        }
      }
    );
  }
};
