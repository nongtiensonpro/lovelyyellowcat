// aiStreamCore.ts — pure logic cho Gemini SSE stream (Phase 6, kế hoạch §6).
// Tách từ AiChatStation.tsx: parse SSE line, phân loại lỗi, quyết định continuation/fallback.
// Fetch/stream IO nằm ở caller — module này chỉ xử lý text/state → test 100% không network.

// Gemini REST response shape (tối thiểu những gì stream parser dùng) — Batch 11.1
interface GeminiPart { text?: string }
interface GeminiCandidate { content?: { parts?: GeminiPart[] } }

export const CLIENT_MAX_OUTPUT_TOKENS = 4096;
export const CLIENT_INITIAL_RESPONSE_TIMEOUT_MS = 180_000;
export const CLIENT_STREAM_IDLE_TIMEOUT_MS = 90_000;
export const CLIENT_MAX_MODEL_RETRIES = 2;
export const CLIENT_MAX_CONTINUATIONS = 2;
export const CLIENT_CONTINUATION_PROMPT =
  "Hãy tiếp tục câu trả lời ngay từ chỗ đang dừng, không lặp lại phần đã viết và hoàn thành ý cuối cùng.";

export interface ModelUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  thoughtsTokenCount?: number;
  cachedContentTokenCount?: number;
}

/** Gộp usage 2 segment (continuation) — sum từng field, undefined nếu cả 2 thiếu. */
export function mergeModelUsage(prev: ModelUsage | undefined, next: ModelUsage | undefined): ModelUsage | undefined {
  if (!prev && !next) return undefined;
  const sum = (a?: number, b?: number) =>
    typeof a === "number" || typeof b === "number" ? (a || 0) + (b || 0) : undefined;
  return {
    promptTokenCount: sum(prev?.promptTokenCount, next?.promptTokenCount),
    candidatesTokenCount: sum(prev?.candidatesTokenCount, next?.candidatesTokenCount),
    totalTokenCount: sum(prev?.totalTokenCount, next?.totalTokenCount),
    thoughtsTokenCount: sum(prev?.thoughtsTokenCount, next?.thoughtsTokenCount),
    cachedContentTokenCount: sum(prev?.cachedContentTokenCount, next?.cachedContentTokenCount),
  };
}

/** Xây contents cho Gemini: cắt context, bắt đầu từ user đầu tiên. */
export const MAX_CONTEXT_MESSAGES = 24;
export function formatGeminiContents(messages: Array<{ role: string; content: string }>): Array<{ role: string; parts: Array<{ text: string }> }> {
  const context = messages
    .filter((m) => typeof m?.content === "string" && m.content.trim())
    .slice(-MAX_CONTEXT_MESSAGES);
  const firstUser = context.findIndex((m) => m.role === "user");
  const usable = firstUser > 0 ? context.slice(firstUser) : context;
  return usable.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content.trim() }],
  }));
}

/** Danh sách model sẽ thử theo preferred + fallback order. */
export function modelsToTryFor(preferredModel: string, allowFallback: boolean, fallbackOrder: readonly string[]): string[] {
  if (preferredModel && preferredModel !== "auto") {
    return allowFallback
      ? [preferredModel, ...fallbackOrder.filter((m) => m !== preferredModel)]
      : [preferredModel];
  }
  return [...fallbackOrder];
}

// ── Phân loại lỗi ──
export const isLocationError = (error: string | undefined): boolean =>
  /user\s+location\s+is\s+not\s+supported|location\s+not\s+supported|unsupported\s+location/i.test(error ?? "");
export const isPolicyFinishReason = (reason: string): boolean =>
  /SAFETY|BLOCKLIST|PROHIBITED|RECITATION|SPII|LANGUAGE/i.test(reason);
export const isPolicyError = (error: string | undefined): boolean =>
  /safety|blocked|blocklist|prohibited|recitation|spii|policy/i.test(error ?? "");
export const isRecoverableStreamFailure = (error: string | undefined): boolean =>
  !isLocationError(error)
  && !/quota|rate.?limit|api\s*key|unauthenticated|permission|forbidden/i.test(error ?? "")
  && !isPolicyError(error);

/** Đọc thân lỗi response thành message ngắn. */
export async function readErrorBody(response: Response): Promise<string> {
  const raw = await response.text().catch(() => "");
  if (!raw) return `HTTP ${response.status}`;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.error?.message || parsed?.message || raw.slice(0, 1_000);
  } catch {
    return raw.slice(0, 1_000);
  }
}

// ── SSE parsing (pure) ──
export interface SseParseResult {
  text: string;
  usage?: ModelUsage;
  finishReason?: string;
  error?: string;
  doneMarker: boolean;
  parseErrors: number;
}

/** Parse 1 dòng SSE "data: {...}" — trả phần text/usage/finish/error. */
export function parseSseLine(rawLine: string): SseParseResult {
  const empty: SseParseResult = { text: "", doneMarker: false, parseErrors: 0 };
  const line = rawLine.replace(/\r$/, "");
  if (!line.startsWith("data:")) return empty;
  const jsonStr = line.slice(5).trim();
  if (!jsonStr) return empty;
  if (jsonStr === "[DONE]") return { ...empty, doneMarker: true };
  try {
    const data = JSON.parse(jsonStr);
    const usage = data?.usageMetadata && typeof data.usageMetadata === "object" ? (data.usageMetadata as ModelUsage) : undefined;
    const finish = typeof data?.candidates?.[0]?.finishReason === "string" && data.candidates[0].finishReason
      ? data.candidates[0].finishReason
      : undefined;
    const error = data?.error?.message || data?.error || data?.message;
    if (error) return { ...empty, error: String(error) };
    const text = (data?.candidates || [])
      .flatMap((candidate: GeminiCandidate) => candidate?.content?.parts || [])
      .map((part: GeminiPart) => (typeof part?.text === "string" ? part.text : ""))
      .join("");
    return { text, usage, finishReason: finish, doneMarker: false, parseErrors: 0 };
  } catch {
    return { ...empty, parseErrors: 1 };
  }
}

/** Buffer chunk text thành các dòng hoàn chỉnh — trả (completeLines, restBuffer). */
export function splitSseBuffer(buffer: string, chunk: string): { lines: string[]; rest: string } {
  const combined = buffer + chunk;
  const lines = combined.split("\n");
  const rest = lines.pop() || "";
  return { lines, rest };
}

/** Contents cho continuation — nối partial + prompt tiếp tục. */
export function buildContinuationContents(
  formatted: Array<{ role: string; parts: Array<{ text: string }> }>,
  partialText: string
): Array<{ role: string; parts: Array<{ text: string }> }> {
  return [
    ...formatted,
    { role: "model", parts: [{ text: partialText }] },
    { role: "user", parts: [{ text: CLIENT_CONTINUATION_PROMPT }] },
  ];
}

/** Temperature clamp chuẩn Gemini [0.1, 1.0]. NaN/undefined → 0.7; 0 hợp lệ → 0.1. */
export function clampTemperature(temperature: number | undefined): number {
  if (temperature === undefined || Number.isNaN(temperature)) return 0.7;
  return Math.max(0.1, Math.min(1.0, Number(temperature)));
}
