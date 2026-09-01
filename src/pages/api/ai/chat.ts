import type { APIRoute } from "astro";
import { buildSiteKnowledgePrompt } from "../../../lib/siteKnowledge";
import { env } from "cloudflare:workers";
import type { GeminiListResponse, GeminiCandidate, GeminiPart } from "../../../components/ai/aiStreamCore";

type AttemptLog = {
  model: string;
  status: number;
  error: string;
  endpoint?: string;
};

type StreamReadResult = {
  hasContent: boolean;
  error?: string;
};

const DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com";
const DEFAULT_UPSTREAM_TIMEOUT_MS = 120_000;
const SSE_HEARTBEAT_MS = 10_000;
const MAX_CONTEXT_MESSAGES = 24;
const LOCATION_BLOCKED_REPLY =
  "Meow~! Kết nối Gemini từ máy chủ đang bị Google từ chối theo vị trí mạng (`User location not supported`). Hệ thống sẽ tự chuyển sang tuyến AI dự phòng nếu quản trị viên đã cấu hình. Bạn không cần nhập API Key cá nhân trừ khi muốn dùng hạn mức riêng. 🐱🌐";

type GeminiRouteKind = "google-ai-studio" | "cloudflare-ai-gateway" | "vertex-express";

function getStringEnv(name: string): string {
    const wEnv = env as unknown as Record<string, string | undefined>;
  const iEnv = import.meta.env as unknown as Record<string, string | undefined>;
  return String(wEnv?.[name] || iEnv?.[name] || process.env?.[name] || "").trim();
}

function getGeminiBaseUrls(): string[] {
  const configured = [
    getStringEnv("GEMINI_BASE_URL"),
    getStringEnv("AI_GATEWAY_URL"),
    getStringEnv("GEMINI_VERTEX_EXPRESS_BASE_URL"),
    getStringEnv("GEMINI_FALLBACK_BASE_URL"),
    ...getStringEnv("GEMINI_FALLBACK_BASE_URLS").split(","),
  ]
    .map((value) => value.trim().replace(/\/+$/, ""))
    .filter(Boolean)
    .map((value) => value.replace(/\/v1beta$/i, "").replace(/\/v1$/i, ""));

  return [...new Set([...configured, DEFAULT_GEMINI_BASE_URL])];
}

function getRouteKind(baseUrl: string): GeminiRouteKind {
  if (/gateway\.ai\.cloudflare\.com/i.test(baseUrl)) return "cloudflare-ai-gateway";
  if (/aiplatform\.googleapis\.com/i.test(baseUrl)) return "vertex-express";
  return "google-ai-studio";
}

function getVertexPublisherModelPath(model: string): string {
  const normalized = model.replace(/^models\//i, "");
  const publisherModel = normalized.startsWith("publishers/")
    ? normalized
    : `publishers/google/models/${normalized}`;
  return publisherModel.split("/").map(encodeURIComponent).join("/");
}

function safeEndpointLabel(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.split("?")[0].slice(0, 300);
  }
}

function getUpstreamTimeoutMs(): number {
  const configured = Number(getStringEnv("GEMINI_UPSTREAM_TIMEOUT_MS"));
  return Number.isFinite(configured) && configured >= 15_000
    ? Math.min(configured, 300_000)
    : DEFAULT_UPSTREAM_TIMEOUT_MS;
}

function isLocationBlocked(error: string): boolean {
  return /user\s+location\s+is\s+not\s+supported|location\s+not\s+supported|unsupported\s+location/i.test(error);
}

function isAuthenticationError(status: number): boolean {
  return status === 401 || status === 403;
}

