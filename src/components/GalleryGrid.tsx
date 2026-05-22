import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { FavoriteButton } from "./FavoriteButton";
import { GalleryLightbox } from "./GalleryLightbox";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

interface Submission {
  id: string;
  title: string;
  image_url: string;
  description?: string;
  tags?: string[];
  created_at: string;
  author_id: string;
  profiles: {
    full_name: string;
    avatar_url?: string;
  };
}

interface GalleryGridProps {
  initialSubmissions: Submission[];
  currentUser: {
    id: string;
  } | null;
}

export const GalleryGrid: React.FC<GalleryGridProps> = ({
  initialSubmissions,
  currentUser
}) => {
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
  const [reactionsMap, setReactionsMap] = useState<Record<string, number>>({});
  const [selectedTag, setSelectedTag] = useState<string>("Tất Cả");
  const [sortBy, setSortBy] = useState<"newest" | "reactions" | "random">("newest");
  const [visibleCount, setVisibleCount] = useState<number>(9);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const sentinelRef = useRef<HTMLDivElement>(null);

  // 1. Tải tất cả reactions để tính số lượng cảm xúc cho từng tranh phục vụ sắp xếp
  const fetchAllReactions = async () => {
    const { data, error } = await supabaseClient
      .from("reactions")
      .select("article_id");

    if (!error && data) {
      const counts: Record<string, number> = {};
      data.forEach((r: any) => {
        counts[r.article_id] = (counts[r.article_id] || 0) + 1;
      });
      setReactionsMap(counts);
    }
  };

  // 2. Fetch danh sách submissions mới nhất từ database khi component mount
  const fetchSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabaseClient
      .from("submissions")
      .select("*, profiles:profiles!author_id(full_name, avatar_url)")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSubmissions(data as Submission[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubmissions();
    fetchAllReactions();

    // Lắng nghe Realtime để cập nhật khi có tranh mới được phê duyệt
    const channel = supabaseClient
      .channel("gallery-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "submissions",
          filter: "status=eq.approved"
        },
        () => {
          fetchSubmissions();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reactions"
        },
        () => {
          fetchAllReactions();
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, []);

  // 3. Đọc tham số `?view=submissionId` từ URL khi tải trang để tự mở Lightbox
  useEffect(() => {
    const handleUrlParams = () => {
      const params = new URLSearchParams(window.location.search);
      const viewId = params.get("view");
      if (viewId) {
        setActiveViewId(viewId);
      } else {
        setActiveViewId(null);
      }
    };

    handleUrlParams();
    window.addEventListener("popstate", handleUrlParams);
    return () => window.removeEventListener("popstate", handleUrlParams);
  }, []);

  // 4. Lọc danh sách thẻ Tag độc nhất (Unique Tags)
  const allTags = ["Tất Cả"];
  submissions.forEach((sub) => {
    if (sub.tags && Array.isArray(sub.tags)) {
      sub.tags.forEach((tag) => {
        const normalized = tag.trim();
        if (normalized && !allTags.includes(normalized)) {
          allTags.push(normalized);
        }
      });
    }
  });

  // 5. Áp dụng Lọc Tag
  let processed = submissions.filter((sub) => {
    if (selectedTag === "Tất Cả") return true;
    return sub.tags?.some((t) => t.trim() === selectedTag);
  });

  // 6. Áp dụng Sắp Xếp
  if (sortBy === "newest") {
    processed = [...processed].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } else if (sortBy === "reactions") {
    processed = [...processed].sort(
      (a, b) => (reactionsMap[b.id] || 0) - (reactionsMap[a.id] || 0)
    );
  } else if (sortBy === "random") {
    processed = [...processed].sort((a, b) => {
      const hashA = a.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const hashB = b.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return Math.sin(hashA) - Math.sin(hashB);
    });
  }

  // 7. Thiết lập Infinite Scroll bằng IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < processed.length) {
          setTimeout(() => {
            setVisibleCount((prev) => prev + 6);
          }, 350); // Mượt mà 350ms delay
        }
      },
      { rootMargin: "150px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [visibleCount, processed.length]);

  const visibleSubmissions = processed.slice(0, visibleCount);

  const handleOpenLightbox = (id: string) => {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("view", id);
    window.history.pushState(null, "", newUrl.toString());
    setActiveViewId(id);
  };

  return (
    <div className="font-retro text-black select-none">
      {/* 1. Thanh công cụ Toolbar lọc và sắp xếp (Win95 Panel Style) */}
      <div className="win95-container bg-win-gray p-2.5 sm:p-3 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Bộ lọc Tags */}
        <div className="flex flex-col gap-1.5 flex-1">
          <span className="text-[10px] text-win-dark font-bold uppercase tracking-wider">📂 Danh mục nhãn dán:</span>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setSelectedTag(tag);
                  setVisibleCount(9); // Reset infinite scroll
                }}
                className={`win95-btn px-3 py-1.5 text-[10px] uppercase font-bold transition-all active:scale-95`}
                style={{
                  minHeight: "36px", // Touch friendly
                  background: selectedTag === tag ? "rgba(255, 113, 206, 0.15)" : "var(--color-win-gray)",
                  borderColor: selectedTag === tag ? "var(--color-vapor-pink)" : "initial"
                }}
              >
                {tag === "Tất Cả" ? "📁 Tất Cả" : `#${tag}`}
              </button>
            ))}
          </div>
        </div>

        {/* Bộ sắp xếp */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <span className="text-[10px] text-win-dark font-bold uppercase tracking-wider">⚡ Sắp xếp theo:</span>
          <div className="flex gap-1.5">
            {(["newest", "reactions", "random"] as const).map((type) => {
              const label = type === "newest" ? "💾 Mới nhất" : type === "reactions" ? "💜 Cảm Xúc" : "🎰 Ngẫu nhiên";
              const activeColor = type === "newest" ? "rgba(1, 205, 254, 0.15)" : type === "reactions" ? "rgba(185, 103, 255, 0.15)" : "rgba(255, 251, 150, 0.15)";
              const activeBorder = type === "newest" ? "var(--color-vapor-blue)" : type === "reactions" ? "var(--color-vapor-purple)" : "var(--color-vapor-yellow)";
              
              return (
                <button
                  key={type}
                  onClick={() => setSortBy(type)}
                  className="win95-btn px-3 py-1.5 text-[10px] uppercase font-bold active:scale-95"
                  style={{
                    minHeight: "36px",
                    background: sortBy === type ? activeColor : "var(--color-win-gray)",
                    borderColor: sortBy === type ? activeBorder : "initial"
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Lưới Masonry hiển thị tác phẩm */}
      {visibleSubmissions.length === 0 ? (
        <div className="win95-container bg-win-gray p-12 text-center text-win-dark italic font-bold">
          {loading ? (
            <div className="space-y-2 py-4">
              <span className="animate-spin inline-block text-lg">💾</span>
              <p className="text-xs uppercase">Đang đồng bộ mạng lưới triển lãm...</p>
            </div>
          ) : (
            <div className="py-4">
              <p className="text-2xl">📭</p>
              <p className="text-xs uppercase mt-2">Không tìm thấy tác phẩm nào phù hợp bộ lọc.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
          {visibleSubmissions.map((sub) => {
            const reactionCount = reactionsMap[sub.id] || 0;
            return (
              <div
                key={sub.id}
                className="break-inside-avoid win95-container bg-[#c0c0c0] p-1 flex flex-col group hover:border-[#ff71ce] hover:shadow-[0_0_12px_#ff71ce] transition-all duration-200 relative cursor-pointer"
                onClick={() => handleOpenLightbox(sub.id)}
              >
                {/* Header Window mini của tranh */}
                <div className="win95-header py-0.5 px-2 bg-gradient-to-r from-win-dark to-black text-[9px] group-hover:from-vapor-purple group-hover:to-vapor-pink flex justify-between items-center transition-all duration-200">
                  <span className="truncate max-w-[70%] font-bold uppercase">{sub.title}</span>
                  <span className="text-[8px] opacity-70">ART_VIEW.DLL</span>
                </div>

                {/* Khung chứa ảnh (Tránh CLS giật màn hình với min-height) */}
                <div className="relative bg-[#1a003a]/10 overflow-hidden aspect-auto min-h-[160px] max-h-[420px] border border-win-dark flex items-center justify-center">
                  <img
                    src={sub.image_url}
                    alt={sub.title}
                    className="w-full h-auto max-h-full object-cover filter saturate-[1.1] contrast-[1.03] sm:group-hover:scale-[1.02] transition-transform duration-300"
                    loading="lazy"
                    width="480"
                    height="360"
                  />
                  {/* Overlay CRT scanline nhẹ */}
                  <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_4px] pointer-events-none" />

                  {/* Nút yêu thích dạng floating (Có stopPropagation chặn nổi bọt sự kiện!) */}
                  <div 
                    className="absolute top-2 right-2 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20"
                    onClick={(e) => e.stopPropagation()} // Khóa click bubble mở lightbox
                  >
                    <FavoriteButton
                      submissionId={sub.id}
                      currentUser={currentUser}
                      variant="icon"
                    />
                  </div>
                </div>

                {/* Footer của tranh */}
                <div className="p-2 bg-[#d8d8d8] flex justify-between items-center text-[10px] select-none">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <img
                      src={sub.profiles?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50&auto=format&fit=crop"}
                      alt={sub.profiles?.full_name}
                      className="w-5 h-5 border border-win-dark object-cover filter saturate-150 shrink-0"
                    />
                    <span className="truncate text-black font-bold">{sub.profiles?.full_name}</span>
                  </div>
                  <div className="flex gap-2 text-win-dark font-bold shrink-0">
                    <span>💜 {reactionCount}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Sentinel kích hoạt Infinite Scroll & Loading Skeleton hoài cổ */}
      <div ref={sentinelRef} className="pt-8 pb-4 text-center">
        {visibleCount < processed.length && (
          <div className="win95-container max-w-xs mx-auto bg-win-gray p-2.5 animate-pulse text-[10px] font-bold text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="inline-block animate-bounce">⏳</span>
              <span>SYNCHRONIZING CYBER_GALLERY.DAT...</span>
            </div>
            {/* ProgressBar ảo */}
            <div className="h-2 bg-black border border-win-dark p-0.5 mt-1.5">
              <div className="h-full bg-vapor-pink w-1/3 animate-[scanline_1s_ease-in-out_infinite]" />
            </div>
          </div>
        )}
      </div>

      {/* 4. Trình xem ảnh toàn màn hình Lightbox */}
      {activeViewId && (
        <GalleryLightbox
          submissions={processed}
          activeId={activeViewId}
          currentUser={currentUser}
          onClose={() => setActiveViewId(null)}
        />
      )}
    </div>
  );
};
