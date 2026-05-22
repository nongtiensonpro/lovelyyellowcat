import React, { useState, useEffect, useRef } from "react";

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_url: string;
  tags: string[];
  created_at: string;
}

export const SearchModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Lắng nghe tổ hợp phím tắt Ctrl+K / Cmd+K toàn cục
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
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
      document.body.style.overflow = "hidden"; // Khóa cuộn trang chính
    } else {
      document.body.style.overflow = "";
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Hành động gọi API tìm kiếm kèm chống rung (Debounce)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data);
        }
      } catch (err) {
        console.error("Lỗi gọi API tìm kiếm:", err);
      } finally {
        setIsLoading(false);
      }
    }, 250); // Debounce 250ms

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  return (
    <>
      {/* Nút tìm kiếm nhanh góc trên màn hình */}
      <button
        onClick={() => setIsOpen(true)}
        className="win95-btn flex items-center gap-1.5 text-xs font-bold text-black border-2"
        title="Nhấn Ctrl+K để tìm kiếm nhanh"
      >
        <span>🔍 Tìm Kiếm</span>
        <kbd className="bg-[#a0a0a0] px-1 text-[9px] border border-win-dark font-mono text-black">Ctrl+K</kbd>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[99999] backdrop-blur-[2px]">
          <div className="win95-container max-w-2xl w-full font-retro text-black bg-[#c0c0c0] shadow-2xl animate-[fadeIn_0.15s_ease-out]">
            {/* Titlebar */}
            <div className="win95-header">
              <span className="flex items-center gap-1.5">🔍 SYSTEM_SEARCH.EXE [VIRTUAL_FIND]</span>
              <button
                onClick={() => setIsOpen(false)}
                className="win95-btn py-0 px-1.5 font-bold"
              >
                X
              </button>
            </div>

            {/* Khung tìm kiếm */}
            <div className="p-4 bg-win-gray space-y-4">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold mb-1 uppercase tracking-wide">
                  Gõ từ khóa bài viết hoặc từ khóa nhãn (Hỗ trợ tiếng Việt có dấu)
                </label>
                <div className="flex gap-2">
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="flex-1 p-3 border border-win-dark bg-white outline-none text-xs shadow-inner focus:border-vapor-pink text-black"
                    placeholder="VD: Windows 95, Retro, Neon Dreamscape..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {isLoading && (
                    <div className="flex items-center text-xs px-2 text-vapor-pink animate-pulse font-bold">
                      📡...
                    </div>
                  )}
                </div>
              </div>

              {/* Danh sách kết quả */}
              <div className="w-full max-h-80 overflow-y-auto border-2 border-win-dark bg-[#e6e6e6] p-2 space-y-2 min-h-32">
                {!query.trim() ? (
                  <div className="text-center py-10 text-win-dark text-xs">
                    <span className="text-3xl block mb-2 font-retro">💾</span>
                    NHẬP TỪ KHÓA ĐỂ BẮT ĐẦU QUÉT DỮ LIỆU.
                  </div>
                ) : results.length === 0 && !isLoading ? (
                  <div className="text-center py-10 text-win-dark text-xs">
                    <span className="text-3xl block mb-2">📼</span>
                    KHÔNG TÌM THẤY TẤT CẢ PHÙ HỢP. THỬ TỪ KHÓA KHÁC.
                  </div>
                ) : (
                  results.map((item) => (
                    <a
                      key={item.id}
                      href={`/articles/${item.slug}`}
                      className="p-3 border border-win-dark bg-white block hover:bg-[#ff71ce]/5 hover:border-vapor-pink transition-all no-underline text-black group"
                    >
                      <div className="flex gap-4 items-start">
                        {item.cover_url && (
                          <img
                            src={item.cover_url}
                            alt={item.title}
                            className="w-16 h-16 object-cover border border-win-dark filter saturate-125 brightness-95"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-xs group-hover:text-vapor-pink transition-colors truncate">
                            {item.title}
                          </h3>
                          <p className="text-[10px] text-win-dark mt-1 line-clamp-2 leading-relaxed">
                            {item.excerpt || "Xem chi tiết bài báo nghệ thuật..."}
                          </p>
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {item.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[8px] px-1.5 py-0.2 border border-win-dark/40 bg-[#f0f0f0] font-bold"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </a>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-2.5 bg-win-gray border-t border-white flex justify-between items-center text-[9px] text-win-dark">
              <span>Được xây dựng trên nền tảng Full-Text GIN Indexing.</span>
              <span>Nhấn [ESC] để đóng</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
