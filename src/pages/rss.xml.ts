import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../lib/supabase";

export const GET: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseServerClient({ request, cookies });
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const escapeXml = (s: string) =>
    String(s || "").replace(/[<>&'"]/g, (c) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] as string)
    );

  try {
    const { data: articles = [] } = await supabase
      .from("articles")
      .select("title, slug, excerpt, cover_url, created_at, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(30);

    const itemsXml = (articles || [])
      .map(
        (art: any) => `    <item>
      <title>${escapeXml(art.title)}</title>
      <link>${baseUrl}/articles/${escapeXml(art.slug)}</link>
      <guid isPermaLink="true">${baseUrl}/articles/${escapeXml(art.slug)}</guid>
      <description>${escapeXml(art.excerpt || "")}</description>
      ${art.cover_url ? `<enclosure url="${escapeXml(art.cover_url)}" type="image/jpeg" />` : ""}
      <pubDate>${new Date(art.published_at || art.created_at).toUTCString()}</pubDate>
    </item>`
      )
      .join("\n");

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>LOVELYYELLOWCAT — Vaporwave Art Magazine</title>
    <link>${baseUrl}/</link>
    <description>Tạp chí nghệ thuật số hoài cổ Vaporwave — A Cybernetic Oasis of Retro-Futurism. Cập nhật bài viết mới nhất mỗi tuần.</description>
    <language>vi-VN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

    return new Response(rssXml, {
      status: 200,
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=1800",
      },
    });
  } catch (error: any) {
    console.error("Lỗi RSS generation:", error);
    return new Response("RSS feed temporarily unavailable", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
};
