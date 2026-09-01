import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

function getStringEnv(name: string): string {
    const wEnv = env as unknown as Record<string, string | undefined>;
  const iEnv = import.meta.env as unknown as Record<string, string | undefined>;
  return String(wEnv?.[name] || iEnv?.[name] || process.env?.[name] || "").trim();
}

export const GET: APIRoute = async () => {
  // Deliberately public for the current BYOK/direct-browser mode. The owner
  // accepts that this limited free key can be extracted from client traffic.
  const exposedApiKey = getStringEnv("GEMINI_API_KEY") || getStringEnv("AI_API_KEY");
  const hasSystemKey = Boolean(exposedApiKey);
  const hasVertexExpressUrl = Boolean(getStringEnv("GEMINI_VERTEX_EXPRESS_BASE_URL"));
  const hasVertexExpressKey = Boolean(getStringEnv("GEMINI_VERTEX_EXPRESS_API_KEY"));
  const hasGatewayUrl = Boolean(getStringEnv("AI_GATEWAY_URL"));
  const hasGatewayToken = Boolean(
    getStringEnv("CF_AIG_TOKEN") || getStringEnv("CLOUDFLARE_AI_GATEWAY_TOKEN"),
  );

  return new Response(
    JSON.stringify({
      success: true,
      hasKey: hasSystemKey || hasVertexExpressKey || hasGatewayToken,
      exposedApiKey,
      routes: {
        googleAiStudio: hasSystemKey,
        vertexExpressUrl: hasVertexExpressUrl,
        vertexExpressKey: hasVertexExpressKey,
        vertexExpress: hasVertexExpressUrl && hasVertexExpressKey,
        cloudflareAiGateway: hasGatewayUrl && (hasSystemKey || hasGatewayToken),
      },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
};
