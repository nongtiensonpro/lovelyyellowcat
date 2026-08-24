import React, { useState, useRef, useEffect } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
  modelName?: string;
}

// Lời chào mặc định thiết lập sẵn ban đầu (không cần gọi AI)
const DEFAULT_PRESET_MESSAGES: ChatMessage[] = [
  {
    id: "preset-1",
    role: "model",
    content: "Meow~! Chào mừng bạn đến với Tạp chí Nghệ thuật Số Hoài Cổ **Lovely Yellow Cat**! 🐱💾 Tôi là **Mèo Vàng Cybernetic** (CAT_AI.EXE v1995).",
    timestamp: "1995-READY",
  },
  {
    id: "preset-2",
    role: "model",
    content: "Tôi có thể giúp bạn giải đáp về các trường phái nghệ thuật Retro 90s, Synthwave, Cyberpunk, hướng dẫn đăng tranh lên phòng triển lãm hoặc đàm đạo về văn hóa số cổ điển. Hãy chọn câu hỏi gợi ý bên dưới hoặc gõ tin nhắn trò chuyện cùng tôi nhé! ✨",
    timestamp: "1995-READY",
  }
];

// Danh sách các câu hỏi gợi ý nhanh
const SUGGESTED_PROMPTS = [
  "🎨 Vaporwave là gì và có nguồn gốc từ đâu?",
  "📼 Gợi ý các thể loại nghệ thuật retro nổi bật",
  "🖼️ Làm thế nào để gửi tranh lên phòng triển lãm?",
  "🕹️ Kể cho tôi về vẻ đẹp của hệ điều hành Windows 95",
  "🌸 Tại sao nhạc Synthwave và City Pop lại cuốn hút?",
];

