import type { APIRoute } from "astro";  
import { createSupabaseServerClient } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {  
  const supabase = createSupabaseServerClient({ request, cookies });  
    
  const { error } = await supabase.auth.signOut();  
    
  if (error) {  
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });  
  }

  return new Response(null, {  
    status: 303,  
    headers: {  
      Location: new URL(request.url).origin,  
    },  
  });  
};
