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

const PERSONA_INSTRUCTIONS: Record<string, string> = {
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
    const { messages, persona = "cybercat", preferredModel, temperature = 0.7 } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Dữ liệu tin nhắn không hợp lệ." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Chọn System Prompt theo persona
    const systemPrompt = PERSONA_INSTRUCTIONS[persona] || PERSONA_INSTRUCTIONS.cybercat;

    // Sắp xếp thứ tự Model thử nghiệm: nếu người dùng chọn model cụ thể, ưu tiên đưa lên đầu
    let modelsToTry: string[] = [...FALLBACK_MODEL_ORDER];
    if (preferredModel && modelsToTry.includes(preferredModel)) {
      modelsToTry = [preferredModel, ...modelsToTry.filter(m => m !== preferredModel)];
    }

    // Định dạng lịch sử hội thoại chuẩn theo Google Gemini REST API
    const formattedContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content || "" }],
    }));

    let lastError: any = null;
    let successfulReply: string | null = null;
    let modelUsed: string = "";
    const startTime = Date.now();

    // Duyệt qua danh sách Model Fallback theo thứ tự ưu tiên
    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: formattedContents,
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            generationConfig: {
              temperature: Math.max(0.1, Math.min(1.0, Number(temperature) || 0.7)),
              maxOutputTokens: 1200,
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
