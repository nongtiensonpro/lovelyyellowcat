import React, { useState, useEffect, useRef, useCallback } from "react";
import { ErrorBoundary } from "../ui/kernel/ErrorBoundary";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { FavoriteButton } from "./FavoriteButton";
import { GalleryLightbox } from "./GalleryLightbox";
// Phase 4: pure query pipeline (unit-tested) — filter/sort/debounce guard
import { processGalleryItems, shouldRefetch, type SortMode } from "./gallery/galleryQuery";
import { LazyImage } from "./LazyImage";

const supabaseClient = getSupabaseBrowserClient();

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
  isFavoritesOnly?: boolean;
}

const GalleryGridInner: React.FC<GalleryGridProps> = ({
  initialSubmissions,
  currentUser,
  isFavoritesOnly = false
}) => {
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
  const [reactionsMap, setReactionsMap] = useState<Record<string, number>>({});
  const [selectedTag, setSelectedTag] = useState<string>("Tất Cả");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "reactions" | "random">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "crt">("grid");
  const [visibleCount, setVisibleCount] = useState<number>(9);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  // Phase 4: debounce realtime refetch (≥250ms giữa các lần) — tránh burst khi nhiều event
  const lastRefetchRef = useRef<number | null>(null);

  // 1. Tải tất cả reactions
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

  // 2. Fetch danh sách submissions từ database
  // useCallback — deps thật: cho phép effect realtime phụ thuộc an toàn (exhaustive-deps)
  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      if (isFavoritesOnly) {
        if (!currentUser?.id) {
          setSubmissions([]);
          setLoading(false);
          return;
        }
        const res = await fetch("/api/favorites");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.submissions)) {
            setSubmissions(data.submissions as Submission[]);
          }
        }
      } else {
        const { data, error } = await supabaseClient
          .from("submissions")
          .select("*, profiles:profiles!author_id(full_name, avatar_url)")
          .eq("status", "approved")
          .order("created_at", { ascending: false });

        if (!error && data) {
          setSubmissions(data as Submission[]);
        }
      }
    } catch (err) {
      console.error("Lỗi khi tải tranh:", err);
    } finally {
      setLoading(false);
    }
  }, [isFavoritesOnly, currentUser?.id]);

  useEffect(() => {
    fetchSubmissions();
    fetchAllReactions();

    const channelName = isFavoritesOnly 
      ? `favorites-realtime-${currentUser?.id || "guest"}` 
      : "gallery-realtime-sync";

    const channel = supabaseClient
      .channel(channelName)
      .on(
        "postgres_changes",
        isFavoritesOnly
          ? {
              event: "*",
              schema: "public",
              table: "favorites",
              filter: `profile_id=eq.${currentUser?.id || ""}`
            }
          : {
              event: "*",
              schema: "public",
              table: "submissions",
              filter: "status=eq.approved"
            },
        () => {
          if (shouldRefetch(lastRefetchRef.current, Date.now())) {
            lastRefetchRef.current = Date.now();
            fetchSubmissions();
          }
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
          if (shouldRefetch(lastRefetchRef.current, Date.now())) {
            lastRefetchRef.current = Date.now();
            fetchAllReactions();
          }
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [isFavoritesOnly, currentUser?.id, fetchSubmissions]);

  // 3. Đọc tham số URL ?view=id và ?tag=<tên tag>
  useEffect(() => {
    const handleUrlParams = () => {
      const params = new URLSearchParams(window.location.search);
      const viewId = params.get("view");
      if (viewId) {
        setActiveViewId(viewId);
      } else {
        setActiveViewId(null);
      }

      const tagParam = params.get("tag");
      if (tagParam && tagParam.trim()) {
        setSelectedTag(tagParam.trim());
      } else if (params.has("tag") === false) {
        setSelectedTag("Tất Cả");
      }
    };

    handleUrlParams();
    window.addEventListener("popstate", handleUrlParams);
    return () => window.removeEventListener("popstate", handleUrlParams);
  }, []);

  // 4. Lọc tags
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

  // 5+6. Phase 4: filter/sort qua pure pipeline (unit-tested) — deterministic random theo ngày
  const processed = processGalleryItems(submissions, {
    selectedTag,
    searchQuery,
    sortBy: sortBy as SortMode,
    reactionCounts: reactionsMap,
    seed: new Date().toDateString(),
  });

  // 7. Infinite Scroll
  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < processed.length) {
          setTimeout(() => {
            setVisibleCount((prev) => prev + 6);
          }, 250);
        }
      },
      { rootMargin: "200px" }
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
      {/* 1. Windows Explorer Navigation Toolbar */}
      <div className="win95-container bg-win-gray p-2.5 sm:p-3 mb-6 space-y-3">
        {/* Explorer Menubar & Address Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-win-dark pb-2">
          <div className="flex items-center gap-1.5 w-full sm:w-auto flex-1">
            <span className="text-[10px] font-bold text-win-darkest uppercase shrink-0">📍 VỊ TRÍ:</span>
            <div className="win95-sunken bg-white px-2 py-1 flex items-center gap-1 text-xs w-full sm:max-w-md font-mono">
              <span className="text-win-darkest">{isFavoritesOnly ? "C:\\VAPOR_OS\\FAVORITES\\" : "C:\\VAPOR_OS\\GALLERY\\"}</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tranh, nghệ sĩ, từ khóa..."
                className="bg-transparent border-none outline-none text-black w-full text-xs font-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-win-dark hover:text-black font-bold px-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
            <span className="text-[10px] font-bold text-win-darkest uppercase mr-1">CHẾ ĐỘ XEM:</span>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`win95-btn py-1 px-2 text-[10px] font-bold ${viewMode === 'grid' ? 'win95-sunken bg-vapor-pink/20' : ''}`}
              title="Lưới Icon Windows 95"
            >
              ▦ LƯỚI
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`win95-btn py-1 px-2 text-[10px] font-bold ${viewMode === 'list' ? 'win95-sunken bg-vapor-blue/20' : ''}`}
              title="Danh Sách Chi Tiết Explorer"
            >
              ☰ CHI TIẾT
            </button>
            <button
              type="button"
              onClick={() => setViewMode("crt")}
              className={`win95-btn py-1 px-2 text-[10px] font-bold ${viewMode === 'crt' ? 'win95-sunken bg-vapor-green/20' : ''}`}
              title="Khung TV CRT"
            >
              📺 CRT TV
            </button>
          </div>
        </div>

        {/* Filter Tags & Sort Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* Tags */}
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-[10px] text-win-darkest font-bold uppercase tracking-wider">🏷️ NHÃN THỂ LOẠI:</span>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedTag(tag);
                    setVisibleCount(9);
                  }}
                  className={`win95-btn px-2.5 py-1 text-[10px] uppercase font-bold ${
                    selectedTag === tag ? "win95-sunken bg-vapor-pink/25 font-extrabold text-black" : "bg-win-gray"
                  }`}
                  style={{ minHeight: "28px" }}
                >
                  {tag === "Tất Cả" ? "📁 Tất Cả" : `#${tag}`}
                </button>
              ))}
            </div>
          </div>

          {/* Sắp xếp */}
          <div className="flex flex-col gap-1 shrink-0">
            <span className="text-[10px] text-win-darkest font-bold uppercase tracking-wider">⚡ SẮP XẾP:</span>
            <div className="flex gap-1">
              {(["newest", "reactions", "random"] as const).map((type) => {
                const label = type === "newest" ? "💾 Mới Nhất" : type === "reactions" ? "💜 Yêu Thích" : "🎰 Ngẫu Nhiên";
                return (
                  <button
                    key={type}
                    onClick={() => setSortBy(type)}
                    className={`win95-btn px-2.5 py-1 text-[10px] uppercase font-bold ${
                      sortBy === type ? "win95-sunken bg-vapor-blue/25 font-extrabold" : "bg-win-gray"
                    }`}
                    style={{ minHeight: "28px" }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Content Display by View Mode */}
      {visibleSubmissions.length === 0 ? (
        <div className="win95-container bg-win-gray p-12 text-center text-win-dark italic font-bold">
          {loading ? (
            <div className="space-y-2 py-4">
              <span className="animate-spin inline-block text-2xl">💾</span>
              <p className="text-xs uppercase font-mono">ĐANG ĐỒNG BỘ CSDL TRIỂN LÃM...</p>
            </div>
          ) : isFavoritesOnly && !searchQuery.trim() && selectedTag === "Tất Cả" ? (
            <div className="py-4 space-y-3">
              <p className="text-4xl">🤍</p>
              <p className="text-xs uppercase font-bold text-black font-mono not-italic">KỆ LƯU TRỮ ĐANG TRỐNG</p>
              <p className="text-[10px] text-win-darkest max-w-sm mx-auto not-italic font-normal">
                Bạn chưa lưu tác phẩm nào. Hãy ghé thăm phòng triển lãm và nhấn biểu tượng 💜 để lưu các kiệt tác yêu thích vào kệ này!
              </p>
              <a href="/gallery" className="win95-btn inline-block mt-2 px-6 py-2 no-underline text-black font-bold uppercase not-italic" style={{ minHeight: "36px" }}>
                🌐 Đến Phòng Triển Lãm
              </a>
            </div>
          ) : (
            <div className="py-4 space-y-2">
              <p className="text-3xl">📭</p>
              <p className="text-xs uppercase font-bold text-black not-italic">KHÔNG TÌM THẤY TÁC PHẨM PHÙ HỢP</p>
              <p className="text-[10px] text-win-darkest not-italic font-normal">Hãy thử đổi từ khóa tìm kiếm hoặc chọn nhãn khác.</p>
            </div>
          )}
        </div>
      ) : viewMode === "list" ? (
        /* DETAIL LIST VIEW */
        <div className="win95-container bg-white overflow-x-auto shadow-md">
          <table className="w-full text-left text-xs font-retro border-collapse">
            <thead>
              <tr className="bg-win-gray border-b border-win-dark text-black select-none">
                <th className="p-2 border-r border-win-light font-bold">TÁC PHẨM</th>
                <th className="p-2 border-r border-win-light font-bold">NGHỆ SĨ</th>
                <th className="p-2 border-r border-win-light font-bold">THỂ LOẠI</th>
                <th className="p-2 border-r border-win-light font-bold text-center">CẢM XÚC</th>
                <th className="p-2 font-bold text-center">HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody>
              {visibleSubmissions.map((sub, idx) => {
                const reactionCount = reactionsMap[sub.id] || 0;
                return (
                  <tr
                    key={sub.id}
                    className={`border-b border-win-light hover:bg-vapor-pink/10 cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-paper-white'}`}
                    onClick={() => handleOpenLightbox(sub.id)}
                  >
                    <td className="p-2 flex items-center gap-2">
                      <img src={sub.image_url || ""} alt={sub.title} className="w-8 h-8 object-cover border border-win-dark shrink-0" />
                      <span className="font-bold truncate max-w-[200px]">{sub.title}</span>
                    </td>
                    <td className="p-2 font-mono text-xs">
                      {sub.profiles?.full_name || "Ẩn danh"}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1 flex-wrap">
                        {(sub.tags || []).slice(0, 2).map((t, i) => (
                          <span key={i} className="text-[10px] font-mono bg-win-gray px-1 border border-win-dark">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-2 text-center font-mono font-bold text-vapor-purple">
                      💜 {reactionCount}
                    </td>
                    <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <FavoriteButton 
                        submissionId={sub.id} 
                        currentUser={currentUser} 
                        variant="button"
                        initialIsFavorited={isFavoritesOnly ? true : undefined}
                        onToggle={(isFav) => {
                          if (isFavoritesOnly && !isFav) {
                            setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
                          }
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : viewMode === "crt" ? (
        /* CRT TV MONITOR SHOWCASE VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleSubmissions.map((sub) => {
            const reactionCount = reactionsMap[sub.id] || 0;
            return (
              <div
                key={sub.id}
                className="bg-win-gray p-3 rounded-lg border-4 border-win-light shadow-[inset_-2px_-2px_0_#404040,inset_2px_2px_0_#dfdfdf,6px_6px_0_rgba(0,0,0,0.8)] cursor-pointer group"
                onClick={() => handleOpenLightbox(sub.id)}
              >
                <div className="flex justify-between items-center mb-1 text-[10px] font-mono font-bold">
                  <span className="truncate">{sub.title}</span>
                  <span className="text-vapor-pink shrink-0">● CRT-RGB</span>
                </div>
                <div className="bg-black p-1.5 rounded border-2 border-win-darkest relative overflow-hidden aspect-video flex items-center justify-center">
                  <LazyImage
                    src={sub.image_url || ""}
                    alt={sub.title}
                    className="w-full h-full object-cover filter saturate-[1.15] contrast-[1.05] group-hover:scale-105 transition-transform duration-300"
                    width="480"
                    height="270"
                  />
                  <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(to_bottom,transparent_0px,transparent_2px,rgba(0,0,0,0.3)_2px,rgba(0,0,0,0.3)_4px)] z-10" />
                </div>
                <div className="flex justify-between items-center mt-2 text-[10px] font-bold">
                  <span className="truncate text-black/80">{sub.profiles?.full_name}</span>
                  <span className="font-mono text-vapor-purple shrink-0">💜 {reactionCount}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* GRID MASONRY VIEW (Default) */
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
          {visibleSubmissions.map((sub) => {
            const reactionCount = reactionsMap[sub.id] || 0;
            return (
              <div
                key={sub.id}
                className="break-inside-avoid win95-container bg-win-gray p-1 flex flex-col group hover:border-vapor-pink hover:shadow-[0_0_15px_rgba(255,113,206,0.6)] transition-all duration-200 relative cursor-pointer"
                onClick={() => handleOpenLightbox(sub.id)}
              >
                {/* Header Window mini */}
                <div className="win95-header py-0.5 px-2 bg-gradient-to-r from-win-titlebar to-vapor-blue-dark text-[10px] flex justify-between items-center">
                  <span className="truncate max-w-[70%] font-bold uppercase">{sub.title}</span>
                  <span className="text-[10px] opacity-80 font-mono">ART_VIEW.DLL</span>
                </div>

                {/* Khung chứa ảnh */}
                <div className="relative bg-cosmic-mid/10 overflow-hidden aspect-auto min-h-[160px] max-h-[420px] border border-win-dark flex items-center justify-center">
                  <LazyImage
                    src={sub.image_url || ""}
                    alt={sub.title}
                    className="w-full h-auto max-h-full object-cover filter saturate-[1.1] contrast-[1.03] sm:group-hover:scale-[1.02] transition-transform duration-300"
                    width="480"
                    height="360"
                  />
                  <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_4px] pointer-events-none" />

                  {/* Nút yêu thích dạng floating */}
                  <div 
                    className="absolute top-2 right-2 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FavoriteButton
                      submissionId={sub.id}
                      currentUser={currentUser}
                      variant="icon"
                      initialIsFavorited={isFavoritesOnly ? true : undefined}
                      onToggle={(isFav) => {
                        if (isFavoritesOnly && !isFav) {
                          setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Footer của tranh */}
                <div className="p-2 bg-web-gray-dark flex justify-between items-center text-[10px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <img
                      src={sub.profiles?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50&auto=format&fit=crop"}
                      alt={sub.profiles?.full_name}
                      className="w-5 h-5 border border-win-dark object-cover filter saturate-150 shrink-0"
                    />
                    <span className="truncate text-black font-bold">{sub.profiles?.full_name}</span>
                  </div>
                  <div className="flex gap-2 text-win-darkest font-mono font-bold shrink-0">
                    <span>💜 {reactionCount}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Sentinel kích hoạt Infinite Scroll */}
      <div ref={sentinelRef} className="pt-8 pb-4 text-center">
        {visibleCount < processed.length && (
          <div className="win95-container max-w-xs mx-auto bg-win-gray p-2.5 animate-pulse text-[10px] font-bold text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="inline-block animate-bounce">⏳</span>
              <span>SYNCHRONIZING CYBER_GALLERY.DAT...</span>
            </div>
            <div className="h-2 bg-black border border-win-dark p-0.5 mt-1.5">
              <div className="h-full bg-vapor-pink w-1/3 animate-[scanline_1s_ease-in-out_infinite]" />
            </div>
          </div>
        )}
      </div>

      {/* 4. Trình xem ảnh Lightbox */}
      {activeViewId && (
        <GalleryLightbox
          submissions={processed as unknown as Parameters<typeof GalleryLightbox>[0]["submissions"]}
          activeId={activeViewId}
          currentUser={currentUser}
          onClose={() => {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete("view");
            window.history.pushState(null, "", newUrl.toString());
            setActiveViewId(null);
          }}
        />
      )}
    </div>
  );
};

// Phase 8: ErrorBoundary — island crash không làm trắng trang
export const GalleryGrid: React.FC<GalleryGridProps> = (props) => (
  <ErrorBoundary moduleName="GALLERY_GRID.EXE">
    <GalleryGridInner {...props} />
  </ErrorBoundary>
);
