// GalleryGrid.tsx — orchestration gallery. Bản dựng lại 01/09/2026.
// Tách nhỏ: URL hook (useGalleryUrl), reactions hook, card/toolbar presentational,
// pure query pipeline (galleryQuery). Nguyên tắc chống lại bug cũ:
//   - viewId CHỈ tồn tại trong useGalleryViewParam (mirror URL), Grid không giữ
//     state viewId riêng => không thể lệch URL/state.
//   - Click card => open(id): pushState + setState trong một thao tác.
//   - Lightbox next/prev => replace(id) (không spam history).
//   - Close => close() xóa param bằng replaceState.
import React, { useEffect, useMemo, useState } from "react";
import { ErrorBoundary } from "../ui/kernel/ErrorBoundary";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { GalleryCard } from "./gallery/GalleryCard";
import { GalleryToolbar } from "./gallery/GalleryToolbar";
import { GalleryLightbox, type Submission } from "./GalleryLightbox";
import { useGalleryViewParam } from "./gallery/useGalleryUrl";
import { useGalleryReactions } from "./gallery/useGalleryReactions";
import { processGalleryItems, paginate, type SortMode } from "./gallery/galleryQuery";

const supabaseClient = getSupabaseBrowserClient();

interface GalleryGridProps {
  initialSubmissions: Submission[];
  currentUser: { id: string } | null;
  isFavoritesOnly?: boolean;
}

const PAGE_STEP = 9;

