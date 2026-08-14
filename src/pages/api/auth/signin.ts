import type { APIRoute } from "astro";  
import { createSupabaseServerClient } from "../../../lib/supabase";
import { env } from "cloudflare:workers";

export const GET: APIRoute = async ({ request, cookies, url }) => {  
  const supabase = createSupabaseServerClient({ request, cookies });  
  // In production, prefer a fixed canonical origin so an old preview/local
  // host cannot become the OAuth callback. Keep the request origin for local
  // development when PUBLIC_SITE_URL is not configured.
  const configuredSiteUrl = (
    (env as any)?.PUBLIC_SITE_URL || import.meta.env.PUBLIC_SITE_URL
  )?.trim().replace(/\/+$/, "");
  const redirectOrigin = configuredSiteUrl || url.origin;
  const redirectUrl = `${redirectOrigin}/auth/callback`;

  // Thực hiện yêu cầu sinh URL đăng nhập OAuth từ Supabase  
  const { data, error } = await supabase.auth.signInWithOAuth({  
    provider: "google",  
    options: {  
      redirectTo: redirectUrl,  
    },  
  });

  if (error) {  
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });  
  }

  // Chuyển hướng trình duyệt của người dùng đến trang xác thực Google bằng Response khả biến (mutable) để Astro gộp cookie thành công  
  return new Response(null, {  
    status: 307,  
    headers: {  
      Location: data.url,  
      "Cache-Control": "no-store, private, max-age=0",
      "CDN-Cache-Control": "no-store",
      Pragma: "no-cache",
    },  
  });  
};
