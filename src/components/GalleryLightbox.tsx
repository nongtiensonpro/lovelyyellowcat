import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { ReactionBar } from "./ReactionBar";
import { FavoriteButton } from "./FavoriteButton";
import { LazyImage } from "./LazyImage";

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

interface GalleryLightboxProps {
  submissions: Submission[];
  activeId: string | null;
  currentUser: {
    id: string;
  } | null;
  onClose: () => void;
}

// Hook hỗ trợ nhận diện cử chỉ vuốt ngang (Swipe) trên thiết bị cảm ứng
function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Chỉ nhận swipe ngang khi góc nghiêng nhỏ hơn 45 độ so với trục hoành
    if (Math.abs(deltaX) < Math.abs(deltaY) * 0.8) return;
    // Ngưỡng vuốt tối thiểu 45px
    if (Math.abs(deltaX) < 45) return;

    if (deltaX < 0) {
      onSwipeLeft();   // Vuốt sang trái -> xem ảnh tiếp theo
    } else {
      onSwipeRight();  // Vuốt sang phải -> xem ảnh trước đó
    }
  };

  return { handleTouchStart, handleTouchEnd };
}

export const GalleryLightbox: React.FC<GalleryLightboxProps> = ({
  submissions,
  activeId,
  currentUser,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isAutoplay, setIsAutoplay] = useState<boolean>(false);
  const [autoplaySpeed, setAutoplaySpeed] = useState<number>(5000); // 5 seconds default
  const [progress, setProgress] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Tìm index của submission đang xem
  useEffect(() => {
    if (activeId && submissions.length > 0) {
      const idx = submissions.findIndex((s) => s.id === activeId);
      if (idx !== -1) {
        setCurrentIndex(idx);
      }
    } else {
      setCurrentIndex(-1);
    }
  }, [activeId, submissions]);

  const activeSubmission = currentIndex >= 0 ? submissions[currentIndex] : null;

  // Cập nhật URL Deep-linking khi đổi ảnh
  useEffect(() => {
    if (activeSubmission) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("view", activeSubmission.id);
      window.history.replaceState(null, "", newUrl.toString());
    }
  }, [activeSubmission]);

  // Preload ảnh lân cận thông minh (Next & Prev)
  useEffect(() => {
    if (currentIndex === -1 || submissions.length === 0) return;

    const preloadImage = (url: string) => {
      const img = new Image();
      img.src = url;
    };

    const nextIndex = (currentIndex + 1) % submissions.length;
    const prevIndex = (currentIndex - 1 + submissions.length) % submissions.length;

    preloadImage(submissions[nextIndex].image_url);
    preloadImage(submissions[prevIndex].image_url);
  }, [currentIndex, submissions]);

  // Xử lý tự động chạy Slideshow (Autoplay)
  useEffect(() => {
    if (!isAutoplay || currentIndex === -1 || submissions.length <= 1) {
      setProgress(0);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      return;
    }

    const intervalTime = 100; // Cập nhật progress bar mỗi 100ms
    startTimeRef.current = Date.now();
    setProgress(0);

    progressIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const percentage = Math.min((elapsed / autoplaySpeed) * 100, 100);
      setProgress(percentage);

      if (percentage >= 100) {
        // Chuyển sang ảnh tiếp theo
        setCurrentIndex((prev) => (prev + 1) % submissions.length);
        startTimeRef.current = Date.now();
        setProgress(0);
      }
    }, intervalTime);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [isAutoplay, currentIndex, autoplaySpeed, submissions.length]);

  const handleNext = () => {
    if (submissions.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % submissions.length);
    if (isAutoplay) {
      startTimeRef.current = Date.now();
      setProgress(0);
    }
  };

  const handlePrev = () => {
    if (submissions.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + submissions.length) % submissions.length);
    if (isAutoplay) {
      startTimeRef.current = Date.now();
      setProgress(0);
    }
  };

  // Áp dụng custom swipe hook
  const { handleTouchStart, handleTouchEnd } = useSwipe(handleNext, handlePrev);

  const handleClose = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete("view");
    window.history.replaceState(null, "", newUrl.toString());
    onClose();
  };

  const toggleNativeFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.error("Lỗi bật Fullscreen:", err));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch((err) => console.error("Lỗi tắt Fullscreen:", err));
    }
  };

  // Phím tắt bàn phím
  useEffect(() => {
    if (currentIndex === -1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "Escape") {
        handleClose();
      } else if (e.key.toLowerCase() === "f") {
        toggleNativeFullscreen();
      } else if (e.key.toLowerCase() === "l") {
        const btn = document.getElementById("lightbox-favorite-btn");
        if (btn) btn.click();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, submissions.length]);

  // Đồng bộ trạng thái khi trình duyệt thay đổi fullscreen bằng phím cứng F11 hoặc chuột
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/gallery/${activeSubmission.id}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      })
      .catch((err) => console.error("Không thể sao chép link:", err));
  };

  const shareFacebook = () => {
    const shareUrl = encodeURIComponent(`${window.location.origin}/gallery/${activeSubmission.id}`);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, "_blank");
  };

  const shareX = () => {
    const shareUrl = encodeURIComponent(`${window.location.origin}/gallery/${activeSubmission.id}`);
    const text = encodeURIComponent(`Khám phá tác phẩm nghệ thuật "${activeSubmission.title}" trên Vapor Journal!`);
    window.open(`https://twitter.com/intent/tweet?url=${shareUrl}&text=${text}`, "_blank");
  };

  const formattedDate = new Date(activeSubmission.created_at).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  if (!activeSubmission) return null;

  return ReactDOM.createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 bg-[#0b001a]/95 -webkit-backdrop-filter:blur(8px) backdrop-blur-md z-[9999] flex items-center justify-center p-1 sm:p-4 overflow-y-auto font-retro text-black"
      style={{ height: "100dvh" }} // iOS Safari Safe Viewport
    >
      {/* Lớp dòng quét CRT cục bộ trong Lightbox */}
      <div className="absolute inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-40 sm:opacity-100" />

      <div className="win95-container w-full max-w-5xl bg-win-gray flex flex-col relative z-10 shadow-2xl overflow-hidden max-h-[98dvh]">
        {/* Thanh tiêu đề Windows 95 */}
        <div className="win95-header shrink-0 min-h-[30px] select-none">
          <span className="flex items-center gap-1.5 truncate text-[10px] sm:text-xs">
            🖼️ ART_VIEWER.EXE - {activeSubmission.title}
          </span>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={toggleNativeFullscreen}
              className="win95-btn py-0 px-2 font-bold hover:bg-[#e0e0e0] hidden sm:block"
              style={{ minHeight: "22px" }}
              title="Toàn màn hình (Phím F)"
            >
              {isFullscreen ? "🗖" : "🗗"}
            </button>
            <button
              onClick={handleClose}
              className="win95-btn py-0 px-2.5 font-bold text-red-800 hover:bg-red-200"
              style={{ minHeight: "22px" }}
              title="Đóng (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Thân cửa sổ (Hỗ trợ scroll dọc chung trên màn hình rất nhỏ) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 bg-[#c0c0c0] p-2 sm:p-3 gap-3 overflow-y-auto max-h-[calc(98dvh-35px)]">
          {/* Cột 1 & 2: Hiển thị tác phẩm tranh */}
          <div className="lg:col-span-2 flex flex-col gap-2.5">
            {/* Vùng xem tranh chính với Swipe Support */}
            <div 
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="swipe-target relative bg-black aspect-video sm:aspect-auto h-[35vh] sm:h-[48vh] md:h-[52vh] flex items-center justify-center border-2 border-win-dark overflow-hidden group select-none"
              style={{ touchAction: "pan-y" }}
            >
              {/* Lưới tọa độ thẩm mỹ */}
              <div className="absolute inset-0 opacity-10 pointer-events-none" 
                   style={{ backgroundImage: 'radial-gradient(var(--color-vapor-pink) 1px, transparent 0)', backgroundSize: '24px 24px' }} />

              <LazyImage
                src={activeSubmission.image_url}
                alt={activeSubmission.title}
                className="max-w-full max-h-full object-contain filter saturate-125 contrast-105"
                style={{ WebkitTouchCallout: "none" }} // Ngăn iOS long-press menu
              />

              {/* Các nút mũi tên chuyển ảnh nhanh (Đảm bảo Touch target thoải mái trên mobile) */}
              <button
                onClick={handlePrev}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/90 border border-win-dark text-white w-11 h-11 flex items-center justify-center font-bold text-lg transition-all focus:outline-none z-10 active:scale-95"
                aria-label="Ảnh trước"
              >
                ◀
              </button>
              <button
                onClick={handleNext}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/90 border border-win-dark text-white w-11 h-11 flex items-center justify-center font-bold text-lg transition-all focus:outline-none z-10 active:scale-95"
                aria-label="Ảnh tiếp theo"
              >
                ▶
              </button>

              {/* Tag thứ tự của ảnh */}
              <div className="absolute bottom-2 left-2 bg-black/70 border border-win-dark text-[8px] sm:text-[9px] text-vapor-blue font-bold px-2 py-0.5">
                SUBMISSION {currentIndex + 1} / {submissions.length}
              </div>
            </div>

            {/* Thanh điều khiển Autoplay Slideshow */}
            <div className="win95-container p-2 bg-[#d8d8d8] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2.5 justify-between sm:justify-start">
                <button
                  onClick={() => setIsAutoplay(!isAutoplay)}
                  className={`win95-btn px-3 py-1 font-bold flex items-center gap-1.5 ${
                    isAutoplay ? "bg-vapor-green/20 border-vapor-green text-green-900" : ""
                  }`}
                  style={{ minHeight: "36px" }} // Touch safe
                >
                  {isAutoplay ? "⏸ TẠM DỪNG" : "▶ CHẠY SLIDESHOW"}
                </button>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-win-dark uppercase font-bold">Giây:</span>
                  <select
                    value={autoplaySpeed}
                    onChange={(e) => {
                      setAutoplaySpeed(Number(e.target.value));
                      if (isAutoplay) startTimeRef.current = Date.now();
                    }}
                    className="border border-win-dark bg-white text-[10px] px-1 py-1 outline-none font-bold"
                  >
                    <option value={3000}>3s</option>
                    <option value={5000}>5s</option>
                    <option value={8000}>8s</option>
                    <option value={10000}>10s</option>
                  </select>
                </div>
              </div>

              {/* Thanh tiến trình Autoplay (Progress neon) */}
              <div className="w-full sm:flex-1 h-3 bg-black border border-win-dark p-0.5 relative">
                <div
                  className="h-full bg-gradient-to-r from-vapor-purple to-vapor-pink shadow-[0_0_8px_#ff71ce] transition-all duration-100 ease-linear"
                  style={{ width: `${isAutoplay ? progress : 0}%` }}
                />
              </div>

              <div className="text-[8px] sm:text-[9px] text-win-dark font-bold text-center sm:text-right hidden md:block">
                [←/→] ĐỔI ẢNH | [ESC] ĐÓNG | [F] TOÀN MÀN HÌNH
              </div>
            </div>
          </div>

          {/* Cột 3: Thông tin chi tiết + Tương tác (Có scroll riêng ở dưới) */}
          <div className="flex flex-col gap-3 justify-between">
            {/* Block thông tin tác giả và tác phẩm */}
            <div className="space-y-2.5">
              {/* Tác giả */}
              <div className="win95-container p-2 bg-[#d8d8d8] flex items-center gap-2.5">
                <img
                  src={activeSubmission.profiles?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop"}
                  alt={activeSubmission.profiles?.full_name}
                  className="w-9 h-9 border border-win-dark object-cover filter saturate-150 contrast-110 shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-[9px] text-win-dark font-bold uppercase">Nghệ sĩ cộng tác</div>
                  <div className="text-[11px] sm:text-xs font-bold text-black truncate">{activeSubmission.profiles?.full_name}</div>
                </div>
              </div>

              {/* Chi tiết tác phẩm (Giới hạn chiều cao và cho phép cuộn tự nhiên trên mobile) */}
              <div 
                className="win95-container p-2.5 bg-white space-y-2 border-inner overflow-y-auto"
                style={{ maxHeight: "25vh", minHeight: "110px", overscrollBehavior: "contain" }}
              >
                <h3 className="text-xs sm:text-sm font-extrabold text-black leading-tight border-b-2 border-dashed border-[#e6e6e6] pb-1 uppercase">
                  {activeSubmission.title}
                </h3>
                <p className="text-[9px] text-win-dark">{formattedDate}</p>
                <p className="text-[11px] text-black/90 leading-relaxed font-sans mt-2 break-words">
                  {activeSubmission.description || "Tác phẩm mang phong cách thẩm mỹ hoài cổ kỹ thuật số, tái hiện hoàn hảo thời kỳ đầu của nghệ thuật đồ họa vi tính."}
                </p>

                {activeSubmission.tags && activeSubmission.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {activeSubmission.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[8px] font-bold text-[#b967ff] bg-[#b967ff]/10 border border-[#b967ff]/30 px-1.5 py-0.5 uppercase tracking-wider"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Các Action và Tương tác (Favorite + Reactions) */}
            <div className="space-y-2.5 mt-auto">
              {/* Nút yêu thích + Chia sẻ (Touch friendly) */}
              <div className="flex gap-2 items-center justify-between">
                <div id="lightbox-favorite-btn-container" className="flex-1 shrink-0">
                  <FavoriteButton
                    id="lightbox-favorite-btn"
                    submissionId={activeSubmission.id}
                    currentUser={currentUser}
                    variant="win95"
                  />
                </div>

                {/* Các nút chia sẻ nhanh */}
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={shareFacebook}
                    className="win95-btn font-bold px-2 py-1 text-[9px]"
                    style={{ minHeight: "36px", minWidth: "32px" }}
                    title="Chia sẻ lên Facebook"
                  >
                    FB
                  </button>
                  <button
                    onClick={shareX}
                    className="win95-btn font-bold px-2 py-1 text-[9px]"
                    style={{ minHeight: "36px", minWidth: "32px" }}
                    title="Chia sẻ lên X"
                  >
                    X
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className={`win95-btn font-bold px-2 py-1 text-[9px] uppercase select-none transition-all ${
                      copiedLink ? "bg-[#05ffa1]/20 border-[#05ffa1] text-green-800" : ""
                    }`}
                    style={{ minHeight: "36px", minWidth: "40px" }}
                    title="Sao chép liên kết"
                  >
                    {copiedLink ? "✓" : "LINK"}
                  </button>
                </div>
              </div>

              {/* Nút xem bình luận lớn */}
              <a
                href={`/gallery/${activeSubmission.id}`}
                className="win95-btn block text-center py-2.5 text-[10px] font-bold no-underline text-black uppercase bg-[#fffb96]/20 border-[#fffb96] hover:bg-[#fffb96]/40 active:scale-95"
                style={{ minHeight: "38px" }}
              >
                💬 Xem Bình Luận & Tương Tác
              </a>

              {/* Bảng cảm xúc ReactionBar */}
              <div className="border-t border-win-dark/30 pt-1">
                <ReactionBar articleId={activeSubmission.id} currentUser={currentUser} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