function buildGeminiUrl(
  baseUrl: string,
  model: string,
  action: "generateContent" | "streamGenerateContent",
  apiKey = "",
): string {
  const streamQuery = action === "streamGenerateContent" ? "?alt=sse" : "";
  const encodedModel = encodeURIComponent(model);
  switch (getRouteKind(baseUrl)) {
    case "cloudflare-ai-gateway":
      return `${baseUrl}/v1/models/${encodedModel}:${action}${streamQuery}`;
    case "vertex-express": {
      // Vertex Express documents API-key auth as ?key=... and does not accept
      // an AI Studio key in x-goog-api-key. Keep the key server-side and never
      // include it in endpoint labels or error details.
      const query = new URLSearchParams();
      if (apiKey) query.set("key", apiKey);
      if (action === "streamGenerateContent") query.set("alt", "sse");
      const queryString = query.toString();
      return `${baseUrl}/v1/${getVertexPublisherModelPath(model)}:${action}${queryString ? `?${queryString}` : ""}`;
    }
    default:
      return `${baseUrl}/v1beta/models/${encodedModel}:${action}${streamQuery}`;
  }
}

function getEndpointApiKey(baseUrl: string, apiKey: string, vertexExpressApiKey: string): string {
  return getRouteKind(baseUrl) === "vertex-express" ? vertexExpressApiKey : apiKey;
}

function buildGeminiRequest(
  apiKey: string,
  body: unknown,
  signal: AbortSignal,
  baseUrl: string,
  cloudflareGatewayToken: string,
): RequestInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const routeKind = getRouteKind(baseUrl);
  const useCloudflareStoredKey = routeKind === "cloudflare-ai-gateway" && Boolean(cloudflareGatewayToken);
  // Vertex Express requires the key in the URL query; passing an AI Studio
  // key via x-goog-api-key makes Vertex reject the request as unauthenticated.
  if (apiKey && routeKind !== "vertex-express" && !useCloudflareStoredKey) {
    headers["x-goog-api-key"] = apiKey;
  }
  if (useCloudflareStoredKey) {
    headers["cf-aig-authorization"] = `Bearer ${cloudflareGatewayToken}`;
  }

  return {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  };
}

async function readResponseError(response: Response): Promise<string> {
  const raw = await response.text().catch(() => "");
  if (!raw) return `HTTP ${response.status}`;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.error?.message || parsed?.message || raw.slice(0, 1_000);
  } catch {
    return raw.slice(0, 1_000);
  }
}

function extractCandidateText(data: GeminiListResponse): string {
  return (data?.candidates || [])
    .flatMap((candidate: GeminiCandidate) => candidate?.content?.parts || [])
    .map((part: GeminiPart) => (typeof part?.text === "string" ? part.text : ""))
    .join("");
}

function formatGeminiContents(messages: Array<{ role: string; content: string }>) {
  const context = messages
    .filter((message) => typeof message?.content === "string" && message.content.trim())
    .slice(-MAX_CONTEXT_MESSAGES);
  const firstUserIndex = context.findIndex((message) => message.role === "user");
  const usableContext = firstUserIndex > 0 ? context.slice(firstUserIndex) : context;

  return usableContext.map((message) => ({
    role: message.role === "user" ? "user" : "model",
    parts: [{ text: message.content.trim() }],
  }));
}

async function consumeGeminiSse(
  response: Response,
  onText: (text: string) => void,
): Promise<StreamReadResult> {
  if (!response.body) return { hasContent: false, error: "Upstream không trả về response body." };

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let hasContent = false;
  let streamError: string | undefined;

  const consumeLine = (rawLine: string) => {
    const line = rawLine.replace(/\r$/, "");
    if (!line.startsWith("data:")) return;
    const jsonStr = line.slice(5).trim();
    if (!jsonStr || jsonStr === "[DONE]") return;

    try {
      const data = JSON.parse(jsonStr);
      const error = data?.error?.message || data?.error || data?.message;
      if (error) {
        streamError = String(error);
        return;
      }
      const text = extractCandidateText(data);
      if (text) {
        hasContent = true;
        onText(text);
      }
    } catch {
      // SSE chunks can be split at any byte boundary; malformed partial JSON
      // remains recoverable only when it is kept in the line buffer.
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) consumeLine(line);
    if (streamError) break;
  }

  buffer += decoder.decode();
  if (buffer) consumeLine(buffer);

  return { hasContent, error: streamError };
}

