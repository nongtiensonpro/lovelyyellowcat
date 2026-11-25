import type { APIRoute } from "astro";  
import { createSupabaseServerClient } from "../../../lib/supabase";
import { env } from "cloudflare:workers";

export const GET: APIRoute = async ({ request, cookies, url, redirect }) => {  
  const rawNext = url.searchParams.get("next");
  const safeNext =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.startsWith("/\\")
      ? rawNext
      : "/";

  // Tuân thủ Điều 11 Luật 91/2025: yêu cầu xác nhận đồng ý chủ động tại /login trước khi chuyển sang Google OAuth
  if (url.searchParams.get("consent") !== "accepted") {
    const loginUrl = new URL("/login", url.origin);
    if (safeNext !== "/") loginUrl.searchParams.set("next", safeNext);
    return redirect(loginUrl.pathname + loginUrl.search, 302);
  }

  const supabase = createSupabaseServerClient({ request, cookies });  
  const configuredSiteUrl = (
    (env as unknown as Record<string, string | undefined>)?.PUBLIC_SITE_URL || import.meta.env.PUBLIC_SITE_URL
  )?.trim().replace(/\/+$/, "");
  const redirectOrigin = configuredSiteUrl || url.origin;
  const redirectUrl = safeNext !== "/"
    ? `${redirectOrigin}/api/auth/callback?next=${encodeURIComponent(safeNext)}`
    : `${redirectOrigin}/api/auth/callback`;

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

  // Astro APIRoute tự động đính kèm cookie PKCE state vào Response redirect một cách tự nhiên
  return redirect(data.url, 307);
};
