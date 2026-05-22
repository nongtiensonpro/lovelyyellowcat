import type { APIRoute } from "astro";  
import { createSupabaseServerClient } from "../../../lib/supabase";

export const GET: APIRoute = async ({ request, cookies, url }) => {  
  const supabase = createSupabaseServerClient({ request, cookies });  
  const redirectUrl = `${url.origin}/auth/callback`;

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
    },  
  });  
};
