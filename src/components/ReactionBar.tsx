import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

const EMOJIS = ["💾", "📼", "🌊", "🎮", "🌸"];

interface Reaction {
  emoji: string;
  profile_id: string;
}

interface Particle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  angle: number;
  velocity: number;
  opacity: number;
  scale: number;
}

interface ReactionBarProps {
  articleId: string;
  currentUser: {
    id: string;
  } | null;
}

export const ReactionBar: React.FC<ReactionBarProps> = ({ articleId, currentUser }) => {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const particleIdRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  // Tải danh sách cảm xúc hiện có từ database
  const fetchReactions = async () => {
    const { data, error } = await supabaseClient
      .from("reactions")
      .select("emoji, profile_id")
      .eq("article_id", articleId);

    if (!error && data) {
      setReactions(data);
    }
  };

  useEffect(() => {
    fetchReactions();

    // Kết nối Supabase Realtime lắng nghe các sự thay đổi bày tỏ cảm xúc
    const channel = supabaseClient
      .channel(`reactions-realtime-${articleId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reactions",
          filter: `article_id=eq.${articleId}`
        },
        () => {
          // Bất kỳ sự thêm/xóa nào cũng kích hoạt tải lại để đồng bộ chính xác
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [articleId]);

  // Vòng lặp cập nhật chuyển động cho các hạt bay (Particles)
  useEffect(() => {
    if (particles.length === 0) return;

    const updateParticles = () => {
      setParticles((prev) =>
        prev
          .map((p) => {
            const rad = (p.angle * Math.PI) / 180;
            return {
              ...p,
              x: p.x + Math.cos(rad) * p.velocity,
              y: p.y + Math.sin(rad) * p.velocity + 0.3, // Trọng lực nhẹ kéo rơi xuống
              velocity: p.velocity * 0.96, // Ma sát không khí
              opacity: p.opacity - 0.02,
              scale: p.scale * 0.98
            };
          })
          .filter((p) => p.opacity > 0)
      );

      animationFrameRef.current = requestAnimationFrame(updateParticles);
    };

    animationFrameRef.current = requestAnimationFrame(updateParticles);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [particles.length]);

  // Tạo hiệu ứng hạt nổ tung (Particle Explosion)
  const triggerParticles = (emoji: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return; // Chặn chuyển động hạt nổ tung theo thiết lập của hệ thống người dùng
    }
    const rect = e.currentTarget.getBoundingClientRect();
    // Vị trí trung tâm nút làm gốc nổ
    const originX = rect.left + rect.width / 2 + window.scrollX;
    const originY = rect.top + rect.height / 2 + window.scrollY;

    const newParticles: Particle[] = Array.from({ length: 8 }).map(() => {
      particleIdRef.current += 1;
      return {
        id: particleIdRef.current,
        emoji,
        x: originX,
        y: originY,
        angle: Math.random() * 360,
        velocity: 2 + Math.random() * 4,
        opacity: 1,
        scale: 0.8 + Math.random() * 0.7
      };
    });

    setParticles((prev) => [...prev, ...newParticles]);
  };

  // Người dùng ấn thích / bỏ thích Emoji
  const handleReact = async (emoji: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (!currentUser) {
      setErrorMessage("Vui lòng đăng nhập Google để bày tỏ cảm xúc nghệ thuật!");
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    const userReaction = reactions.find(
      (r) => r.profile_id === currentUser.id && r.emoji === emoji
    );

    if (userReaction) {
      // Đã thích -> Tiến hành bỏ thích
      const { error } = await supabaseClient
        .from("reactions")
        .delete()
        .eq("article_id", articleId)
        .eq("profile_id", currentUser.id)
        .eq("emoji", emoji);

      if (error) {
        console.error(error.message);
      }
    } else {
      // Chưa thích -> Gửi lượt thích mới
      const { error } = await supabaseClient
        .from("reactions")
        .insert({
          article_id: articleId,
          profile_id: currentUser.id,
          emoji: emoji
        });

      if (error) {
        console.error(error.message);
      } else {
        // Chỉ bùng nổ hạt neon khi thích thành công
        triggerParticles(emoji, e);
      }
    }
  };

  // Tính toán số lượng và trạng thái nút của từng Emoji
  const getEmojiStats = (emoji: string) => {
    const list = reactions.filter((r) => r.emoji === emoji);
    const count = list.length;
    const hasReacted = currentUser
      ? list.some((r) => r.profile_id === currentUser.id)
      : false;

    return { count, hasReacted };
  };

  return (
    <div className="relative font-retro text-black mt-6 mb-4 select-none">
      {/* Thông báo lỗi Win95 mini */}
      {errorMessage && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-win-gray border border-win-dark p-1.5 shadow-md text-[10px] font-bold text-red-700 z-50">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Container thanh emoji */}
      <div className="win95-container p-1 bg-win-gray flex items-center justify-between">
        <div className="win95-header py-0.5 px-2 bg-gradient-to-r from-vapor-purple to-vapor-pink mr-3">
          <span className="text-[10px]">REACTION_DECK.DLL</span>
        </div>

        <div className="flex gap-2 flex-1 justify-around">
          {EMOJIS.map((emoji) => {
            const { count, hasReacted } = getEmojiStats(emoji);
            return (
              <button
                key={emoji}
                type="button"
                onClick={(e) => handleReact(emoji, e)}
                className={`win95-btn flex items-center gap-1.5 px-3 py-1 font-bold text-xs ${
                  hasReacted 
                    ? "bg-[#ff71ce]/20 border-[#ff71ce] shadow-inner text-vapor-pink scale-[0.98]" 
                    : "bg-win-gray text-black hover:bg-[#e0e0e0]"
                } transition-all`}
              >
                <span className={`text-base filter saturate-150 ${hasReacted ? "animate-pulse" : ""}`}>
                  {emoji}
                </span>
                <span className="font-mono text-[10px]">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Khung vẽ các hạt Neon Particles bung tỏa */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="fixed pointer-events-none text-lg select-none filter drop-shadow-[0_0_8px_#ff71ce] z-[99999]"
          style={{
            left: `${p.x}px`,
            top: `${p.y}px`,
            opacity: p.opacity,
            transform: `translate(-50%, -50%) scale(${p.scale})`,
            transition: "opacity 30ms linear"
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
};
