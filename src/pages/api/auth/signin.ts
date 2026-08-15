import type { APIRoute } from "astro";  
import { createSupabaseServerClient } from "../../../lib/supabase";
import { env } from "cloudflare:workers";

export const GET: APIRoute = async ({ request, cookies, url, redirect }) => {  
  const supabase = createSupabaseServerClient({ request, cookies });  
  const configuredSiteUrl = (
    (env as any)?.PUBLIC_SITE_URL || import.meta.env.PUBLIC_SITE_URL
  )?.trim().replace(/\/+$/, "");
  const redirectOrigin = configuredSiteUrl || url.origin;
  const redirectUrl = `${redirectOrigin}/api/auth/callback`;

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
