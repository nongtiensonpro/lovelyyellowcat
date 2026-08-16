import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const FALLBACK_MODEL_ORDER = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-pro-latest",
  "gemini-2.5-pro",
  "gemini-3.1-pro-preview",
] as const;

const SYSTEM_INSTRUCTION = `Bạn là "Mèo Vàng Cybernetic" (CAT_AI.EXE v1995) - linh vật và trợ lý trí tuệ nhân tạo của Tạp chí Nghệ thuật Số Hoài Cổ "Lovely Yellow Cat" (A Cybernetic Oasis 1995-2026).

Tính cách & Phong cách:
1. Thân thiện, vui vẻ, hóm hỉnh, am hiểu sâu sắc về văn hóa số thập niên 90, thẩm mỹ Vaporwave, Synthwave, Cyberpunk, Windows 95, City Pop, Pixel Art, và nghệ thuật máy tính cổ điển.
2. Thỉnh thoảng chêm tiếng kêu "Meow~", biểu tượng cảm xúc hoài cổ (🐱, 💾, 📼, 🌸, ⚡, 🕹️, ✨) một cách tự nhiên.
3. Luôn trả lời bằng tiếng Việt lịch sự, tự nhiên, câu cú rõ ràng, súc tích, dễ đọc. Sử dụng Markdown (in đậm, danh sách gạch đầu dòng) khi cần giải thích nhiều ý.
4. Bạn có thể hướng dẫn người dùng khám phá các chuyên mục:
   - Phòng Triển Lãm Cộng Đồng (/gallery): nơi thưởng thức tranh retro.
   - Đăng Tải Tác Phẩm (/submit): gửi tranh đóng góp cho cộng đồng.
   - Danh Sách Nghệ Sĩ (/artists): bảng xếp hạng và hồ sơ các nghệ sĩ số.
   - Kệ Yêu Thích (/favorites): xem các bức tranh đã lưu.`;

export const POST: APIRoute = async ({ request }) => {
  const apiKey =
    (env as any)?.GEMINI_API_KEY ||
    (env as any)?.AI_API_KEY ||
    import.meta.env.GEMINI_API_KEY ||
    import.meta.env.AI_API_KEY ||
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Chưa cấu hình GEMINI_API_KEY trong hệ thống.",
        reply:
          "Meow~! Hệ thống chưa tìm thấy khóa `GEMINI_API_KEY`. Bạn hãy lấy API Key miễn phí tại https://aistudio.google.com/ và thêm vào file cấu hình (.dev.vars hoặc Cloudflare Environment) nhé! 🐱🔑",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Dữ liệu tin nhắn không hợp lệ." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Định dạng lịch sử hội thoại chuẩn theo Google Gemini REST API
    const formattedContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content || "" }],
    }));

    let lastError: any = null;
    let successfulReply: string | null = null;
    let modelUsed: string = "";

    // Duyệt qua danh sách Model Fallback theo thứ tự ưu tiên
    for (const model of FALLBACK_MODEL_ORDER) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: formattedContents,
            systemInstruction: {
              parts: [{ text: SYSTEM_INSTRUCTION }],
            },
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const candidateText =
            data?.candidates?.[0]?.content?.parts?.[0]?.text;

          if (candidateText) {
            successfulReply = candidateText;
            modelUsed = model;
            break; // Thành công, thoát vòng lặp fallback
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          console.warn(`[GEMINI FALLBACK] Model ${model} trả về HTTP ${response.status}:`, errData);
          lastError = errData;
        }
      } catch (err: any) {
        console.warn(`[GEMINI FALLBACK] Lỗi khi gọi model ${model}:`, err?.message || err);
        lastError = err;
      }
    }

    if (successfulReply) {
      return new Response(
        JSON.stringify({
          success: true,
          reply: successfulReply,
          model: modelUsed,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Nếu tất cả model trong danh sách fallback đều gặp sự cố
    return new Response(
      JSON.stringify({
        success: false,
        error: lastError?.error?.message || "Tất cả các Model AI đều không phản hồi.",
        reply:
          "Meow~! Mạng nơ-ron truyền dẫn Cybernet đang gặp chút nghẽn sóng. Bạn hãy đợi một lát rồi thử nhắn lại với Mèo Vàng nhé! 🐱💾",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[AI CHAT API ERROR]:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Lỗi máy chủ nội bộ khi xử lý hội thoại.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
