import React, { useState, useEffect, useRef } from "react";
import { useFocusTrap } from "../lib/a11y";

interface ArticleResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_url: string;
  tags: string[];
  created_at: string;
}

interface ArtworkResult {
  id: string;
  title: string;
  description: string;
  image_url: string;
  created_at: string;
}

interface ArtistResult {
  id: string;
  full_name: string;
  avatar_url: string;
  bio: string;
}

interface UnifiedResults {
  articles: ArticleResult[];
  artworks: ArtworkResult[];
  artists: ArtistResult[];
}

const EMPTY_RESULTS: UnifiedResults = { articles: [], artworks: [], artists: [] };

// v5 fix: const này từng ĐƯỢC DÙNG mà KHÔNG ĐỊNH NGHĨA (crash runtime khi search có kết quả —
// TypeScript gate giờ bắt). Style khớp header section Win95 của modal.
const sectionHeaderClass =
  "font-retro text-[10px] font-bold uppercase tracking-widest text-vapor-purple border-b border-vapor-purple/30 pb-1 mb-2 mt-4";

export const SearchModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnifiedResults>(EMPTY_RESULTS);
  const [isLoading, setIsLoading] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<number | null>(null);

  useFocusTrap(dialogRef, isOpen, () => setIsOpen(false));

  // Lắng nghe tổ hợp phím tắt Ctrl+K / Cmd+K toàn cục
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      // Batch 8: Esc đóng modal — keyboard users không bị kẹt khi không có chuột
      if (e.key === "Escape") {
        setIsOpen((prev) => (prev ? false : prev));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Tự động focus vào ô tìm kiếm khi mở Modal
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setQuery("");
      setResults(EMPTY_RESULTS);
    }
  }, [isOpen]);

  const totalResults = results.articles.length + results.artworks.length + results.artists.length;

  // Hành động gọi API tìm kiếm kèm chống rung (Debounce)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query.trim()) {
      setResults(EMPTY_RESULTS);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (response.ok) {
          const data = await response.json();
          setResults({
            articles: Array.isArray(data.articles) ? data.articles : [],
            artworks: Array.isArray(data.artworks) ? data.artworks : [],
            artists: Array.isArray(data.artists) ? data.artists : [],
          });
        }
      } catch (err) {
        console.error("Lỗi gọi API tìm kiếm:", err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  return (
    <>
      {/* Nút tìm kiếm nhanh */}
      <button
        onClick={() => setIsOpen(true)}
        className="win95-btn flex items-center gap-1.5 text-xs font-bold text-black border-2"
        title="Nhấn Ctrl+K để tìm kiếm nhanh"
      >
        <span>🔍 Tìm Kiếm</span>
        <kbd className="bg-win-dark/60 px-1 text-[10px] border border-win-dark font-mono text-black">Ctrl+K</kbd>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          role="presentation"
          className="fixed inset-0 bg-black/70 flex items-start sm:items-center justify-center p-4 z-command backdrop-blur-[2px] overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Tìm kiếm toàn hệ thống"
            tabIndex={-1}
            className="win95-container max-w-2xl w-full font-retro text-black bg-win-gray shadow-2xl my-4"
          >
            {/* Titlebar */}
            <div className="win95-header">
              <span className="flex items-center gap-1.5">🔍 SYSTEM_SEARCH.EXE [UNIFIED_FIND]</span>
              <button
                onClick={() => setIsOpen(false)}
                className="win95-btn py-0 px-1.5 font-bold"
                aria-label="Đóng tìm kiếm"
              >
                X
              </button>
            </div>

            {/* Khung nhập từ khóa */}
            <div className="p-4 bg-win-gray space-y-3">
              <label htmlFor="unified-search-input" className="block text-[10px] font-bold uppercase tracking-wide">
                Tìm bài viết, tranh cộng đồng &amp; nghệ sĩ (hỗ trợ tiếng Việt)
              </label>
              <div className="flex gap-2">
                <input
                  ref={searchInputRef}
                  id="unified-search-input"
                  type="text"
                  role="searchbox"
                  aria-label="Tìm kiếm toàn trang"
                  className="flex-1 p-3 border border-win-dark bg-white outline-none text-xs shadow-inner focus:border-vapor-pink text-black"
                  placeholder="VD: Windows 95, Vaporwave, Neon..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {isLoading && (
                  <div className="flex items-center text-xs px-2 text-vapor-pink animate-pulse font-bold">
                    📡...
                  </div>
                )}
              </div>

              {/* Danh sách kết quả phân nhóm */}
              <div
                className="w-full max-h-96 overflow-y-auto border-2 border-win-dark bg-web-gray-light p-2 space-y-1 min-h-32"
                role="listbox"
                aria-label="Kết quả tìm kiếm"
              >
                {!query.trim() ? (
                  <div className="text-center py-10 text-win-dark text-xs">
                    <span className="text-3xl block mb-2 font-retro">💾</span>
                    NHẬP TỪ KHÓA ĐỂ BẮT ĐẦU QUÉT DỮ LIỆU.
                  </div>
                ) : totalResults === 0 && !isLoading ? (
                  <div className="text-center py-10 text-win-dark text-xs">
                    <span className="text-3xl block mb-2">📼</span>
                    KHÔNG TÌM THẤY KẾT QUẢ PHÙ HỢP. THỬ TỪ KHÓA KHÁC.
                  </div>
                ) : (
                  <>
                    {results.articles.length > 0 && (
                      <>
                        <p className={sectionHeaderClass}>📰 Bài Viết ({results.articles.length})</p>
                        {results.articles.map((item) => (
                          <a
                            key={`a-${item.id}`}
                            href={`/articles/${item.slug}`}
                            className="p-2.5 border border-win-dark bg-white block hover:bg-vapor-pink/5 hover:border-vapor-pink transition-all no-underline text-black group"
                          >
                            <div className="flex gap-3 items-start">
                              {item.cover_url && (
                                <img
                                  src={item.cover_url}
                                  alt=""
                                  loading="lazy"
                                  className="w-14 h-14 object-cover border border-win-dark filter saturate-125 brightness-95"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-xs group-hover:text-vapor-pink transition-colors truncate">
                                  {item.title}
                                </h3>
                                <p className="text-[10px] text-win-dark mt-0.5 line-clamp-1 leading-relaxed">
                                  {item.excerpt || "Xem chi tiết bài viết nghệ thuật..."}
                                </p>
                              </div>
                            </div>
                          </a>
                        ))}
                      </>
                    )}

                    {results.artworks.length > 0 && (
                      <>
                        <p className={sectionHeaderClass}>🖼️ Tranh Cộng Đồng ({results.artworks.length})</p>
                        {results.artworks.map((item) => (
                          <a
                            key={`w-${item.id}`}
                            href={`/gallery/${item.id}`}
                            className="p-2.5 border border-win-dark bg-white flex gap-3 items-start hover:bg-vapor-blue/5 hover:border-vapor-blue transition-all no-underline text-black group"
                          >
                            <img
                              src={item.image_url}
                              alt=""
                              loading="lazy"
                              className="w-14 h-14 object-cover border border-win-dark filter saturate-125 brightness-95 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-xs group-hover:text-vapor-blue transition-colors truncate">
                                {item.title || "Tác phẩm không tên"}
                              </h3>
                              <p className="text-[10px] text-win-dark mt-0.5 line-clamp-1 leading-relaxed">
                                {item.description || "Tác phẩm nghệ thuật hoài cổ từ phòng triển lãm."}
                              </p>
                            </div>
                          </a>
                        ))}
                      </>
                    )}

                    {results.artists.length > 0 && (
                      <>
                        <p className={sectionHeaderClass}>🎨 Nghệ Sĩ ({results.artists.length})</p>
                        {results.artists.map((item) => (
                          <a
                            key={`u-${item.id}`}
                            href={`/profile/${item.id}`}
                            className="p-2.5 border border-win-dark bg-white flex gap-3 items-center hover:bg-vapor-purple/5 hover:border-vapor-purple transition-all no-underline text-black group"
                          >
                            <img
                              src={item.avatar_url || "/images/default-avatar.png"}
                              alt=""
                              loading="lazy"
                              className="w-9 h-9 object-cover border border-win-dark shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-xs group-hover:text-vapor-purple transition-colors truncate">
                                🎨 {item.full_name || "Nghệ sĩ ẩn danh"}
                              </h3>
                              {item.bio && (
                                <p className="text-[10px] text-win-dark mt-0.5 line-clamp-1">{item.bio}</p>
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-win-darkest shrink-0">PROFILE →</span>
                          </a>
                        ))}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-2.5 bg-win-gray border-t border-white flex justify-between items-center text-[10px] text-win-dark">
              <span>Tìm kiếm toàn hệ thống: Bài viết · Tranh · Nghệ sĩ</span>
              <span>Nhấn [ESC] để đóng</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
