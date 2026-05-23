import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

interface FavoriteButtonProps {
  submissionId: string;
  currentUser: {
    id: string;
  } | null;
  variant?: "win95" | "icon";
  onToggle?: (isFavorited: boolean) => void;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  submissionId,
  currentUser,
  variant = "win95",
  onToggle
}) => {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Kiểm tra trạng thái yêu thích ban đầu từ database (đọc công khai)
  useEffect(() => {
    if (!currentUser) return;

    const checkFavoriteStatus = async () => {
      const { data, error } = await supabaseClient
        .from("favorites")
        .select("submission_id")
        .eq("profile_id", currentUser.id)
        .eq("submission_id", submissionId)
        .maybeSingle();

      if (!error && data) {
        setIsFavorited(true);
      }
    };

    checkFavoriteStatus();

    // Lắng nghe realtime để đồng bộ nếu được bấm ở nơi khác (đọc công khai)
    const channel = supabaseClient
      .channel(`favorite-sync-${submissionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "favorites",
          filter: `submission_id=eq.${submissionId}`
        },
        (payload: any) => {
          if (payload.new && payload.new.profile_id === currentUser.id) {
            setIsFavorited(true);
          } else if (payload.eventType === "DELETE" && payload.old) {
            // Do RLS/Replication DELETE payload có thể không có profile_id, fetch lại là chắc chắn nhất
            checkFavoriteStatus();
          }
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [submissionId, currentUser]);

  // Toggle yêu thích qua API route phía server (xác thực bằng cookie httpOnly)
  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!currentUser) {
      setErrorMsg("Vui lòng đăng nhập để lưu!");
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: submissionId,
          action: isFavorited ? "remove" : "add"
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Lỗi HTTP ${response.status}`);
      }

      const newState = !isFavorited;
      setIsFavorited(newState);
      if (onToggle) onToggle(newState);
    } catch (err: any) {
      console.error("Lỗi khi thay đổi yêu thích:", err.message);
      setErrorMsg(`Lỗi: ${err.message || err}`);
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const win95Style = isFavorited
    ? "bg-[#ff71ce]/20 border-[#ff71ce] text-vapor-pink font-bold shadow-inner"
    : "bg-win-gray text-black font-bold hover:bg-[#e0e0e0]";

  if (variant === "win95") {
    return (
      <div className="relative inline-block font-retro">
        {errorMsg && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 bg-[#0b001a] border border-[#ff71ce] p-1 text-[8px] font-bold text-vapor-pink whitespace-nowrap z-50 animate-pulse shadow-md">
            ⚠️ {errorMsg}
          </div>
        )}
        <button
          onClick={handleToggle}
          disabled={isLoading}
          className={`win95-btn flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase select-none transition-all ${win95Style}`}
        >
          <span className={`text-xs ${isFavorited ? "animate-ping-once text-vapor-pink" : "text-black"}`}>
            {isFavorited ? "💜" : "🤍"}
          </span>
          <span>{isFavorited ? "Đã Lưu" : "Lưu Yêu Thích"}</span>
        </button>
      </div>
    );
  }

  // Kiểu floating icon cho Grid
  return (
    <div className="relative inline-block font-retro">
      {errorMsg && (
        <div className="absolute -top-7 right-0 bg-[#0b001a] border border-[#ff71ce] p-1 text-[8px] font-bold text-vapor-pink whitespace-nowrap z-50 animate-pulse">
          {errorMsg}
        </div>
      )}
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`w-9 h-9 sm:w-7 sm:h-7 flex items-center justify-center rounded-none bg-black/60 border border-win-dark/80 backdrop-blur-xs select-none hover:bg-black/90 transition-all ${
          isFavorited ? "border-vapor-pink text-vapor-pink" : "text-white"
        }`}
        style={{ minHeight: "36px", minWidth: "36px" }}
        title={isFavorited ? "Xóa khỏi danh sách yêu thích" : "Thêm vào danh sách yêu thích"}
      >
        <span className={`text-sm transition-transform duration-300 active:scale-150 ${isFavorited ? "filter drop-shadow-[0_0_4px_#ff71ce] animate-pulse" : "hover:scale-110"}`}>
          {isFavorited ? "💜" : "🤍"}
        </span>
      </button>
    </div>
  );
};
