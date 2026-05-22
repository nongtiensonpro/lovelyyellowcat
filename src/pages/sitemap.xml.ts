import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../lib/supabase";

export const GET: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseServerClient({ request, cookies });
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  try {
    // Tải toàn bộ bài viết đã xuất bản từ database
    const { data: articles = [] } = await supabase
      .from("articles")
      .select("slug, created_at, published_at")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    // Tạo nội dung cấu trúc XML Sitemap chuẩn hóa
    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Trang chủ chính -->
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <!-- Trang điều khoản sử dụng -->
  <url>
    <loc>${baseUrl}/terms</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <!-- Danh sách các bài viết nghệ thuật -->
  ${(articles || [])
    .map(
      (art) => `  <url>
    <loc>${baseUrl}/articles/${art.slug}</loc>
    <lastmod>${new Date(art.published_at || art.created_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join("\n")}
</urlset>`;

    return new Response(sitemapXml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error: any) {
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
