import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Singleton Supabase client cho phía trình duyệt (Browser / Client-side).
 * 
 * Tất cả các React component (Astro Islands) nên import từ file này
 * thay vì tự gọi createClient() riêng lẻ để tránh cảnh báo
 * "Multiple GoTrueClient instances detected".
 */
let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  browserClient = createClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}
