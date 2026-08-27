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
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
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
    (env as any)?.GEMINI_API_KEY ||
    (env as any)?.AI_API_KEY ||
    import.meta.env.GEMINI_API_KEY ||
    import.meta.env.AI_API_KEY ||
    process.env.GEMINI_API_KEY;

  const baseUrl =
    (env as any)?.GEMINI_BASE_URL ||
    (env as any)?.AI_GATEWAY_URL ||
    import.meta.env.GEMINI_BASE_URL ||
    process.env.GEMINI_BASE_URL ||
    "https://generativelanguage.googleapis.com";

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        success: false,
        isMissingKey: true,
        error: "Chưa cấu hình GEMINI_API_KEY trong hệ thống.",
        reply:
          "Meow~! Hệ thống chưa tìm thấy khóa `GEMINI_API_KEY`. Bạn hãy dán API Key cá nhân miễn phí từ https://aistudio.google.com/ vào bên dưới để trò chuyện ngay nhé! 🐱🔑",
        errorDetail: "[CONFIG_ERROR] Chưa tìm thấy biến môi trường GEMINI_API_KEY trong hệ thống.",
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
    const systemPrompt = PERSONA_INSTRUCTIONS[persona] || PERSONA_INSTRUCTIONS.cybercat;

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
    const formattedContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content || "" }],
    }));

    const wantStream = body.stream === true;
    const attemptLogs: Array<{ model: string; status: number; error: string }> = [];

    // ===== STREAMING MODE: trả về Server-Sent Events, hiển thị gõ dần =====
    if (wantStream) {
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
          const startTime = Date.now();
          for (const model of modelsToTry) {
            try {
              const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
              const url = `${cleanBaseUrl}/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
              const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: formattedContents,
                  systemInstruction: { parts: [{ text: systemPrompt }] },
                  generationConfig: {
                    temperature: Math.max(0.1, Math.min(1.0, Number(temperature) || 0.7)),
                    maxOutputTokens: 1200,
                  },
                }),
              });
              if (!response.ok || !response.body) {
                const errData = await (response as any).json?.().catch(() => ({})) || {};
                const msg = errData?.error?.message || `HTTP ${response.status}`;
                attemptLogs.push({ model, status: response.status, error: msg });
                continue;
              }
              const reader = (response.body as ReadableStream<Uint8Array>).getReader();
              const decoder = new TextDecoder();
              let buffer = "";
              let hasContent = false;
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";
                for (const line of lines) {
                  if (!line.startsWith("data: ")) continue;
                  const jsonStr = line.slice(6).trim();
                  if (!jsonStr || jsonStr === "[DONE]") continue;
                  try {
                    const data = JSON.parse(jsonStr);
                    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                      hasContent = true;
                      send({ text, model });
                    }
                  } catch {}
                }
              }
              if (hasContent) {
                send({ done: true, model, durationMs: Date.now() - startTime });
                controller.close();
                return;
              } else {
                attemptLogs.push({ model, status: 200, error: "Stream kết thúc không có nội dung." });
              }
            } catch (err: any) {
              attemptLogs.push({ model, status: 0, error: err?.message || String(err) });
            }
          }
          // Tất cả model đều thất bại
          const isBlocked = attemptLogs.some(a => a.error?.toLowerCase().includes("user location is not supported"));
          send({ error: isBlocked ? "User location not supported" : "All models failed", done: true, isLocationBlocked: isBlocked, attemptLogs });
          controller.close();
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    let successfulReply: string | null = null;
    let modelUsed: string = "";
    const startTime = Date.now();

    // Duyệt qua danh sách Model theo thứ tự (non-stream fallback)
    for (const model of modelsToTry) {
      try {
        const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
        const url = `${cleanBaseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;

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
            break; // Thành công
          } else {
            attemptLogs.push({
              model,
              status: response.status,
              error: "API trả về 200 OK nhưng không có nội dung văn bản."
            });
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || errData.message || `HTTP ${response.status}`;
          attemptLogs.push({
            model,
            status: response.status,
            error: errMsg
          });
        }
      } catch (err: any) {
        attemptLogs.push({
          model,
          status: 0,
          error: err?.message || String(err)
        });
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

    // Kiểm tra xem có phải do chặn vị trí địa lý của Cloudflare egress IP không
    const isLocationBlocked = attemptLogs.some(
      att => att.error?.toLowerCase().includes("user location is not supported")
    );

    const logDetails = attemptLogs
      .map((att, idx) => `${idx + 1}. [${att.model}] (HTTP ${att.status}): ${att.error}`)
      .join("\n");

    const formattedErrorDetail = 
      `[TỔNG HỢP KẾT QUẢ THỬ NGHIỆM MODEL]\n` +
      `Model ưu tiên ban đầu: ${preferredModel || "auto"}\n` +
      `Cho phép Fallback: ${allowFallback ? "BẬT" : "TẮT"}\n` +
      `Phát hiện chặn IP Edge Cloudflare: ${isLocationBlocked ? "CÓ (User location not supported)" : "KHÔNG"}\n\n` +
      `Chi tiết từng model:\n${logDetails}`;

    let userFriendlyReply = "Meow~! Mạng nơ-ron truyền dẫn Cybernet đang gặp chút nghẽn sóng hoặc hạn mức model đã hết. Bạn hãy thử chọn model khác hoặc mở chi tiết lỗi nhé! 🐱💾";

    if (isLocationBlocked) {
      userFriendlyReply = "Meow~! Google AI Studio đang chặn dải địa chỉ IP máy chủ Edge của Cloudflare tại khu vực này (`User location is not supported`).\n\n👉 **Giải pháp:** Bạn chỉ cần dán **API Key Google AI Studio cá nhân** vào khung bên dưới để chuyển sang chế độ **Gọi Trực Tiếp Từ Trình Duyệt** (hoạt động 100% không bao giờ bị chặn IP)! 🐱🔑✨";
    }

    return new Response(
      JSON.stringify({
        success: false,
        isLocationBlocked,
        error: isLocationBlocked ? "Google AI Studio chặn IP máy chủ Cloudflare (User location not supported)." : "Tất cả các Model AI đều không phản hồi.",
        reply: userFriendlyReply,
        errorDetail: formattedErrorDetail,
        attemptLogs,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[AI CHAT API ERROR]:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Lỗi máy chủ nội bộ khi xử lý hội thoại.",
        reply:
          "Meow~! Mạng nơ-ron truyền dẫn Cybernet đang gặp sự cố nội bộ. Bạn hãy mở chi tiết lỗi bên dưới để xem nhé! 🐱💾",
        errorDetail: `[INTERNAL_SERVER_ERROR]: ${error.stack || error.message || error}`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
};