function GalleryGridInner({
  initialSubmissions,
  currentUser,
  isFavoritesOnly = false,
}: GalleryGridProps) {
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
  const [selectedTag, setSelectedTag] = useState("Tất Cả");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortMode>("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);
  const [loading, setLoading] = useState(false);

  const [viewId, openView, closeView, replaceView] = useGalleryViewParam();
  const reactionCounts = useGalleryReactions();

  // ── Refetch submissions (realtime + favorites refresh) ──
  useEffect(() => {
    let cancelled = false;
    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        if (isFavoritesOnly) {
          if (!currentUser?.id) {
            if (!cancelled) setSubmissions([]);
            return;
          }
          const res = await fetch("/api/favorites");
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.submissions) && !cancelled) {
              setSubmissions(data.submissions as Submission[]);
            }
          }
        } else {
          const { data, error } = await supabaseClient
            .from("submissions")
            .select("*, profiles:profiles!author_id(full_name, avatar_url)")
            .eq("status", "approved")
            .order("created_at", { ascending: false });
          if (!error && data && !cancelled) {
            setSubmissions(data as Submission[]);
          }
        }
      } catch (err) {
        console.error("Lỗi khi tải tranh:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSubmissions();

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
              filter: `profile_id=eq.${currentUser?.id || ""}`,
            }
          : { event: "*", schema: "public", table: "submissions", filter: "status=eq.approved" },
        () => fetchSubmissions(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabaseClient.removeChannel(channel);
    };
  }, [isFavoritesOnly, currentUser?.id]);

  // ── Filter/sort qua pure pipeline (đã unit test) ──
  const processed = useMemo(
    () =>
      processGalleryItems(submissions, {
        selectedTag,
        searchQuery,
        sortBy,
        reactionCounts,
        seed: new Date().toDateString(),
      }),
    [submissions, selectedTag, searchQuery, sortBy, reactionCounts],
  );

  // Reset pagination khi filter đổi
  useEffect(() => {
    setVisibleCount(PAGE_STEP);
  }, [selectedTag, searchQuery, sortBy]);

  const visibleSubmissions = useMemo(
    () => paginate(processed, visibleCount),
    [processed, visibleCount],
  );

  // Deep-link validation: nếu URL ?view= không khớp submission nào (sau khi data
  // đã load), tự đóng — tránh lightbox trắng treo mãi.
  useEffect(() => {
    if (!viewId) return;
    if (processed.length > 0 && !processed.some((s) => s.id === viewId)) {
      // Chưa chắc là lỗi: có thể do filter đang che item. Chỉ đóng khi cả danh sách
      // đầy đủ (chưa filter) cũng không có.
      if (submissions.length > 0 && !submissions.some((s) => s.id === viewId)) {
        closeView();
      }
    }
  }, [viewId, processed, submissions, closeView]);

  const handleUnfavorite = (id: string) => {
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-4">
      <GalleryToolbar
        items={submissions}
        selectedTag={selectedTag}
        searchQuery={searchQuery}
        sortBy={sortBy}
        searchInputId="gallery-search"
        onSelectTag={(tag) => setSelectedTag(tag)}
        onSearch={(q) => setSearchQuery(q)}
        onSort={(mode) => setSortBy(mode)}
      />

      {/* Thông tin trạng thái */}
      <div className="win95-sunken bg-white p-2 text-[10px] font-mono font-bold text-win-darkest flex justify-between">
        <span>
          HIỂN THỊ {visibleSubmissions.length} / {processed.length} TÁC PHẨM
        </span>
        <span className={loading ? "text-vapor-pink animate-pulse" : "text-vapor-green"}>
          {loading ? "SYNCING..." : "READY"}
        </span>
      </div>

      {/* Masonry grid */}
      {visibleSubmissions.length === 0 ? (
        <div className="win95-container bg-win-gray p-12 text-center text-win-dark italic font-bold">
          {loading ? (
            <div className="space-y-2 py-4">
              <span className="animate-spin inline-block text-2xl">💾</span>
              <p className="text-xs uppercase font-mono">ĐANG ĐỒNG BỘ CSDL TRIỂN LÃM...</p>
            </div>
          ) : isFavoritesOnly ? (
            <div className="py-4 space-y-3">
              <p className="text-4xl">🤍</p>
              <p className="text-xs uppercase font-bold text-black font-mono not-italic">
                KỆ LƯU TRỮ ĐANG TRỐNG
              </p>
              <p className="text-[10px] text-win-darkest max-w-sm mx-auto not-italic font-normal">
                Bạn chưa lưu tác phẩm nào. Hãy ghé thăm phòng triển lãm và nhấn biểu tượng 💜 để lưu
                các kiệt tác yêu thích!
              </p>
              <a
                href="/gallery"
                className="win95-btn inline-block mt-2 px-6 py-2 no-underline text-black font-bold uppercase not-italic"
                style={{ minHeight: "36px" }}
              >
                🌐 Đến Phòng Triển Lãm
              </a>
            </div>
          ) : (
            <div className="py-4 space-y-2">
              <p className="text-3xl">📭</p>
              <p className="text-xs uppercase font-bold text-black not-italic">
                KHÔNG TÌM THẤY TÁC PHẨM PHÙ HỢP
              </p>
              <p className="text-[10px] text-win-darkest not-italic font-normal">
                Hãy thử đổi từ khóa tìm kiếm hoặc chọn nhãn khác.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
          {visibleSubmissions.map((sub) => (
            <GalleryCard
              key={sub.id}
              id={sub.id}
              title={sub.title}
              imageUrl={sub.image_url || ""}
              authorName={sub.profiles?.full_name || "Ẩn danh"}
              authorAvatar={sub.profiles?.avatar_url || null}
              reactionCount={reactionCounts[sub.id] || 0}
              isFavoritesOnly={isFavoritesOnly}
              currentUser={currentUser}
              onOpen={openView}
              onUnfavorite={handleUnfavorite}
            />
          ))}
        </div>
      )}

      {/* Sentinel infinite scroll */}
      {visibleCount < processed.length && (
        <div
          className="pt-8 pb-4 text-center"
          ref={(el) => {
            if (!el) return;
            const observer = new IntersectionObserver(
              (entries) => {
                if (entries[0].isIntersecting) {
                  setVisibleCount((prev) => prev + PAGE_STEP);
                }
              },
              { rootMargin: "200px" },
            );
            observer.observe(el);
            // Cleanup qua callback ref: disconnect khi unmount/ref là đủ vì
            // observer mới được tạo mỗi lần ref thay đổi.
            const cleanup = () => observer.disconnect();
            el.addEventListener("DOMNodeRemoved", cleanup, { once: true });
          }}
        />
      )}

      {/* Lightbox */}
      {viewId && (
        <GalleryLightbox
          submissions={processed as Submission[]}
          activeId={viewId}
          currentUser={currentUser}
          onClose={closeView}
          onNavigate={replaceView}
        />
      )}
    </div>
  );
}

// ErrorBoundary — island crash không làm trắng trang (quy ước Phase 8)
export const GalleryGrid: React.FC<GalleryGridProps> = (props) => (
  <ErrorBoundary moduleName="GALLERY_GRID.EXE">
    <GalleryGridInner {...props} />
  </ErrorBoundary>
);