export const FALLBACK_MODEL_ORDER = [
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.1-pro-preview",
] as const;

export const PERSONA_INSTRUCTIONS: Record<string, string> = {
  cybercat: `Bạn là "Mèo Vàng Cybernetic" (CAT_AI.EXE v1995) - linh vật và trợ lý trí tuệ nhân tạo của Tạp chí Nghệ thuật Số Hoài Cổ "Lovely Yellow Cat" (A Cybernetic Oasis 1995-2026).
Tính cách & Phong cách:
1. Thân thiện, vui vẻ, hóm hỉnh, am hiểu sâu sắc về văn hóa số thập niên 90, thẩm mỹ Vaporwave, Synthwave, Cyberpunk, Windows 95, City Pop, Pixel Art, và nghệ thuật máy tính cổ điển.
2. Thỉnh thoảng chêm tiếng kêu "Meow~", biểu tượng cảm xúc hoài cổ (🐱, 💾, 📼, 🌸, ⚡, 🕹️, ✨) một cách tự nhiên.
3. Luôn trả lời bằng tiếng Việt lịch sự, tự nhiên, câu cú rõ ràng, súc tích, dễ đọc. Sử dụng Markdown (in đậm, danh sách gạch đầu dòng) khi cần giải thích nhiều ý.
4. Hướng dẫn người dùng khám phá các chuyên mục: /gallery (triển lãm), /submit (gửi tranh), /artists (nghệ sĩ), /favorites (yêu thích).`,

  art_critic: `Bạn là "Giáo sư V. A. P. O. R" - Nhà Phê bình & Giám định Nghệ thuật Thị giác Cổ điển (Art Critic 1995).
Phong cách:
1. Uyên bác, sắc sảo, đánh giá nghệ thuật dưới góc độ lịch sử mỹ thuật thị giác, thiết kế đồ họa retro, bảng màu neon, kỹ thuật đổ bóng dither và bố cục siêu thực hoài niệm.
2. Đưa ra những lời nhận xét sâu sắc, tinh tế về các trường phái Vaporwave, Synthwave, Mallsoft, Future Funk, Glitch Art.
3. Luôn trả lời bằng tiếng Việt trau chuốt, học thuật nhưng dễ tiếp cận, kèm các thuật ngữ thiết kế chuẩn xác. 🎨🏛️`,

  hacker: `Bạn là "CYBER_GHOST_95" - Hacker & Kỹ sư Kiến trúc Máy tính Cổ điển Y2K.
Phong cách:
1. Tư duy logic, am hiểu tường tận kiến trúc phần cứng x86, DOS, Windows 95, BBS, mạng Dial-up 56k, lập trình Assembly, C, Pascal, HTML 1.0 và an ninh mạng hoài cổ.
2. Nói chuyện theo phong cách dòng lệnh Terminal, Hacker CLI, chêm các thuật ngữ công nghệ thập niên 90 (💾, ⚡, 📟, 🖥️).
3. Luôn đưa ra câu trả lời kỹ thuật chính xác, chi tiết, có kèm code snippet minh họa chuẩn mực.`,

  synth_dj: `Bạn là "DJ NEON PULSE" - Nhà Sản xuất Âm nhạc Synthwave & Nhà thơ Lo-Fi Chillwave.
Phong cách:
1. Lãng mạn, bay bổng, yêu thích những giai điệu synthesizer analog, tiếng saxophone hoài niệm, ánh đèn neon đêm muộn và những chuyến lái xe ngắm hoàng hôn thập niên 80-90.
2. Sẵn sàng sáng tác thơ, lời bài hát, gợi ý album âm nhạc (Kavinsky, The Midnight, Macintosh Plus, Tatsuro Yamashita, Mariya Takeuchi...).
3. Giọng điệu ấm áp, du dương, ngập tràn cảm hứng nghệ thuật thư giãn. 📼🎷🌃`
};

