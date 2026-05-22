import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  return handleProfileUpdate({ request, cookies });
};

export const PATCH: APIRoute = async ({ request, cookies }) => {
  return handleProfileUpdate({ request, cookies });
};

async function handleProfileUpdate({ request, cookies }: { request: Request; cookies: any }) {
  const supabase = createSupabaseServerClient({ request, cookies });

  // 1. Kiểm tra session người dùng
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(
      JSON.stringify({ error: "Yêu cầu đăng nhập để thực hiện cập nhật hồ sơ." }), 
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { bio, banner_url, social_links } = body;

    // Validate inputs
    const updatedFields: any = {};
    
    if (typeof bio !== "undefined") {
      updatedFields.bio = bio ? bio.trim() : null;
    }
    
    if (typeof banner_url !== "undefined") {
      updatedFields.banner_url = banner_url ? banner_url.trim() : null;
    }

    if (typeof social_links !== "undefined") {
      // Đảm bảo cấu trúc social_links hợp lệ
      const instagram = social_links?.instagram ? social_links.instagram.trim() : "";
      const twitter = social_links?.twitter ? social_links.twitter.trim() : "";
      const artstation = social_links?.artstation ? social_links.artstation.trim() : "";
      
      updatedFields.social_links = {
        instagram,
        twitter,
        artstation
      };
    }

    // 2. Thực hiện cập nhật bảng profiles trong CSDL
    const { data, error } = await supabase
      .from("profiles")
      .update(updatedFields)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, data }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
