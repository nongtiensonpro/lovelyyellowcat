import React, { useState, useRef, useEffect } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import {
  toBase64,
  fromBase64,
  deriveKEK,
  generateMasterKey,
  wrapMasterKey,
  unwrapMasterKey,
  generateSalt,
  encryptJson,
  decryptJson,
  encryptString,
  decryptString,
  isPassphraseStrong,
  exportMasterKeyRaw,
} from "../lib/aiCrypto";

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
  modelName?: string;
  durationMs?: number;
  isError?: boolean;
  errorDetail?: string;
  isLocationBlocked?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  persona: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// 4 Nhân cách AI độc đáo
export const PERSONAS = [
  {
    id: "cybercat",
    name: "Mèo Vàng Cybernetic",
    role: "Linh vật Tạp chí & Hướng dẫn",
    icon: "🐱",
    avatarBg: "from-[#fffb96] to-[#ff9a3c]",
    desc: "Thân thiện, hóm hỉnh, am hiểu sâu sắc về văn hóa Vaporwave, Synthwave và hướng dẫn sử dụng website.",
    defaultGreeting: "Meow~! Chào mừng bạn đến với Trạm Trí Tuệ Nhân Tạo **Lovely Yellow Cat** 🐱💾! Tôi là Mèo Vàng Cybernetic (CAT_AI.EXE v1995). Tôi có thể giúp gì cho bạn hôm nay?",
    badgeColor: "bg-vapor-yellow text-black",
  },
  {
    id: "art_critic",
    name: "Giáo Sư V.A.P.O.R",
    role: "Nhà Giám Định Mỹ Thuật 1995",
    icon: "🎨",
    avatarBg: "from-[#b967ff] to-[#ff71ce]",
    desc: "Uyên bác, phân tích chuyên sâu về mỹ thuật thị giác, bảng màu neon pastel, bố cục retro và kỹ thuật đổ bóng dither.",
    defaultGreeting: "Kính chào quý bạn yêu nghệ thuật! Tôi là Giáo sư V.A.P.O.R 🎨🏛️. Rất hân hạnh được đồng hành cùng bạn mổ xẻ các kiệt tác và trào lưu thị giác hoài niệm.",
    badgeColor: "bg-vapor-purple text-white",
  },
  {
    id: "hacker",
    name: "CYBER_GHOST_95",
    role: "Hacker Y2K & Retro Computing",
    icon: "💾",
    avatarBg: "from-[#05ffa1] to-[#01cdfe]",
    desc: "Chuyên gia kiến trúc máy tính x86 cổ điển, MS-DOS, Windows 95, mạng BBS Dial-up và lập trình hoài niệm.",
    defaultGreeting: "CONNECT 19200/ARQ... Tín hiệu kết nối Terminal đã thông suốt 💾⚡. Nhập lệnh truy vấn hoặc câu hỏi kỹ thuật của bạn.",
    badgeColor: "bg-vapor-green text-black",
  },
  {
    id: "synth_dj",
    name: "DJ NEON PULSE",
    role: "Synthwave DJ & Lo-Fi Poet",
    icon: "📼",
    avatarBg: "from-[#ff71ce] to-[#01cdfe]",
    desc: "Lãng mạn, du dương, gợi ý những giai điệu analog synth huyền ảo, viết thơ phong cách hoài cổ và văn hóa City Pop.",
    defaultGreeting: "Chào buổi tối từ phòng thu Neon Pulse 📼🎷🌃. Bạn cần một playlist nhạc chill thư giãn hay muốn cùng tôi viết nên những vần thơ dưới ánh đèn đêm?",
    badgeColor: "bg-vapor-pink text-black",
  }
];

