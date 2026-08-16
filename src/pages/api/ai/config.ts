import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const GET: APIRoute = async () => {
  const apiKey =
    (env as any)?.GEMINI_API_KEY ||
    (env as any)?.AI_API_KEY ||
    import.meta.env.GEMINI_API_KEY ||
    import.meta.env.AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    "";

  return new Response(
    JSON.stringify({
      success: true,
      hasKey: Boolean(apiKey),
      apiKey: apiKey || "",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=300",
      },
    }
  );
};