export const POST: APIRoute = async ({ request }) => {
  const apiKey =
    getStringEnv("GEMINI_API_KEY") ||
    getStringEnv("AI_API_KEY");
  const vertexExpressApiKey =
    getStringEnv("GEMINI_VERTEX_EXPRESS_API_KEY");
  const cloudflareGatewayToken =
    getStringEnv("CF_AIG_TOKEN") ||
    getStringEnv("CLOUDFLARE_AI_GATEWAY_TOKEN");
  const baseUrls = getGeminiBaseUrls();

  if (!apiKey && !vertexExpressApiKey && !cloudflareGatewayToken) {
    return new Response(
      JSON.stringify({
        success: false,
        isMissingKey: true,
        error: "Chưa cấu hình thông tin xác thực AI ở phía server.",
        reply:
          "Meow~! Hệ thống AI chưa được cấu hình khóa hoặc gateway ở phía máy chủ. Quản trị viên cần kiểm tra `GEMINI_API_KEY`, `GEMINI_VERTEX_EXPRESS_API_KEY` hoặc `CF_AIG_TOKEN`. Bạn không cần nhập key cá nhân. 🐱🔧",
        errorDetail: "[CONFIG_ERROR] Chưa tìm thấy credential AI server-side.",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();
    const { 
      messages, 
      persona = "cybercat", 
      preferredModel, 
      allowFallback = true, 
      temperature = 0.7 
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Dữ liệu tin nhắn không hợp lệ." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Chọn System Prompt theo persona
    const systemPrompt = `${PERSONA_INSTRUCTIONS[persona] || PERSONA_INSTRUCTIONS.cybercat}\n\n${buildSiteKnowledgePrompt(messages)}`;

    // Sắp xếp danh sách Model thử nghiệm
    let modelsToTry: string[] = [];

    if (preferredModel && preferredModel !== "auto") {
      if (allowFallback) {
        modelsToTry = [
          preferredModel,
          ...FALLBACK_MODEL_ORDER.filter(m => m !== preferredModel)
        ];
      } else {
        modelsToTry = [preferredModel];
      }
    } else {
      modelsToTry = [...FALLBACK_MODEL_ORDER];
    }

    // Định dạng lịch sử hội thoại chuẩn theo Google Gemini REST API
    const formattedContents = formatGeminiContents(messages);
    if (formattedContents.length === 0) {
      return new Response(
        JSON.stringify({ error: "Dữ liệu tin nhắn không có nội dung." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

  const wantStream = body.stream === true;
  const attemptLogs: AttemptLog[] = [];
  const configuredRouteLabels = baseUrls.map(safeEndpointLabel);

    // ===== STREAMING MODE: trả về Server-Sent Events, hiển thị gõ dần =====
    if (wantStream) {
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          let closed = false;
          const send = (obj: unknown) => {
            if (closed) return;
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
            } catch {
              closed = true;
            }
          };
          const close = () => {
            if (closed) return;
            closed = true;
            try { controller.close(); } catch {}
          };
          const heartbeat = setInterval(() => {
            if (!closed) {
              try { controller.enqueue(encoder.encode(": keep-alive\n\n")); } catch { closed = true; }
            }
          }, SSE_HEARTBEAT_MS);
          const startTime = Date.now();
          const requestBody = {
            contents: formattedContents,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
              temperature: Math.max(0.1, Math.min(1.0, Number(temperature) || 0.7)),
              maxOutputTokens: 1200,
            },
          };

          send({ status: "connecting" });
          try {
            // A location error belongs to the endpoint/egress, not to a model.
            // Move to the next configured route instead of retrying every model.
            for (const baseUrl of baseUrls) {
              for (const model of modelsToTry) {
                const abortController = new AbortController();
                const timeout = setTimeout(() => abortController.abort(), getUpstreamTimeoutMs());
                let partialText = "";
                try {
                  const endpointApiKey = getEndpointApiKey(baseUrl, apiKey, vertexExpressApiKey);
                  const response = await fetch(
                    buildGeminiUrl(baseUrl, model, "streamGenerateContent", endpointApiKey),
                    buildGeminiRequest(
                      endpointApiKey,
                      requestBody,
                      abortController.signal,
                      baseUrl,
                      cloudflareGatewayToken,
                    ),
                  );
                  if (!response.ok || !response.body) {
                    const message = await readResponseError(response);
                    attemptLogs.push({ model, status: response.status, error: message, endpoint: safeEndpointLabel(baseUrl) });
                    if (isLocationBlocked(message) || isAuthenticationError(response.status)) break;
                    continue;
                  }

                  const streamResult = await consumeGeminiSse(response, (text) => {
                    partialText += text;
                    send({ text, model });
                  });

                  if (streamResult.hasContent) {
                    send({
                      done: true,
                      model,
                      durationMs: Date.now() - startTime,
                      incomplete: Boolean(streamResult.error),
                    });
                    close();
                    return;
                  }

                  const message = streamResult.error || "Stream kết thúc không có nội dung.";
                  attemptLogs.push({ model, status: 200, error: message, endpoint: safeEndpointLabel(baseUrl) });
                  if (isLocationBlocked(message)) break;
                } catch (err) {
                  const errName = err instanceof Error ? err.name : "";
                  const errMsg = err instanceof Error ? err.message : String(err);
                  const message = errName === "AbortError"
                    ? `Timeout sau ${Math.round(getUpstreamTimeoutMs() / 1000)} giây.`
                    : errMsg;
                  attemptLogs.push({ model, status: 0, error: message, endpoint: safeEndpointLabel(baseUrl) });
                  // Preserve a usable partial answer when the upstream cuts out.
                  if (partialText) {
                    send({ done: true, model, durationMs: Date.now() - startTime, incomplete: true });
                    close();
                    return;
                  }
                } finally {
                  clearTimeout(timeout);
                }
              }
            }

            const locationBlocked = attemptLogs.some((attempt) => isLocationBlocked(attempt.error));
            send({
              error: locationBlocked ? "User location not supported" : "All models failed",
              reply: locationBlocked ? LOCATION_BLOCKED_REPLY : undefined,
              done: true,
              isLocationBlocked: locationBlocked,
              attemptLogs,
              configuredRoutes: configuredRouteLabels,
              errorDetail:
                `Routes Worker đã nhận: ${configuredRouteLabels.join(", ")}\n` +
                attemptLogs.map((a, i) => `${i + 1}. [${a.model}] (HTTP ${a.status})${a.endpoint ? ` [${a.endpoint}]` : ""}: ${a.error}`).join("\n"),
            });
          } catch (err) {
            console.error("[AI STREAM ERROR]:", err);
            send({ error: err instanceof Error ? err.message : "Lỗi stream nội bộ.", done: true });
          } finally {
            clearInterval(heartbeat);
            close();
          }
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-store, no-transform",
          "X-Accel-Buffering": "no",
          Connection: "keep-alive",
        },
      });
    }

    let successfulReply: string | null = null;
    let modelUsed: string = "";
    const startTime = Date.now();
    const requestBody = {
      contents: formattedContents,
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        temperature: Math.max(0.1, Math.min(1.0, Number(temperature) || 0.7)),
        maxOutputTokens: 1200,
      },
    };

    // Duyệt qua danh sách Model theo thứ tự (non-stream fallback)
    for (const baseUrl of baseUrls) {
      for (const model of modelsToTry) {
        const abortController = new AbortController();
        const timeout = setTimeout(() => abortController.abort(), getUpstreamTimeoutMs());
        try {
          const endpointApiKey = getEndpointApiKey(baseUrl, apiKey, vertexExpressApiKey);
          const response = await fetch(
            buildGeminiUrl(baseUrl, model, "generateContent", endpointApiKey),
            buildGeminiRequest(
              endpointApiKey,
              requestBody,
              abortController.signal,
              baseUrl,
              cloudflareGatewayToken,
            ),
          );

          if (response.ok) {
            const data = await response.json();
            const candidateText = extractCandidateText(data);

            if (candidateText) {
              successfulReply = candidateText;
              modelUsed = model;
              break; // Thành công
            } else {
              attemptLogs.push({
                model,
                status: response.status,
                error: "API trả về 200 OK nhưng không có nội dung văn bản.",
                endpoint: safeEndpointLabel(baseUrl),
              });
            }
          } else {
            const error = await readResponseError(response);
            attemptLogs.push({ model, status: response.status, error, endpoint: safeEndpointLabel(baseUrl) });
            // Location/auth errors are endpoint/key-wide; do not waste time
            // trying the remaining models on this same route.
            if (isLocationBlocked(error) || isAuthenticationError(response.status)) break;
          }
        } catch (err) {
          const errName = err instanceof Error ? err.name : "";
          const errMsg = err instanceof Error ? err.message : String(err);
          const error = errName === "AbortError"
            ? `Timeout sau ${Math.round(getUpstreamTimeoutMs() / 1000)} giây.`
            : errMsg;
          attemptLogs.push({ model, status: 0, error, endpoint: safeEndpointLabel(baseUrl) });
        } finally {
          clearTimeout(timeout);
        }
      }
      if (successfulReply) break;
    }

    const durationMs = Date.now() - startTime;

    if (successfulReply) {
      return new Response(
        JSON.stringify({
          success: true,
          reply: successfulReply,
          model: modelUsed,
          durationMs,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Kiểm tra xem có phải do chặn vị trí địa lý của Cloudflare egress IP không
    const locationBlocked = attemptLogs.some((att) => isLocationBlocked(att.error));

    const logDetails = attemptLogs
      .map((att, idx) => `${idx + 1}. [${att.model}] (HTTP ${att.status})${att.endpoint ? ` [${att.endpoint}]` : ""}: ${att.error}`)
      .join("\n");

    const formattedErrorDetail = 
      `[TỔNG HỢP KẾT QUẢ THỬ NGHIỆM MODEL]\n` +
      `Model ưu tiên ban đầu: ${preferredModel || "auto"}\n` +
      `Cho phép Fallback: ${allowFallback ? "BẬT" : "TẮT"}\n` +
      `Phát hiện chặn tuyến mạng: ${locationBlocked ? "CÓ (User location not supported)" : "KHÔNG"}\n\n` +
      `Routes Worker đã nhận: ${configuredRouteLabels.join(", ")}\n\n` +
      `Chi tiết từng model:\n${logDetails}`;

    let userFriendlyReply = "Meow~! Mạng nơ-ron truyền dẫn Cybernet đang gặp chút nghẽn sóng hoặc hạn mức model đã hết. Bạn hãy thử chọn model khác hoặc mở chi tiết lỗi nhé! 🐱💾";

    if (locationBlocked) {
      userFriendlyReply = LOCATION_BLOCKED_REPLY;
    }

    return new Response(
      JSON.stringify({
        success: false,
        isLocationBlocked: locationBlocked,
        error: locationBlocked ? "Google AI Studio từ chối tuyến mạng (User location not supported)." : "Tất cả các Model AI đều không phản hồi.",
        reply: userFriendlyReply,
        errorDetail: formattedErrorDetail,
        attemptLogs,
        configuredRoutes: configuredRouteLabels,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[AI CHAT API ERROR]:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    return new Response(
      JSON.stringify({
        success: false,
        error: errMsg || "Lỗi máy chủ nội bộ khi xử lý hội thoại.",
        reply:
          "Meow~! Mạng nơ-ron truyền dẫn Cybernet đang gặp sự cố nội bộ. Bạn hãy mở chi tiết lỗi bên dưới để xem nhé! 🐱💾",
        errorDetail: `[INTERNAL_SERVER_ERROR]: ${errStack || errMsg}`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
};
