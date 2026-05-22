import { createServerClient, parseCookieHeader, type CookieOptionsWithName } from "@supabase/ssr";  
import type { AstroCookies } from "astro";

export const cookieOptions: CookieOptionsWithName = {  
  path: "/",  
  secure: true,  
  httpOnly: true,  
  sameSite: "lax",  
};

export function createSupabaseServerClient(context: { request: Request; cookies: AstroCookies }) {  
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;  
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {  
    throw new Error("Biến môi trường của Supabase chưa được thiết lập đầy đủ.");  
  }

  return createServerClient(  
    supabaseUrl,  
    supabaseAnonKey,  
    {  
      cookieOptions,  
      cookies: {  
        getAll() {  
          return parseCookieHeader(context.request.headers.get("Cookie") ?? "");  
        },  
        setAll(cookiesToSet) {  
          cookiesToSet.forEach(({ name, value, options }) => {  
            context.cookies.set(name, value, { ...cookieOptions, ...options });  
          });  
        },  
      },  
    }  
  );  
}