const PERSONA_PROMPTS: Record<string, string> = {
  cybercat: `Bạn là "Mèo Vàng Cybernetic" (CAT_AI.EXE v1995) - linh vật và trợ lý trí tuệ nhân tạo của Tạp chí Nghệ thuật Số Hoài Cổ "Lovely Yellow Cat" (A Cybernetic Oasis 1995-2026).
Tính cách & Phong cách:
1. Thân thiện, vui vẻ, hóm hỉnh, am hiểu sâu sắc về văn hóa số thập niên 90, thẩm mỹ Vaporwave, Synthwave, Cyberpunk, Windows 95, City Pop, Pixel Art, và nghệ thuật máy tính cổ điển.
2. Thỉnh thoảng chêm tiếng kêu "Meow~", biểu tượng cảm xúc hoài cổ (🐱, 💾, 📼, 🌸, ⚡, 🕹️, ✨) một cách tự nhiên.
3. Luôn trả lời bằng tiếng Việt lịch sự, tự nhiên, câu cú rõ ràng, súc tích, dễ đọc. Sử dụng Markdown khi cần giải thích nhiều ý.
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

// Danh sách các Model Gemini hỗ trợ
export const MODEL_OPTIONS = [
  { id: "auto", name: "⚡ Tự Động Fallback (Khuyên dùng - Tự tìm model sẵn sàng)" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "gemini-flash-latest", name: "Gemini Flash Latest" },
  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash Preview" },
  { id: "gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash Lite Preview" },
  { id: "gemini-pro-latest", name: "Gemini Pro Latest" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash (Ổn định nhất)" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (Bền bỉ)" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
];

// Thư viện đề tài gợi ý chuyên sâu
export const TOPIC_CATEGORIES = [
  {
    category: "🎨 Thẩm Mỹ Vaporwave",
    topics: [
      "Vaporwave là gì và cội nguồn triết lý của nó?",
      "Tại sao tượng cổ Hy Lạp lại xuất hiện trong tranh Vaporwave?",
      "Phân biệt giữa Vaporwave, Synthwave và Cyberpunk",
      "Bảng màu Neon Pastel gồm những sắc độ kinh điển nào?"
    ]
  },
  {
    category: "💾 Kỹ Thuật Số & Hoài Niệm 90s",
    topics: [
      "Vẻ đẹp giao diện xám 3D của Windows 95",
      "Kỷ nguyên Internet Dial-up 56k và tiếng rè kết nối modem",
      "Màn hình CRT Sony Trinitron và hiện tượng quét scanline",
      "Nghệ thuật Pixel Art 16-bit thời hoàng kim arcade"
    ]
  },
  {
    category: "📼 Âm Nhạc & City Pop",
    topics: [
      "Gợi ý 5 album Synthwave / Retrowave huyền thoại",
      "Tại sao âm nhạc City Pop Nhật Bản thập niên 80 lại gây sốt?",
      "Album Floral Shoppe của Macintosh Plus có gì đặc biệt?",
      "Viết cho tôi một bài thơ ngắn ngập tràn ánh đèn neon và hoàng hôn tím"
    ]
  },
  {
    category: "🖼️ Tạp Chí & Triển Lãm",
    topics: [
      "Hướng dẫn cách đăng tải tác phẩm lên phòng tranh cộng đồng",
      "Hệ thống điểm tích lũy XP và huy chương hoạt động như thế nào?",
      "Làm sao để liên hệ ban biên tập và góp ý nội dung bài viết?"
    ]
  }
];

const STORAGE_KEY = "vapor_ai_chat_sessions_v2"; // legacy, chỉ dùng để migrate 1 lần rồi xóa
const API_KEY_STORAGE = "user_gemini_api_key";
const LEGACY_API_KEY_STORAGE = "user_gemini_api_key"; // giữ để tương thích, nhưng sẽ mã hóa khi có masterKey

// Phát âm thanh retro 8-bit đơn giản qua Web Audio API
function playRetroBeep(freq = 440, type: OscillatorType = "sine", duration = 0.08) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Ignore audio errors if blocked by browser policy
  }
}

// Hàm gọi trực tiếp Google AI Studio từ trình duyệt của người dùng (Bỏ qua 100% chặn IP Cloudflare)
async function executeClientDirectChat(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  persona: string,
  preferredModel: string,
  allowFallback: boolean,
  temperature: number
) {
  const systemPrompt = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.cybercat;
  let modelsToTry: string[] = [];

  if (preferredModel && preferredModel !== "auto") {
    if (allowFallback) {
      modelsToTry = [preferredModel, ...FALLBACK_MODEL_ORDER.filter(m => m !== preferredModel)];
    } else {
      modelsToTry = [preferredModel];
    }
  } else {
    modelsToTry = [...FALLBACK_MODEL_ORDER];
  }

  const formattedContents = messages.map(m => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content || "" }]
  }));

  const attemptLogs: Array<{ model: string; status: number; error: string }> = [];
  let successfulReply: string | null = null;
  let modelUsed: string = "";
  const startTime = Date.now();

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
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

      if (response.ok) {
        const data = await response.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          successfulReply = candidateText;
          modelUsed = model;
          break;
        } else {
          attemptLogs.push({ model, status: response.status, error: "API 200 nhưng candidates rỗng." });
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        attemptLogs.push({
          model,
          status: response.status,
          error: errData.error?.message || errData.message || `HTTP ${response.status}`
        });
      }
    } catch (err: any) {
      attemptLogs.push({ model, status: 0, error: err?.message || String(err) });
    }
  }

  const durationMs = Date.now() - startTime;
  if (successfulReply) {
    return { success: true, reply: successfulReply, model: modelUsed, durationMs };
  }

  const logDetails = attemptLogs
    .map((att, idx) => `${idx + 1}. [${att.model}] (HTTP ${att.status}): ${att.error}`)
    .join("\n");

  const hasQuotaError = attemptLogs.some(a => a.error?.includes("Quota exceeded") || a.status === 429);

  return {
    success: false,
    hasQuotaError,
    reply: hasQuotaError
      ? "Meow~! Hạn mức miễn phí (Quota) của Key AI hiện đang bị quá tải. Bạn hãy thử chọn Model khác (như Gemini 2.0 Flash / 1.5 Flash) hoặc đổi sang API Key cá nhân trong Cài đặt nhé! 🐱💾"
      : "Meow~! Mạng nơ-ron Google AI Studio gặp lỗi phản hồi. Bạn hãy mở chi tiết lỗi bên dưới để xem thêm nhé! 🐱💾",
    errorDetail: `[CLIENT-SIDE DIRECT EXECUTION]\nChi tiết từng model:\n${logDetails}`,
  };
}

export const AiChatStation: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState("cybercat");
  const [selectedModel, setSelectedModel] = useState("auto");
  const [allowFallback, setAllowFallback] = useState(true);
  const [temperature, setTemperature] = useState(0.7);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "topics" | "settings">("chat");
  const [expandedErrors, setExpandedErrors] = useState<Record<string, boolean>>({});
  
  // Cờ cho biết hệ thống có key AI mặc định hay không.
  // Server CHỈ trả boolean — key gốc không bao giờ được gửi xuống trình duyệt.
  const [hasSystemKey, setHasSystemKey] = useState(false);
  
  // Custom API Key do người dùng tự đổi khi hệ thống quá tải
  const [userCustomApiKey, setUserCustomApiKey] = useState<string>("");
  const [inlineKeyInput, setInlineKeyInput] = useState<string>("");

  // ===== E2EE Zero-Knowledge States (bắt buộc) =====
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passphraseInput, setPassphraseInput] = useState("");
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isAccountBanned, setIsAccountBanned] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [unlockError, setUnlockError] = useState("");
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [isE2EELoading, setIsE2ELoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const toggleExpandError = (msgId: string) => {
    setExpandedErrors(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  // ===== E2EE Helpers =====
  const loadSessionsFromSupabase = async (key: CryptoKey) => {
    setIsE2EELoading(true);
    try {
      const res = await fetch("/api/ai/sessions");
      if (!res.ok) throw new Error("Không thể tải phiên");
      const { sessions: encSessions } = await res.json();
      if (!encSessions || encSessions.length === 0) {
        // Tạo phiên đầu tiên được mã hóa
        await createNewSessionEncrypted("cybercat", key);
        return;
      }
      const decrypted: ChatSession[] = [];
      for (const s of encSessions) {
        try {
          const title = await decryptString({ iv: s.title_iv, ciphertext: s.title_encrypted }, key);
          // Tải messages cho session này
          const msgRes = await fetch(`/api/ai/messages?session_id=${s.id}`);
          const { messages: encMessages } = await msgRes.json();
          const msgs: ChatMessage[] = [];
          for (const m of encMessages || []) {
            try {
              const obj = await decryptJson<{ content: string; timestamp: string; modelName?: string; durationMs?: number; isError?: boolean; errorDetail?: string }>(
                { iv: m.iv, ciphertext: m.ciphertext },
                key
              );
              msgs.push({
                id: m.id,
                role: m.role,
                content: obj.content,
                timestamp: obj.timestamp || new Date(m.created_at).toLocaleTimeString("vi-VN"),
                modelName: obj.modelName || m.model_name,
                durationMs: obj.durationMs,
                isError: obj.isError || m.is_error,
                errorDetail: obj.errorDetail,
              });
            } catch {}
          }
          // Nếu chưa có message nào (phiên mới), thêm greeting
          const persona = PERSONAS.find(p => p.id === s.persona) || PERSONAS[0];
          if (msgs.length === 0) {
            msgs.push({
              id: `msg-welcome-1`,
              role: "model",
              content: persona.defaultGreeting,
              timestamp: "1995-INIT",
            });
          }
          decrypted.push({
            id: s.id,
            title,
            persona: s.persona,
            messages: msgs,
            createdAt: new Date(s.created_at).getTime(),
            updatedAt: new Date(s.updated_at).getTime(),
          });
        } catch {}
      }
      if (decrypted.length > 0) {
        // Sắp xếp theo updated_at giảm dần (server đã sort nhưng decrypt xong giữ nguyên)
        decrypted.sort((a, b) => b.updatedAt - a.updatedAt);
        setSessions(decrypted);
        setActiveSessionId(decrypted[0].id);
        setSelectedPersonaId(decrypted[0].persona || "cybercat");
      } else {
        await createNewSessionEncrypted("cybercat", key);
      }
      // Xóa localStorage plaintext cũ sau khi migrate thành công (bảo mật)
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    } catch (e) {
      console.error("Load E2EE sessions failed:", e);
    } finally {
      setIsE2ELoading(false);
    }
  };

  const createNewSessionEncrypted = async (personaId: string, keyOverride?: CryptoKey) => {
    const k = keyOverride || masterKey;
    if (!k) return null;
    const persona = PERSONAS.find(p => p.id === personaId) || PERSONAS[0];
    const titlePlain = `Hội thoại cùng ${persona.name}`;
    try {
      const { iv, ciphertext } = await encryptString(titlePlain, k);
      const res = await fetch("/api/ai/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title_encrypted: ciphertext, title_iv: iv, persona: persona.id }),
      });
      const { session } = await res.json();
      if (!session) throw new Error("Tạo phiên thất bại");
      const newSession: ChatSession = {
        id: session.id,
        title: titlePlain,
        persona: persona.id,
        createdAt: new Date(session.created_at).getTime(),
        updatedAt: new Date(session.updated_at).getTime(),
        messages: [
          {
            id: `msg-welcome-1`,
            role: "model",
            content: persona.defaultGreeting,
            timestamp: "1995-INIT",
          },
        ],
      };
      // Lưu greeting đã mã hóa
      try {
        const payload = await encryptJson(
          { content: persona.defaultGreeting, timestamp: "1995-INIT" },
          k
        );
        await fetch("/api/ai/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: session.id,
            role: "model",
            ciphertext: payload.ciphertext,
            iv: payload.iv,
          }),
        });
      } catch {}
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setSelectedPersonaId(persona.id);
      return newSession;
    } catch (e) {
      console.error("createNewSessionEncrypted failed:", e);
      return null;
    }
  };

  // Legacy fallback (khi chưa unlock, vẫn tạo local để không crash)
  const createNewSession = (personaId = "cybercat") => {
    if (isUnlocked && masterKey) {
      createNewSessionEncrypted(personaId, masterKey);
      return null as any;
    }
    const persona = PERSONAS.find(p => p.id === personaId) || PERSONAS[0];
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: `Hội thoại cùng ${persona.name}`,
      persona: persona.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [
        {
          id: `msg-welcome-1`,
          role: "model",
          content: persona.defaultGreeting,
          timestamp: "1995-INIT",
        }
      ]
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setSelectedPersonaId(persona.id);
    return newSession;
  };

  // E2EE: Thiết lập / mở khóa
  const handleSetupPassphrase = async (passphrase: string) => {
    if (!isPassphraseStrong(passphrase)) {
      setUnlockError("Mật khẩu phải ít nhất 8 ký tự.");
      return;
    }
    setUnlockError("");
    setIsE2ELoading(true);
    try {
      const salt = generateSalt();
      const kek = await deriveKEK(passphrase, salt);
      const mk = await generateMasterKey();
      const { encryptedMasterKey, ivWrap } = await wrapMasterKey(mk, kek);
      const res = await fetch("/api/ai/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encrypted_master_key: encryptedMasterKey,
          kek_salt: toBase64(salt),
          kek_iterations: 250000,
          iv_wrap: ivWrap,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Không thể lưu khóa");
      }
      // Lưu recovery key (masterKey raw) để user in ra
      const raw = await exportMasterKeyRaw(mk);
      setRecoveryKey(toBase64(raw));
      setShowRecoveryModal(true);
      setMasterKey(mk);
      setIsUnlocked(true);
      setShowPassphraseModal(false);
      setPassphraseInput("");
      // Migrate localStorage cũ nếu có (đã mã hóa xong sẽ xóa)
      await loadSessionsFromSupabase(mk);
    } catch (e: any) {
      setUnlockError(e.message || "Thiết lập thất bại");
    } finally {
      setIsE2ELoading(false);
    }
  };

  const handleUnlock = async (passphrase: string) => {
    if (!passphrase) {
      setUnlockError("Vui lòng nhập mật khẩu mã hóa.");
      return;
    }
    setUnlockError("");
    setIsE2ELoading(true);
    try {
      const res = await fetch("/api/ai/keys");
      const data = await res.json();
      if (!data.exists) throw new Error("Chưa có khóa, vui lòng thiết lập mới.");
      const kek = await deriveKEK(passphrase, fromBase64(data.kek_salt));
      const mk = await unwrapMasterKey(data.encrypted_master_key, data.iv_wrap, kek);
      setMasterKey(mk);
      setIsUnlocked(true);
      setShowPassphraseModal(false);
      setPassphraseInput("");
      await loadSessionsFromSupabase(mk);
    } catch (e: any) {
      setUnlockError("Mật khẩu không đúng hoặc dữ liệu bị hỏng. Vui lòng thử lại.");
    } finally {
      setIsE2ELoading(false);
    }
  };

  const handleLock = () => {
    setMasterKey(null);
    setIsUnlocked(false);
    setSessions([]);
    setPassphraseInput("");
  };

  // Nạp cấu hình và kiểm tra trạng thái E2EE khi khởi động
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        // 1. Kiểm tra hệ thống có cấu hình AI mặc định không
        fetch("/api/ai/config")
          .then(res => res.json())
          .then(data => {
            if (!cancelled && data?.hasKey) setHasSystemKey(true);
          })
          .catch(e => console.warn("Không thể lấy cấu hình AI mặc định:", e));

        // 2. Nạp key cá nhân nếu người dùng đã từng lưu (sẽ mã hóa sau khi unlock)
        const savedCustomKey = localStorage.getItem(API_KEY_STORAGE);
        if (savedCustomKey) {
          setUserCustomApiKey(savedCustomKey);
          setInlineKeyInput(savedCustomKey);
        }

        // 3. Kiểm tra đăng nhập & trạng thái khóa E2EE qua API server-side (cookie httpOnly)
        // Không dùng getSupabaseBrowserClient().auth.getUser() vì nó đọc localStorage, không thấy session cookie httpOnly do SSR đặt.
        // Thay vào đó gọi trực tiếp /api/ai/keys — server sẽ trả 401/403 chính xác.
        if (!cancelled) {
          setAuthChecked(true);
          setNeedsLogin(false);
        }

        // 4. Kiểm tra đã có khóa E2EE chưa
        const keyRes = await fetch("/api/ai/keys", { credentials: "same-origin" });
        if (keyRes.status === 401 || keyRes.status === 403) {
          if (!cancelled) {
            if (keyRes.status === 401) setNeedsLogin(true);
            if (keyRes.status === 403) setIsAccountBanned(true);
            setLoadingKeys(false);
          }
          return;
        }
        const keyData = await keyRes.json();
        if (!cancelled) {
          if (!keyData.exists) {
            setIsFirstSetup(true);
            setShowPassphraseModal(true);
          } else {
            setIsFirstSetup(false);
            setShowPassphraseModal(true);
          }
          setLoadingKeys(false);
        }
      } catch (e) {
        console.warn("Init E2EE failed:", e);
        if (!cancelled) {
          setLoadingKeys(false);
          setAuthChecked(true);
        }
      }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  // Lấy phiên chat hiện tại
  const currentSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, isTyping]);

  // Lưu Custom API Key khi người dùng muốn tự đổi
  const handleSaveCustomApiKey = (keyToSave: string) => {
    const trimmed = keyToSave.trim();
    if (!trimmed) {
      localStorage.removeItem(API_KEY_STORAGE);
      setUserCustomApiKey("");
      alert("Đã khôi phục về sử dụng API Key mặc định của hệ thống.");
    } else {
      localStorage.setItem(API_KEY_STORAGE, trimmed);
      setUserCustomApiKey(trimmed);
      alert("✓ Đã lưu API Key cá nhân thành công!");
    }
  };

  // Xử lý gửi tin nhắn — E2EE bắt buộc
  const handleSendMessage = async (textToSend?: string, overrideApiKey?: string) => {
    if (needsLogin) {
      alert("Vui lòng đăng nhập bằng tài khoản hoạt động để sử dụng AI. E2EE yêu cầu xác thực.");
      return;
    }
    if (isAccountBanned) {
      alert("Tài khoản của bạn đã bị chặn, không thể sử dụng AI.");
      return;
    }
    if (!isUnlocked || !masterKey) {
      setShowPassphraseModal(true);
      setUnlockError("Vui lòng mở khóa bằng mật khẩu mã hóa trước khi trò chuyện. Đây là yêu cầu bắt buộc để đảm bảo E2EE.");
      return;
    }
    const content = (textToSend || inputVal).trim();
    if (!content || isTyping || !currentSession) return;

    if (soundEnabled) playRetroBeep(587.33, "sine", 0.06); // D5 note

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: timeStr,
    };

    const updatedMessages = [...currentSession.messages, userMsg];

    // Cập nhật title của phiên nếu là tin nhắn đầu của user — mã hóa và PATCH
    const userMessageCount = updatedMessages.filter(m => m.role === "user").length;
    let newTitle = currentSession.title;
    if (userMessageCount === 1) {
      newTitle = content.length > 30 ? content.substring(0, 30) + "..." : content;
      // Mã hóa title mới và cập nhật server (không chặn UI)
      if (masterKey) {
        encryptString(newTitle, masterKey).then(payload => {
          fetch("/api/ai/sessions", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: currentSession.id, title_encrypted: payload.ciphertext, title_iv: payload.iv }),
          }).catch(() => {});
        });
      }
    }

    setSessions(prev =>
      prev.map(s =>
        s.id === currentSession.id
          ? { ...s, messages: updatedMessages, title: newTitle, updatedAt: Date.now() }
          : s
      )
    );

    // Lưu userMsg đã mã hóa lên Supabase (fire-and-forget, không chặn Gemini)
    if (masterKey) {
      encryptJson({ content: userMsg.content, timestamp: userMsg.timestamp }, masterKey)
        .then(payload => {
          return fetch("/api/ai/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session_id: currentSession.id,
              role: "user",
              ciphertext: payload.ciphertext,
              iv: payload.iv,
            }),
          });
        })
        .then(res => {
          if (res) return res.json();
        })
        .then(data => {
          if (data?.message?.id) {
            // Đồng bộ id server cho userMsg (tùy chọn)
            setSessions(prev => prev.map(s => s.id === currentSession.id ? { ...s, messages: s.messages.map(m => m.id === userMsg.id ? { ...m, id: data.message.id } : m) } : s));
          }
        })
        .catch(() => {});
    }

    // CHỈ key cá nhân do người dùng tự cung cấp (BYOK) mới được gọi trực tiếp từ trình duyệt.
    // Key hệ thống luôn đi qua proxy /api/ai/chat phía server và không bao giờ rời khỏi máy chủ.
    const effectiveApiKey = (overrideApiKey || userCustomApiKey).trim();

    try {
      let result: any = null;

      // NẾU NGƯỜI DÙNG TỰ DÁN KEY CÁ NHÂN -> GỌI TRỰC TIẾP TỪ TRÌNH DUYỆT ĐỂ BỎ QUA CHẶN IP CLOUDFLARE
      if (effectiveApiKey) {
        result = await executeClientDirectChat(
          effectiveApiKey,
          updatedMessages.map(m => ({ role: m.role, content: m.content })),
          currentSession.persona,
          selectedModel,
          allowFallback,
          temperature
        );
      } else {
        // Fallback gọi qua backend nếu chưa tải được key
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
            persona: currentSession.persona,
            preferredModel: selectedModel === "auto" ? undefined : selectedModel,
            allowFallback,
            temperature,
          }),
        });

        result = await res.json();
      }

      if (soundEnabled) playRetroBeep(880, "triangle", 0.09); // A5 note

      if (result.success === false || result.error) {
        const errorModelMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: "model",
          content: result.reply || "Meow~! Mạng nơ-ron truyền dẫn Cybernet đang gặp chút nghẽn sóng. Bạn hãy thử đổi sang Model khác nhé! 🐱💾",
          timestamp: `${new Date().getHours().toString().padStart(2, "0")}:${new Date().getMinutes().toString().padStart(2, "0")}`,
          isError: true,
          errorDetail: result.errorDetail || result.error || "Lỗi không xác định khi kết nối với máy chủ Google AI Studio.",
          isLocationBlocked: result.isLocationBlocked,
        };

        setSessions(prev =>
          prev.map(s =>
            s.id === currentSession.id
              ? { ...s, messages: [...updatedMessages, errorModelMsg], updatedAt: Date.now() }
              : s
          )
        );
      } else if (result.reply) {
        const modelMsg: ChatMessage = {
          id: `model-${Date.now()}`,
          role: "model",
          content: result.reply,
          timestamp: `${new Date().getHours().toString().padStart(2, "0")}:${new Date().getMinutes().toString().padStart(2, "0")}`,
          modelName: result.model,
          durationMs: result.durationMs,
        };

        setSessions(prev =>
          prev.map(s =>
            s.id === currentSession.id
              ? { ...s, messages: [...updatedMessages, modelMsg], updatedAt: Date.now() }
              : s
          )
        );

        // Lưu reply đã mã hóa (E2EE)
        if (masterKey) {
          encryptJson(
            {
              content: modelMsg.content,
              timestamp: modelMsg.timestamp,
              modelName: modelMsg.modelName,
              durationMs: modelMsg.durationMs,
            },
            masterKey
          )
            .then(payload =>
              fetch("/api/ai/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  session_id: currentSession.id,
                  role: "model",
                  ciphertext: payload.ciphertext,
                  iv: payload.iv,
                  model_name: modelMsg.modelName,
                }),
              })
            )
            .catch(() => {});
        }
      } else {
        throw new Error(result.error || "Không nhận được phản hồi từ AI.");
      }
    } catch (err: any) {
      console.error(err);
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "model",
        content: "Meow~! Mạng nơ-ron truyền dẫn Cybernet đang gặp chút nghẽn sóng. Bạn hãy đợi một lát rồi thử nhắn lại với Mèo Vàng nhé! 🐱💾",
        timestamp: `${new Date().getHours().toString().padStart(2, "0")}:${new Date().getMinutes().toString().padStart(2, "0")}`,
        isError: true,
        errorDetail: `[CLIENT_FETCH_EXCEPTION]: ${err?.message || err}`,
      };
      setSessions(prev =>
        prev.map(s =>
          s.id === currentSession.id
            ? { ...s, messages: [...updatedMessages, errMsg], updatedAt: Date.now() }
            : s
        )
      );
    } finally {
      setIsTyping(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Đổi Persona cho phiên hiện tại
  const handleSwitchPersona = (newPersonaId: string) => {
    setSelectedPersonaId(newPersonaId);
    if (!currentSession) return;

    const persona = PERSONAS.find(p => p.id === newPersonaId) || PERSONAS[0];
    const switchNoticeMsg: ChatMessage = {
      id: `sys-${Date.now()}`,
      role: "model",
      content: `*Đã chuyển đổi sang nhân cách **${persona.name}** (${persona.role}).*\n\n${persona.defaultGreeting}`,
      timestamp: "SWITCH",
    };

    setSessions(prev =>
      prev.map(s =>
        s.id === currentSession.id
          ? {
              ...s,
              persona: newPersonaId,
              messages: [...s.messages, switchNoticeMsg],
              updatedAt: Date.now()
            }
          : s
      )
    );
  };

  // Xóa một phiên hội thoại (E2EE: xóa trên Supabase)
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isUnlocked || !masterKey) {
      // Chưa unlock: chỉ xóa local
      const filteredLocal = sessions.filter(s => s.id !== sessionId);
      if (filteredLocal.length === 0) {
        createNewSession(selectedPersonaId);
      } else {
        setSessions(filteredLocal);
        if (activeSessionId === sessionId) {
          setActiveSessionId(filteredLocal[0].id);
          setSelectedPersonaId(filteredLocal[0].persona || "cybercat");
        }
      }
      return;
    }
    try {
      const res = await fetch(`/api/ai/sessions?id=${sessionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Xóa phiên thất bại");
      const filtered = sessions.filter(s => s.id !== sessionId);
      if (filtered.length === 0) {
        // Tạo phiên mới mã hóa
        await createNewSessionEncrypted(selectedPersonaId, masterKey);
      } else {
        setSessions(filtered);
        if (activeSessionId === sessionId) {
          setActiveSessionId(filtered[0].id);
          setSelectedPersonaId(filtered[0].persona || "cybercat");
        }
      }
    } catch (err) {
      console.error("Delete session failed:", err);
      alert("Không thể xóa phiên. Vui lòng thử lại.");
    }
  };

  // Sao chép tin nhắn
  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    if (soundEnabled) playRetroBeep(659.25, "sine", 0.05);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Đọc to tin nhắn (Text to Speech)
  const handleSpeakText = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      alert("Trình duyệt của bạn không hỗ trợ Speech Synthesis API.");
      return;
    }

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`~]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "vi-VN";
    utterance.rate = 1.0;

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  // Xuất file Transcript
  const handleExportChat = (format: "txt" | "json") => {
    if (!currentSession) return;
    let content = "";
    let mimeType = "text/plain";
    let fileName = `vapor_chat_${currentSession.id}.${format}`;

    if (format === "json") {
      content = JSON.stringify(currentSession, null, 2);
      mimeType = "application/json";
    } else {
      content = `====================================================\n` +
        `💾 LOVELY YELLOW CAT // CYBER AI CHAT TRANSCRIPT\n` +
        `🏷️ Phiên: ${currentSession.title}\n` +
        `👤 Nhân cách: ${currentSession.persona}\n` +
        `📅 Thời gian: ${new Date(currentSession.createdAt).toLocaleString("vi-VN")}\n` +
        `====================================================\n\n` +
        currentSession.messages.map(m => `[${m.timestamp}] ${m.role === 'user' ? 'BẠN' : 'AI'}:\n${m.content}\n`).join("\n---\n\n");
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Định dạng markdown đơn giản
  const formatMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-black/10 px-1 py-0.5 font-mono text-[11px]">$1</code>');
  };

  const activePersonaObj = PERSONAS.find(p => p.id === (currentSession?.persona || selectedPersonaId)) || PERSONAS[0];

  return (
    <div className="font-retro text-black select-none max-w-7xl mx-auto my-4 space-y-4">

      {/* ===== E2EE Passphrase Modal — BẮT BUỘC ===== */}
      {showPassphraseModal && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="win95-container bg-win-gray w-full max-w-md shadow-2xl">
            <div className="win95-header">
              <span>🔐 VAPOR_ENCRYPT.EXE — {isFirstSetup ? "THIẾT LẬP MẬT KHẨU" : "MỞ KHÓA PHIÊN"}</span>
            </div>
            <div className="p-4 bg-win-gray space-y-3">
              <div className="bg-[#fffb96]/40 border border-win-dark p-2 text-[11px] leading-relaxed">
                {isFirstSetup ? (
                  <p><strong>Chào mừng!</strong> Để đảm bảo <strong>E2EE bắt buộc</strong>, bạn cần đặt <strong>mật khẩu mã hóa</strong> (≥8 ký tự). Mật khẩu này dùng để dẫn xuất khóa mã hóa lịch sử. <strong>Quên = mất dữ liệu</strong> — hãy ghi nhớ hoặc lưu khóa khôi phục sẽ hiện sau khi tạo.</p>
                ) : (
                  <p>Nhập <strong>mật khẩu mã hóa</strong> để mở khóa lịch sử. Máy chủ <strong>không bao giờ</strong> thấy mật khẩu hay nội dung chat.</p>
                )}
                <p className="mt-2 text-[10px] text-win-dark">Chỉ tài khoản hoạt động mới được sử dụng AI. Dữ liệu lưu vĩnh viễn theo tài khoản, tuân thủ <a href="/terms" target="_blank" className="underline text-vapor-purple">/terms</a>.</p>
              </div>
              <input
                type="password"
                placeholder={isFirstSetup ? "Đặt mật khẩu mới (≥8 ký tự)" : "Nhập mật khẩu mã hóa"}
                value={passphraseInput}
                onChange={(e) => setPassphraseInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") isFirstSetup ? handleSetupPassphrase(passphraseInput) : handleUnlock(passphraseInput); }}
                className="w-full p-2 border border-win-dark bg-white font-mono text-xs"
                autoFocus
              />
              {unlockError && <p className="text-red-700 text-xs font-bold bg-red-100 border border-red-300 p-2">{unlockError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isE2EELoading}
                  onClick={() => isFirstSetup ? handleSetupPassphrase(passphraseInput) : handleUnlock(passphraseInput)}
                  className="win95-btn flex-1 py-2 font-bold bg-vapor-purple text-white disabled:opacity-50"
                >
                  {isE2EELoading ? "⏳ Đang xử lý..." : isFirstSetup ? "🔐 THIẾT LẬP & MÃ HÓA" : "🔓 MỞ KHÓA"}
                </button>
                {!isFirstSetup && (
                  <button type="button" onClick={() => { setShowPassphraseModal(false); }} className="win95-btn px-3 py-2">Đóng</button>
                )}
              </div>
              <p className="text-[10px] text-win-dark text-center">Mật khẩu được dùng với PBKDF2 250k vòng + AES-GCM 256 ngay trên trình duyệt của bạn.</p>
            </div>
          </div>
        </div>
      )}

      {/* Recovery Key Modal */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="win95-container bg-win-gray w-full max-w-lg shadow-2xl">
            <div className="win95-header bg-gradient-to-r from-vapor-pink to-vapor-purple"><span>🔑 KHÓA KHÔI PHỤC — LƯU NGAY!</span></div>
            <div className="p-4 space-y-3 bg-win-gray text-xs">
              <p className="font-bold text-red-700 bg-red-100 border border-red-300 p-2">⚠️ Đây là lần DUY NHẤT bạn thấy khóa này. In ra hoặc lưu vào trình quản lý mật khẩu. Mất mật khẩu + mất khóa này = mất vĩnh viễn lịch sử (admin cũng không khôi phục được).</p>
              <div className="bg-black text-vapor-green p-3 font-mono text-xs break-all select-all border-2 border-win-dark">{recoveryKey}</div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { navigator.clipboard.writeText(recoveryKey); alert("Đã sao chép!"); }} className="win95-btn flex-1 py-2 font-bold">📋 Sao chép</button>
                <button type="button" onClick={() => setShowRecoveryModal(false)} className="win95-btn flex-1 py-2 font-bold bg-vapor-green">✅ ĐÃ LƯU AN TOÀN</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trạng thái cần đăng nhập / bị chặn — TOÀN TRANG, chặn mọi tương tác */}
      {needsLogin && (
        <div className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="win95-container bg-win-gray w-full max-w-lg shadow-2xl">
            <div className="win95-header bg-gradient-to-r from-red-700 to-red-600"><span>🔒 YÊU CẦU ĐĂNG NHẬP — TRẠM AI</span></div>
            <div className="p-6 bg-win-gray text-center space-y-4">
              <div className="text-5xl">🔐</div>
              <h2 className="font-bold text-sm">VUI LÒNG ĐĂNG NHẬP ĐỂ TIẾP TỤC</h2>
              <p className="text-xs leading-relaxed max-w-md mx-auto">
                Trạm AI yêu cầu <strong>tài khoản hoạt động</strong> (E2EE bắt buộc). Toàn bộ hội thoại được mã hóa <strong>AES-GCM 256</strong> ngay trên trình duyệt và lưu <strong>vĩnh viễn theo tài khoản</strong>. Vui lòng đăng nhập bằng Google để mở khóa.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <a href="/api/auth/signin" className="win95-btn px-6 py-3 bg-white font-bold no-underline text-sm flex items-center justify-center gap-2">🔑 ĐĂNG NHẬP VỚI GOOGLE</a>
                <a href="/" className="win95-btn px-6 py-3 no-underline text-xs flex items-center justify-center">🏠 Về trang chủ</a>
              </div>
              <p className="text-[10px] text-win-dark">Admin không thể đọc lịch sử của bạn — cam kết <a href="/terms" className="underline">/terms</a> và <a href="/ai-security" className="underline">/ai-security</a></p>
            </div>
          </div>
        </div>
      )}
      {isAccountBanned && (
        <div className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="win95-container bg-win-gray w-full max-w-lg shadow-2xl">
            <div className="win95-header bg-gradient-to-r from-red-800 to-black"><span>⛔ TÀI KHOẢN BỊ CHẶN</span></div>
            <div className="p-6 bg-win-gray text-center space-y-4">
              <div className="text-5xl">⛔</div>
              <h2 className="font-bold text-red-700">TÀI KHOẢN CỦA BẠN ĐÃ BỊ CHẶN</h2>
              <p className="text-xs leading-relaxed">Tài khoản này không thể sử dụng tính năng AI. Mọi phiên mã hóa trước đó vẫn được lưu an toàn nhưng đã bị khóa truy cập. Vui lòng liên hệ quản trị viên để được hỗ trợ.</p>
              <div className="flex gap-2 justify-center">
                <a href="mailto:nongtiensonpro@gmail.com" className="win95-btn px-4 py-2 bg-white font-bold no-underline text-xs">✉️ Liên hệ Admin</a>
                <a href="/" className="win95-btn px-4 py-2 no-underline text-xs">🏠 Về trang chủ</a>
              </div>
            </div>
          </div>
        </div>
      )}
      {loadingKeys && !needsLogin && !isAccountBanned && (
        <div className="win95-container bg-win-gray p-4 text-center text-xs">⏳ Đang kiểm tra khóa mã hóa...</div>
      )}
      {!isUnlocked && !loadingKeys && !needsLogin && !isAccountBanned && !showPassphraseModal && (
        <div className="win95-container bg-[#fffb96] border-2 border-win-dark p-3 text-center">
          <p className="text-xs font-bold">🔐 Phiên đang khóa — <button onClick={() => setShowPassphraseModal(true)} className="underline text-vapor-purple">Mở khóa để trò chuyện</button></p>
        </div>
      )}

      {/* 3D Main Workstation Window */}
      <div className="win95-container bg-win-gray shadow-2xl flex flex-col min-h-[680px]">
        {/* Main Title bar */}
        <div className="win95-header py-1.5 px-3 bg-gradient-to-r from-win-titlebar via-[#6a26a4] to-[#1084d0] text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-base">🐱</span>
            <span className="font-bold text-xs sm:text-sm tracking-wider uppercase">
              CYBER_CAT_AI.EXE // TRẠM TRÍ TUỆ NHÂN TẠO 1995-2026
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            {userCustomApiKey ? (
              <span className="bg-vapor-yellow text-black px-2 py-0.5 font-bold border border-black shadow-xs">
                🔑 KEY CÁ NHÂN
              </span>
            ) : hasSystemKey ? (
              <span className="bg-[#05ffa1] text-black px-2 py-0.5 font-bold border border-black shadow-xs">
                ⚡ KEY HỆ THỐNG (PROXY)
              </span>
            ) : (
              <span className="bg-black text-vapor-green px-2 py-0.5 font-bold">
                ☁️ CLOUDFLARE EDGE
              </span>
            )}
          </div>
        </div>

        {/* Top Menubar Strip */}
        <div className="win95-menubar justify-between bg-win-gray px-3 py-1 text-xs border-b border-win-dark flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={`font-bold hover:underline ${activeTab === 'chat' ? 'text-vapor-purple underline font-black' : 'text-black'}`}
            >
              💬 Phòng Hội Thoại
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("topics")}
              className={`font-bold hover:underline ${activeTab === 'topics' ? 'text-vapor-purple underline font-black' : 'text-black'}`}
            >
              📚 Kho Đề Tài Gợi Ý
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`font-bold hover:underline ${activeTab === 'settings' ? 'text-vapor-purple underline font-black' : 'text-black'}`}
            >
              ⚙️ Cấu Hình & Model
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Model Selector on Menubar */}
            <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 border border-win-dark shadow-inner">
              <span className="text-[10px] font-bold text-win-darkest font-mono">⚡ MODEL:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-transparent border-none outline-none font-mono text-[10px] text-black font-bold cursor-pointer max-w-[140px] sm:max-w-[210px] truncate"
              >
                {MODEL_OPTIONS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="win95-btn py-0.5 px-2 text-[10px] font-mono flex items-center gap-1"
              title="Bật/Tắt âm thanh hiệu ứng retro"
            >
              <span>{soundEnabled ? "🔊 Âm Thanh: BẬT" : "🔇 Âm Thanh: TẮT"}</span>
            </button>
            {isUnlocked ? (
              <button type="button" onClick={handleLock} className="win95-btn py-0.5 px-2 text-[10px] font-mono bg-red-100 text-red-700" title="Khóa phiên, xóa khóa khỏi RAM">
                🔒 Khóa
              </button>
            ) : (
              <button type="button" onClick={() => setShowPassphraseModal(true)} className="win95-btn py-0.5 px-2 text-[10px] font-mono bg-vapor-yellow" title="Mở khóa E2EE">
                🔓 Mở khóa
              </button>
            )}
            <button
              type="button"
              onClick={() => handleExportChat("txt")}
              className="win95-btn py-0.5 px-2 text-[10px] font-mono flex items-center gap-1"
              title="Xuất nhật ký trò chuyện"
            >
              <span>💾 Xuất File</span>
            </button>
          </div>
        </div>

        {/* Body Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 flex-1 bg-[#d4d4d4]">
          {/* LEFT SIDEBAR PANEL (4 cols on desktop) */}
          <div className="lg:col-span-4 border-r border-win-dark p-3 space-y-4 bg-win-gray flex flex-col justify-between">
            <div className="space-y-4">
              {/* Session Controls */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-win-darkest">
                    🗂️ CÁC PHIÊN HỘI THOẠI
                  </span>
                  <button
                    type="button"
                    onClick={() => createNewSession(selectedPersonaId)}
                    className="win95-btn py-1 px-2 text-[10px] font-bold text-vapor-purple bg-[#fffb96]/30 flex items-center gap-1"
                    style={{ minHeight: "24px" }}
                  >
                    <span>+ Cuộc Trò Chuyện Mới</span>
                  </button>
                </div>

                {/* Session List */}
                <div className="win95-sunken bg-white p-1 max-h-44 overflow-y-auto space-y-1">
                  {sessions.map(s => {
                    const pObj = PERSONAS.find(p => p.id === s.persona) || PERSONAS[0];
                    const isActive = s.id === (currentSession?.id || activeSessionId);
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          setActiveSessionId(s.id);
                          setSelectedPersonaId(s.persona || "cybercat");
                          setActiveTab("chat");
                        }}
                        className={`p-1.5 flex justify-between items-center text-xs cursor-pointer border ${
                          isActive
                            ? "bg-win-titlebar text-white font-bold border-black"
                            : "hover:bg-win-light text-black border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span>{pObj.icon}</span>
                          <span className="truncate text-[11px]">{s.title}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(s.id, e)}
                          className={`px-1 py-0 text-[10px] font-mono hover:bg-red-700 hover:text-white ${
                            isActive ? "text-white" : "text-win-dark"
                          }`}
                          title="Xóa phiên này"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Persona Selector Strip */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-win-darkest block">
                  🎭 CHỌN NHÂN CÁCH AI
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {PERSONAS.map(p => {
                    const isSelected = p.id === (currentSession?.persona || selectedPersonaId);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSwitchPersona(p.id)}
                        className={`win95-btn p-2 text-left flex flex-col gap-1 ${
                          isSelected ? "win95-sunken bg-vapor-pink/20 font-bold border-2 border-black" : "bg-win-gray"
                        }`}
                        style={{ minHeight: "68px" }}
                      >
                        <div className="flex items-center gap-1 text-xs">
                          <span>{p.icon}</span>
                          <span className="font-bold text-[11px] truncate">{p.name}</span>
                        </div>
                        <span className="text-[10px] text-win-darkest leading-tight line-clamp-2">
                          {p.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Persona Banner Card */}
              <div className="win95-sunken bg-white p-3 space-y-2 border border-win-dark">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-sm bg-gradient-to-br ${activePersonaObj.avatarBg} border border-black flex items-center justify-center text-base shrink-0 shadow-sm`}>
                    {activePersonaObj.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs leading-none">{activePersonaObj.name}</h4>
                    <span className="text-[10px] font-mono text-win-dark">{activePersonaObj.role}</span>
                  </div>
                </div>
                <p className="text-[10px] text-win-darkest font-body leading-relaxed">
                  {activePersonaObj.desc}
                </p>
              </div>
            </div>

            {/* Connection Status Box */}
            <div className="p-2 bg-[#c0c0c0] border border-win-dark text-[10px] font-mono space-y-1">
              <div className="flex justify-between items-center">
                <span>Nguồn API Key:</span>
                <span className={`font-bold px-1 py-0.2 ${userCustomApiKey ? 'bg-vapor-yellow text-black' : hasSystemKey ? 'bg-[#05ffa1] text-black' : 'bg-black text-white'}`}>
                  {userCustomApiKey ? '🔑 Key Cá Nhân' : hasSystemKey ? '⚡ Key Hệ Thống (Proxy)' : '☁️ Server Cloudflare'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Model đang chọn:</span>
                <span className="font-bold text-vapor-purple truncate max-w-[130px]">
                  {selectedModel === 'auto' ? 'Auto-Fallback' : selectedModel}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Số tin nhắn:</span>
                <span className="font-bold">{currentSession?.messages.length || 0}</span>
              </div>
            </div>
          </div>

          {/* RIGHT CHAT / CONTENT AREA (8 cols on desktop) */}
          <div className="lg:col-span-8 p-3 flex flex-col justify-between bg-win-gray min-h-[550px]">
            {/* TAB: Trò Chuyện (Chat) */}
            {activeTab === "chat" && (
              <>
                {/* Scrollable Message Box */}
                <div className="win95-sunken bg-white p-3.5 space-y-4 overflow-y-auto h-[440px] border-2 border-win-dark">
                  {/* Cyber ASCII Welcome Banner */}
                  <div className="text-center py-2 border-b border-win-light text-[10px] font-mono text-win-dark leading-tight select-none">
                    <pre className="text-vapor-purple font-bold">
{`████████╗██████╗  █████╗ ███╗   ███╗     █████╗ ██╗
╚══██╔══╝██╔══██╗██╔══██╗████╗ ████║    ██╔══██╗██║
   ██║   ██████╔╝███████║██╔████╔██║    ███████║██║
   ██║   ██╔══██╗██╔══██║██║╚██╔╝██║    ██╔══██║██║
   ██║   ██║  ██║██║  ██║██║ ╚═╝ ██║    ██║  ██║██║`}
                    </pre>
                    <p className="mt-1 text-text-muted">
                      // TRẠM AI MÈO VÀNG VAPORWAVE // GOOGLE AI STUDIO ENGINE //
                    </p>
                  </div>

                  {/* E2EE Locked Placeholder */}
                  {!isUnlocked ? (
                    <div className="text-center py-16 space-y-3">
                      <p className="text-4xl">🔐</p>
                      <p className="font-bold text-sm">Phiên đang khóa — E2EE bắt buộc</p>
                      <p className="text-xs text-win-dark max-w-md mx-auto">Lịch sử được mã hóa AES-GCM 256 và lưu vĩnh viễn theo tài khoản. Chỉ bạn với mật khẩu mới giải mã được. Admin không thể đọc (cam kết /terms).</p>
                      <button type="button" onClick={() => setShowPassphraseModal(true)} className="win95-btn px-6 py-2 bg-vapor-purple text-white font-bold">🔓 MỞ KHÓA ĐỂ XEM</button>
                      {isE2EELoading && <p className="text-xs">⏳ Đang giải mã...</p>}
                    </div>
                  ) : (
                    <>
                  {/* Message Bubbles */}
                  {currentSession?.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "model" && (
                        <div className={`w-8 h-8 rounded-sm bg-gradient-to-br ${activePersonaObj.avatarBg} border border-black flex items-center justify-center text-sm shrink-0 shadow-md`}>
                          {activePersonaObj.icon}
                        </div>
                      )}

                      <div
                        className={`max-w-[92%] sm:max-w-[82%] p-3 text-xs shadow-md ${
                          msg.role === "user"
                            ? "bg-gradient-to-br from-[#2a0040] to-[#1a0030] text-white border border-vapor-pink rounded-tl-sm rounded-bl-sm"
                            : "bg-[#e8e8e8] text-black border-2 border-win-light win95-raised"
                        }`}
                      >
                        {/* Header of message */}
                        <div className="flex items-center justify-between text-[10px] font-mono border-b pb-1 mb-1.5 border-black/10">
                          <span className="font-bold flex items-center gap-1 text-vapor-purple">
                            {msg.role === "user" ? "👤 BẠN" : `${activePersonaObj.icon} ${activePersonaObj.name.toUpperCase()}`}
                          </span>
                          <div className="flex items-center gap-2 text-win-dark font-normal">
                            {msg.durationMs && <span>⚡ {msg.durationMs}ms</span>}
                            <span>{msg.timestamp}</span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="text-xs sm:text-[13px] leading-relaxed font-body whitespace-pre-wrap">
                          {msg.content.split("\n").map((line, lIdx) => (
                            <p
                              key={lIdx}
                              className={line.trim() === "" ? "h-2" : "my-0.5"}
                              dangerouslySetInnerHTML={{ __html: formatMarkdown(line) }}
                            />
                          ))}
                        </div>

                        {/* Optional Key Switcher if Quota Error occurs */}
                        {msg.isError && (
                          <div className="mt-3 pt-2 border-t border-red-300 font-mono space-y-2">
                            <div className="bg-[#fffb96]/60 border border-win-dark p-2.5 space-y-2 rounded-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-vapor-purple flex items-center gap-1">
                                  <span>⚡</span> TÙY CHỌN: ĐỔI SANG API KEY CÁ NHÂN KHI HỆ THỐNG QUÁ TẢI
                                </span>
                                <a
                                  href="https://aistudio.google.com/"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-blue-700 underline font-bold"
                                >
                                  Lấy Key Miễn Phí ↗
                                </a>
                              </div>
                              <p className="text-[11px] text-black font-body leading-tight">
                                Nếu khóa AI mặc định của trang web đang bị quá tải hoặc hết hạn mức trong ngày, bạn có thể tự đổi sang API Key cá nhân của bạn để tiếp tục trò chuyện.
                              </p>
                              <div className="flex flex-col sm:flex-row gap-1.5">
                                <input
                                  type="password"
                                  placeholder="Dán API Key cá nhân (AIzaSy...)"
                                  value={inlineKeyInput}
                                  onChange={(e) => setInlineKeyInput(e.target.value)}
                                  className="win95-sunken bg-white p-1.5 text-xs font-mono flex-1 border border-win-dark"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (inlineKeyInput.trim()) {
                                      handleSaveCustomApiKey(inlineKeyInput);
                                      const lastUserMsg = currentSession?.messages.filter(m => m.role === "user").slice(-1)[0];
                                      if (lastUserMsg) {
                                        handleSendMessage(lastUserMsg.content, inlineKeyInput.trim());
                                      }
                                    } else {
                                      alert("Vui lòng nhập API Key.");
                                    }
                                  }}
                                  className="win95-btn py-1.5 px-3 text-xs font-bold bg-[#05ffa1] text-black border border-black shrink-0 hover:bg-[#04df8d]"
                                >
                                  💾 Đổi Key & Thử Lại
                                </button>
                              </div>
                            </div>

                            {/* Accordion toggle error detail */}
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => toggleExpandError(msg.id)}
                                className="text-[10px] font-bold text-red-800 hover:text-red-950 flex items-center gap-1.5 cursor-pointer bg-red-100/90 hover:bg-red-200 px-2 py-1 border border-red-300 rounded-xs"
                              >
                                <span>{expandedErrors[msg.id] ? "[-] Ẩn chi tiết kỹ thuật" : "[+] Mở rộng xem toàn bộ nhật ký lỗi (Error Logs)"}</span>
                              </button>

                              {expandedErrors[msg.id] && (
                                <div className="mt-2 p-2.5 bg-black text-[#05ffa1] text-[10px] rounded-xs font-mono border-2 border-win-dark space-y-2 overflow-x-auto select-text shadow-md">
                                  <div className="text-red-400 font-bold flex items-center gap-1.5 border-b border-win-dark/60 pb-1">
                                    <span>⚠️ ERROR DIAGNOSTICS LOG // GOOGLE AI STUDIO</span>
                                  </div>
                                  <pre className="whitespace-pre-wrap leading-relaxed text-[10px] font-mono text-vapor-pink max-h-40 overflow-y-auto">
                                    {msg.errorDetail || "Lỗi kết nối không xác định."}
                                  </pre>
                                  <div className="flex flex-wrap gap-2 pt-1.5 border-t border-win-dark/60">
                                    <button
                                      type="button"
                                      onClick={() => handleCopyText(`err-detail-${msg.id}`, msg.errorDetail || "")}
                                      className="win95-btn py-1 px-2.5 text-[10px] text-black font-bold bg-white hover:bg-vapor-yellow/30"
                                    >
                                      {copiedId === `err-detail-${msg.id}` ? "✓ Đã Chép Log!" : "📋 Sao Chép Log Lỗi"}
                                    </button>
                                    <a
                                      href={`mailto:nongtiensonpro@gmail.com?subject=${encodeURIComponent("Báo lỗi AI Chat // Lovely Yellow Cat")}&body=${encodeURIComponent(`Chào Dev Nongtiensonpro,\n\nTôi gặp sự cố khi trò chuyện với AI tại website Lovely Yellow Cat:\n\n- Thời gian: ${new Date().toLocaleString("vi-VN")}\n- Phiên chat: ${currentSession?.title || "AI Chat"}\n- Nhân cách: ${currentSession?.persona || "cybercat"}\n\n[Chi tiết lỗi kỹ thuật]:\n${msg.errorDetail || "Không có log chi tiết"}\n\nNhờ dev kiểm tra và khắc phục giúp tôi nhé!`)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="win95-btn py-1 px-2.5 text-[10px] text-black font-bold bg-[#fffb96] no-underline hover:bg-yellow-300"
                                    >
                                      ✉️ Gửi Báo Lỗi Cho Dev (Email)
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Action buttons on message bubble */}
                        <div className="flex justify-end items-center gap-2 pt-2 mt-1.5 border-t border-black/10 text-[10px] font-mono">
                          <button
                            type="button"
                            onClick={() => handleCopyText(msg.id, msg.content)}
                            className="hover:underline text-win-darkest flex items-center gap-0.5"
                            title="Sao chép nội dung"
                          >
                            <span>{copiedId === msg.id ? "✓ Đã Chép!" : "📋 Sao chép"}</span>
                          </button>
                          {msg.role === "model" && (
                            <button
                              type="button"
                              onClick={() => handleSpeakText(msg.id, msg.content)}
                              className={`hover:underline flex items-center gap-0.5 ${
                                speakingId === msg.id ? "text-vapor-pink font-bold" : "text-win-darkest"
                              }`}
                              title="Đọc to bằng giọng nói"
                            >
                              <span>{speakingId === msg.id ? "⏹️ Đang Đọc..." : "🔊 Đọc to"}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {msg.role === "user" && (
                        <div className="w-8 h-8 rounded-sm bg-win-gray border border-black flex items-center justify-center text-xs shrink-0 shadow-md font-bold">
                          👤
                        </div>
                      )}
                    </div>
                  ))}
                    </>
                  )}

                  {/* Typing animation */}
                  {isUnlocked && isTyping && (
                    <div className="flex gap-2.5 items-center justify-start">
                      <div className={`w-8 h-8 rounded-sm bg-gradient-to-br ${activePersonaObj.avatarBg} border border-black flex items-center justify-center text-sm shrink-0 shadow-md animate-pulse`}>
                        {activePersonaObj.icon}
                      </div>
                      <div className="bg-[#e8e8e8] border border-win-dark p-2.5 win95-sunken flex items-center gap-2 text-xs font-mono text-black">
                        <span>{activePersonaObj.name} đang suy nghĩ</span>
                        <span className="inline-flex gap-1">
                          <span className="w-2 h-2 rounded-full bg-vapor-pink animate-bounce"></span>
                          <span className="w-2 h-2 rounded-full bg-vapor-purple animate-bounce [animation-delay:0.2s]"></span>
                          <span className="w-2 h-2 rounded-full bg-vapor-blue animate-bounce [animation-delay:0.4s]"></span>
                        </span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Topic Chips */}
                <div className="py-1.5 overflow-x-auto">
                  <div className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                    <span className="text-[10px] font-mono text-win-darkest font-bold">GỢI Ý:</span>
                    <button
                      type="button"
                      onClick={() => handleSendMessage("Vaporwave là gì và cội nguồn triết lý của nó?")}
                      className="win95-btn py-1 px-2.5 text-[10px] text-black font-mono shrink-0 hover:bg-vapor-yellow/30"
                    >
                      🌸 Triết lý Vaporwave
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendMessage("Gợi ý cho tôi 5 album Synthwave kinh điển")}
                      className="win95-btn py-1 px-2.5 text-[10px] text-black font-mono shrink-0 hover:bg-vapor-yellow/30"
                    >
                      📼 5 Album Synthwave
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendMessage("Làm sao để tôi có thể đăng tải tranh lên tạp chí?")}
                      className="win95-btn py-1 px-2.5 text-[10px] text-black font-mono shrink-0 hover:bg-vapor-yellow/30"
                    >
                      🖼️ Hướng dẫn gửi tranh
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendMessage("Kể cho tôi nghe về vẻ đẹp của Windows 95")}
                      className="win95-btn py-1 px-2.5 text-[10px] text-black font-mono shrink-0 hover:bg-vapor-yellow/30"
                    >
                      🕹️ Windows 95
                    </button>
                  </div>
                </div>

                {/* E2EE Locked Overlay cho chat */}
                {!isUnlocked && !loadingKeys && !needsLogin && !isAccountBanned && (
                  <div className="win95-container bg-[#fffb96] border-2 border-vapor-purple p-3 text-center">
                    <p className="text-xs font-bold">🔐 Phiên đang khóa — Vui lòng mở khóa E2EE để trò chuyện</p>
                    <button type="button" onClick={() => setShowPassphraseModal(true)} className="win95-btn mt-2 px-4 py-2 bg-vapor-purple text-white font-bold">🔓 MỞ KHÓA NGAY</button>
                  </div>
                )}
                {isE2EELoading && (
                  <div className="text-center text-xs py-2">⏳ Đang xử lý mã hóa...</div>
                )}

                {/* Input Form Terminal */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="space-y-2 pt-1"
                >
                  <div className="win95-sunken bg-white p-2 flex items-end gap-2 border-2 border-win-dark">
                    <textarea
                      ref={inputRef}
                      rows={2}
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={
                        !isUnlocked ? "🔒 Vui lòng mở khóa E2EE trước khi trò chuyện..." :
                        `Trò chuyện cùng ${activePersonaObj.name}... (Nhấn Enter để gửi, Shift+Enter để xuống dòng)`
                      }
                      disabled={isTyping || !isUnlocked || needsLogin || isAccountBanned}
                      className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-black font-body resize-none disabled:opacity-50"
                      maxLength={1000}
                    />
                    <button
                      type="submit"
                      disabled={isTyping || !inputVal.trim() || !isUnlocked || needsLogin || isAccountBanned}
                      className="win95-btn font-extrabold text-xs sm:text-sm px-5 py-2 text-vapor-purple bg-[#fffb96]/40 border-2 border-black disabled:opacity-50 flex items-center gap-1.5 shrink-0 hover:bg-vapor-yellow"
                      style={{ minHeight: "38px" }}
                    >
                      <span>{isTyping ? "..." : "GỬI"}</span>
                      <span className="font-mono text-xs">&gt;&gt;</span>
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-win-dark">
                    <span>🔐 E2EE: {isUnlocked ? "Đã mã hóa" : "Chưa mở khóa" } · 💡 Nhấn Enter để gửi</span>
                    <span>{inputVal.length} / 1000 ký tự</span>
                  </div>
                </form>
              </>
            )}

            {/* TAB: Kho Đề Tài Gợi Ý */}
            {activeTab === "topics" && (
              <div className="space-y-4 p-2 h-[550px] overflow-y-auto">
                <div className="win95-header py-1 px-2 bg-gradient-to-r from-win-titlebar to-[#1084d0]">
                  <span>📚 KHO ĐỀ TÀI GỢI Ý ĐÀM ĐẠO CÙNG AI</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {TOPIC_CATEGORIES.map((cat, idx) => (
                    <div key={idx} className="win95-container bg-white p-3 space-y-2">
                      <h4 className="font-bold text-xs uppercase text-vapor-purple border-b border-win-dark pb-1">
                        {cat.category}
                      </h4>
                      <div className="space-y-1.5">
                        {cat.topics.map((t, tIdx) => (
                          <button
                            key={tIdx}
                            type="button"
                            onClick={() => {
                              setActiveTab("chat");
                              handleSendMessage(t);
                            }}
                            className="win95-btn w-full text-left p-1.5 text-[11px] hover:bg-vapor-yellow/20 flex items-start gap-1.5"
                          >
                            <span className="text-vapor-pink font-bold">»</span>
                            <span className="leading-snug">{t}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: Cấu Hình & Model */}
            {activeTab === "settings" && (
              <div className="space-y-4 p-3 h-[550px] overflow-y-auto">
                <div className="win95-header py-1 px-2 bg-gradient-to-r from-win-titlebar to-[#1084d0]">
                  <span>⚙️ TÙY CHỈNH THÔNG SỐ AI & MODEL</span>
                </div>

                <div className="win95-container bg-white p-4 space-y-4 text-xs">
                  {/* E2EE Trạng thái */}
                  <div className="p-3 border-2 border-vapor-purple bg-[#f3e8ff]/50 space-y-2">
                    <h4 className="font-bold text-vapor-purple uppercase flex items-center gap-1">🔐 Trạng thái Mã hóa E2EE</h4>
                    <div className="text-[11px] leading-relaxed space-y-1">
                      <p><strong>Chế độ:</strong> BẮT BUỘC — mọi phiên và tin nhắn được mã hóa AES-GCM 256 trước khi lưu Supabase.</p>
                      <p><strong>Lưu trữ:</strong> Vĩnh viễn theo tài khoản, chỉ bạn giải mã được. Admin <strong>không thể đọc</strong> (cam kết /terms).</p>
                      <p><strong>Yêu cầu:</strong> Chỉ tài khoản hoạt động (không bị chặn) mới được dùng.</p>
                      <p className="flex items-center gap-2">Trạng thái: {isUnlocked ? <span className="bg-vapor-green text-black px-1 font-bold">🔓 ĐÃ MỞ KHÓA</span> : <span className="bg-red-600 text-white px-1 font-bold">🔒 ĐANG KHÓA</span>}
                        {isUnlocked && <button type="button" onClick={handleLock} className="win95-btn text-[10px] py-1 px-2 bg-red-100 text-red-700">Khóa lại</button>}
                        {!isUnlocked && <button type="button" onClick={() => setShowPassphraseModal(true)} className="win95-btn text-[10px] py-1 px-2 bg-vapor-yellow">Mở khóa</button>}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button type="button" onClick={async () => {
                        if (confirm("Xóa TOÀN BỘ lịch sử mã hóa trên Supabase? Không thể khôi phục nếu không có khóa khôi phục.")) {
                          try {
                            const res = await fetch("/api/ai/sessions");
                            const data = await res.json();
                            for (const s of data.sessions || []) {
                              await fetch(`/api/ai/sessions?id=${s.id}`, { method: "DELETE" });
                            }
                            setSessions([]);
                            createNewSessionEncrypted(selectedPersonaId, masterKey || undefined);
                            alert("Đã xóa toàn bộ.");
                          } catch {}
                        }
                      }} className="win95-btn text-[10px] py-1 px-2 bg-red-100 text-red-700">🗑️ Xóa vĩnh viễn trên Supabase</button>
                      <button type="button" onClick={async () => {
                        if (!masterKey) { alert("Cần mở khóa trước."); return; }
                        const raw = await exportMasterKeyRaw(masterKey);
                        const b64 = toBase64(raw);
                        prompt("Khóa khôi phục (lưu an toàn, mất = mất dữ liệu):", b64);
                      }} className="win95-btn text-[10px] py-1 px-2">🔑 Xuất khóa khôi phục</button>
                    </div>
                  </div>

                  {/* Model Choice */}
                  <div className="space-y-1.5">
                    <label className="font-bold uppercase tracking-wide block">
                      ⚡ Lựa chọn Model Google AI Studio:
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full p-2 border border-win-dark bg-win-light font-mono text-xs"
                    >
                      {MODEL_OPTIONS.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>

                    <label className="flex items-center gap-2 cursor-pointer pt-1 font-retro text-xs">
                      <input
                        type="checkbox"
                        checked={allowFallback}
                        onChange={(e) => setAllowFallback(e.target.checked)}
                        className="cursor-pointer"
                      />
                      <span className="font-bold">
                        Tự động chuyển tiếp (Fallback) sang Model khác nếu Model được chọn bị lỗi Quota / quá tải
                      </span>
                    </label>
                  </div>

                  {/* Optional Custom API Key Config */}
                  <div className="p-3 bg-[#fffb96]/30 border-2 border-win-dark space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold uppercase tracking-wide text-vapor-purple flex items-center gap-1.5">
                        <span>🔑</span> Tự Đổi API Key Khi Quá Tải:
                      </label>
                      <a
                        href="https://aistudio.google.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-700 underline font-bold"
                      >
                        Lấy API Key Miễn Phí ↗
                      </a>
                    </div>
                    <p className="text-[11px] text-black leading-relaxed font-body">
                      Hệ thống đã tự động tích hợp sẵn API Key mặc định của trang web. Bạn chỉ cần nhập API Key cá nhân vào đây khi khóa mặc định bị hết hạn mức Quota trong ngày hoặc khi bạn muốn dùng hạn mức riêng.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="Nhập khóa API Key cá nhân của bạn (AIzaSy...)"
                        value={userCustomApiKey}
                        onChange={(e) => setUserCustomApiKey(e.target.value)}
                        className="w-full p-2 border border-win-dark bg-white font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveCustomApiKey(userCustomApiKey)}
                        className="win95-btn py-1.5 px-4 font-bold text-xs bg-[#05ffa1] text-black border border-black shrink-0"
                      >
                        💾 Lưu
                      </button>
                      {userCustomApiKey && (
                        <button
                          type="button"
                          onClick={() => handleSaveCustomApiKey("")}
                          className="win95-btn py-1.5 px-3 font-bold text-xs bg-red-100 text-red-700 shrink-0"
                          title="Khôi phục về dùng Key mặc định của hệ thống"
                        >
                          🔄 Khôi Phục Mặc Định
                        </button>
                      )}
                    </div>
                    <div className="text-[10px] font-mono">
                      {userCustomApiKey ? (
                        <span className="text-vapor-purple font-bold">● Đang dùng API Key Cá Nhân (Đã ghi đè thành công)</span>
                      ) : hasSystemKey ? (
                        <span className="text-green-700 font-bold">● Đang dùng Key hệ thống qua proxy bảo mật phía máy chủ</span>
                      ) : (
                        <span className="text-win-dark font-bold">● Đang kết nối máy chủ Cloudflare</span>
                      )}
                    </div>
                  </div>

                  {/* Temperature */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center font-bold">
                      <span>🌡️ Nhiệt độ sáng tạo (Temperature):</span>
                      <span className="font-mono text-vapor-purple">{temperature}</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="1.0"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-win-dark font-mono">
                      <span>0.2 (Chính xác / Logic)</span>
                      <span>0.7 (Cân bằng chuẩn)</span>
                      <span>1.0 (Sáng tạo / Thơ ca)</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-win-dark flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleExportChat("json")}
                      className="win95-btn py-1.5 px-4 font-bold text-xs"
                    >
                      📥 Sao Lưu Dữ Liệu (.JSON)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện?")) {
                          localStorage.removeItem(STORAGE_KEY);
                          createNewSession(selectedPersonaId);
                          setActiveTab("chat");
                        }
                      }}
                      className="win95-btn py-1.5 px-4 font-bold text-xs bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      🗑️ Xóa Toàn Bộ Lịch Sử
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Bottom Statusbar */}
        <div className="win95-statusbar justify-between text-[10px] bg-win-gray px-3 py-1 border-t border-win-dark">
          <div className="flex items-center gap-3">
            <span>● Status: Sẵn sàng tương tác</span>
            <span className="win95-statusbar-panel font-mono text-vapor-green font-bold">
              {activePersonaObj.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-win-dark font-mono">
              {userCustomApiKey ? "Custom User Key" : "System Default Key (Direct Engine)"}
            </span>
            <span className="win95-statusbar-panel font-mono font-bold text-win-titlebar">READY</span>
          </div>
        </div>
      </div>
    </div>
  );
};