export const AiChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(DEFAULT_PRESET_MESSAGES);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeModel, setActiveModel] = useState<string>("gemini-2.5-flash");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!isCollapsed) {
      scrollToBottom();
    }
  }, [messages, isTyping, isCollapsed]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputVal).trim();
    if (!textToSend || isTyping) return;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: timeStr,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputVal("");
    setIsTyping(true);

    try {
      // Chuẩn bị payload gửi lên API route
      const payloadMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      const data = await res.json();

      if (data.reply) {
        if (data.model) {
          setActiveModel(data.model);
        }
        const modelMsg: ChatMessage = {
          id: `model-${Date.now()}`,
          role: "model",
          content: data.reply,
          timestamp: `${new Date().getHours().toString().padStart(2, "0")}:${new Date().getMinutes().toString().padStart(2, "0")}`,
          modelName: data.model,
        };
        setMessages((prev) => [...prev, modelMsg]);
      } else {
        throw new Error(data.error || "Không nhận được phản hồi từ AI.");
      }
    } catch (err: any) {
      console.error("Lỗi trò chuyện với AI:", err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "model",
        content: "Meow~! Tín hiệu mạng nơ-ron đang bị nhiễu sóng tạm thời. Bạn hãy thử nhắn lại một lần nữa nhé! 🐱💾",
        timestamp: `${new Date().getHours().toString().padStart(2, "0")}:${new Date().getMinutes().toString().padStart(2, "0")}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleResetChat = () => {
    setMessages(DEFAULT_PRESET_MESSAGES);
    setInputVal("");
  };

  // Hàm render nội dung tin nhắn với định dạng cơ bản
  const renderFormattedContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      // Render bullet point
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        return (
          <div key={idx} className="flex items-start gap-1.5 ml-2 my-0.5">
            <span className="text-vapor-purple font-bold">●</span>
            <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line.trim().substring(2)) }} />
          </div>
        );
      }
      return (
        <p 
          key={idx} 
          className={line.trim() === "" ? "h-2" : "my-0.5 leading-relaxed"} 
          dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} 
        />
      );
    });
  };

  const formatInlineMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-black/10 px-1 py-0.5 rounded text-[10px] font-mono text-vapor-pink">$1</code>');
  };

  return (
    <div className="win95-window font-retro text-black shadow-xl" id="cat-ai-chatbox">
      {/* Title bar */}
      <div className="win95-header py-1 px-2 flex justify-between items-center bg-gradient-to-r from-[#b967ff] via-win-titlebar to-[#01cdfe] text-white">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🐱</span>
          <span className="font-bold text-xs tracking-wider">CAT_AI.EXE // MÈO VÀNG AI</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleResetChat}
            className="win95-btn py-0 px-1.5 text-[10px] font-bold"
            title="Làm mới hội thoại"
            style={{ minHeight: "18px" }}
          >
            🔄
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="win95-btn py-0 px-1.5 text-[10px] font-bold"
            title={isCollapsed ? "Mở rộng cửa sổ" : "Thu gọn cửa sổ"}
            style={{ minHeight: "18px" }}
          >
            {isCollapsed ? "□" : "_"}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Menubar & Model indicator */}
          <div className="win95-menubar justify-between bg-win-gray text-[10px] py-1 border-b border-win-dark">
            <div className="flex items-center gap-3">
              <span>Hội Thoại</span>
              <span>Trợ Giúp</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-vapor-green animate-pulse"></span>
              <span className="font-mono text-[10px] font-bold text-win-darkest uppercase">
                {activeModel.replace("-preview", "").replace("-latest", "")}
              </span>
            </div>
          </div>

          {/* Chat Message Scrollable Container */}
          <div className="p-3 bg-[#e8e8e8] h-64 overflow-y-auto space-y-3 font-retro text-xs border-b border-win-dark shadow-inner">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "model" && (
                  <div className="w-7 h-7 rounded-sm bg-gradient-to-br from-[#fffb96] to-[#ff9a3c] border border-black flex items-center justify-center text-sm shrink-0 shadow-sm">
                    🐱
                  </div>
                )}

                <div
                  className={`max-w-[85%] p-2 rounded-none border text-xs shadow-sm ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-vapor-purple/20 to-vapor-pink/20 border-vapor-purple text-black font-body font-medium"
                      : "bg-white border-win-dark text-black win95-sunken font-body"
                  }`}
                >
                  {msg.role === "model" && (
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-vapor-purple border-b border-win-light/60 pb-1 mb-1">
                      <span>MÈO VÀNG CYBER</span>
                      <span className="text-win-dark font-normal">{msg.timestamp}</span>
                    </div>
                  )}
                  {msg.role === "user" && (
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-win-darkest border-b border-win-light/60 pb-1 mb-1">
                      <span>BẠN</span>
                      <span className="text-win-dark font-normal">{msg.timestamp}</span>
                    </div>
                  )}

                  <div className="text-[11px] sm:text-xs">
                    {renderFormattedContent(msg.content)}
                  </div>
                </div>

                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-sm bg-win-gray border border-black flex items-center justify-center text-xs shrink-0 shadow-sm font-bold">
                    👤
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2 items-center justify-start">
                <div className="w-7 h-7 rounded-sm bg-gradient-to-br from-[#fffb96] to-[#ff9a3c] border border-black flex items-center justify-center text-sm shrink-0 shadow-sm animate-pulse">
                  🐱
                </div>
                <div className="bg-white border border-win-dark p-2 win95-sunken flex items-center gap-1.5 text-[10px] font-mono text-win-dark">
                  <span>Mèo Vàng đang suy nghĩ</span>
                  <span className="inline-flex gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-vapor-pink animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-vapor-purple animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-vapor-blue animate-bounce [animation-delay:0.4s]"></span>
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Suggestions Chips */}
          <div className="p-2 bg-win-gray border-b border-win-dark overflow-x-auto whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-win-darkest uppercase shrink-0 font-mono">
                💡 GỢI Ý:
              </span>
              <div className="flex gap-1.5">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    disabled={isTyping}
                    className="win95-btn py-0.5 px-2 text-[10px] font-mono text-black hover:bg-vapor-yellow/30 shrink-0 cursor-pointer disabled:opacity-50"
                    style={{ minHeight: "22px" }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Input form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2 bg-win-gray flex gap-1.5 items-center"
          >
            <div className="win95-sunken bg-white flex-1 p-1 flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Trò chuyện cùng Mèo Vàng AI..."
                disabled={isTyping}
                className="w-full bg-transparent border-none outline-none text-xs text-black font-retro px-1"
                maxLength={500}
              />
            </div>
            <button
              type="submit"
              disabled={isTyping || !inputVal.trim()}
              className="win95-btn font-extrabold text-xs px-3 py-1 text-vapor-purple disabled:opacity-50 flex items-center gap-1"
              style={{ minHeight: "28px" }}
            >
              <span>GỬI</span>
              <span className="text-[10px]">&gt;&gt;</span>
            </button>
          </form>

          {/* Status bar */}
          <div className="win95-statusbar justify-between text-[10px]">
            <span className="text-win-darkest">● Powered by Google AI Studio (Gemini)</span>
            <span className="win95-statusbar-panel font-mono font-bold text-vapor-green">ONLINE</span>
          </div>
        </>
      )}
    </div>
  );
};
