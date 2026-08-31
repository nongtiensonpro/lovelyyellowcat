import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { ReactionBar } from "./ReactionBar";
import { FavoriteButton } from "./FavoriteButton";
import { useFocusTrap } from "../lib/a11y";

export interface Submission {
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

export interface GalleryLightboxProps {
  submissions: Submission[];
  activeId: string | null;
  currentUser: {
    id: string;
  } | null;
  onClose: () => void;
}

// Danh sách các bộ lọc hiệu ứng thị giác (Retro Display Shaders)
export type VisualFilter = "normal" | "crt" | "vhs" | "gameboy" | "cyber" | "dither" | "marble";

export const VISUAL_FILTERS: { id: VisualFilter; label: string; icon: string; desc: string }[] = [
  { id: "normal", label: "Gốc (Original)", icon: "🖼️", desc: "Màu sắc nguyên bản chuẩn xác của tác phẩm" },
  { id: "crt", label: "CRT Monitor 1995", icon: "📺", desc: "Đường quét scanline & bóng đèn hình Trinitron" },
  { id: "vhs", label: "VHS Tape Glitch", icon: "📼", desc: "Lệch màu quang sai RGB & vệt tĩnh điện analog" },
  { id: "gameboy", label: "GameBoy 1989", icon: "👾", desc: "Bảng màu 4 sắc độ xanh lá kinh điển của Game Boy" },
  { id: "cyber", label: "Cyberpunk HUD", icon: "📟", desc: "Kính nhìn đêm neon xanh ngọc & thước đo kỹ thuật" },
  { id: "dither", label: "PC-98 16-Bit", icon: "🕹️", desc: "Hạ bảng màu pixel art sắc nét phong cách máy tính Nhật" },
  { id: "marble", label: "Vapor Marble", icon: "🏛️", desc: "Đen trắng tượng thần Hy Lạp ánh tím mơ màng" }
];

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

// Hàm phát âm thanh retro nhẹ nhàng
function playRetroClick(freq = 600, duration = 0.04) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Ignore audio policies
  }
}

export const GalleryLightbox: React.FC<GalleryLightboxProps> = ({
  submissions,
  activeId,
  currentUser,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isAutoplay, setIsAutoplay] = useState<boolean>(false);
  const [autoplaySpeed, setAutoplaySpeed] = useState<number>(5000);
  const [progress, setProgress] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<VisualFilter>("normal");
  const [showFilterMenu, setShowFilterMenu] = useState<boolean>(false);
  const [showFilmstrip, setShowFilmstrip] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Zoom & Pan State
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [isFlippedH, setIsFlippedH] = useState<boolean>(false);

  // UI Toast thông báo nhanh
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const toastTimeoutRef = useRef<number | null>(null);

  // Khóa focus bên trong lightbox (ARIA dialog) — Escape/đóng trả focus về trigger
  useFocusTrap(containerRef, true, onClose);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMsg(msg);
    toastTimeoutRef.current = window.setTimeout(() => setToastMsg(null), 2500);
  }, []);

  // Tìm index của submission đang xem
  useEffect(() => {
    if (activeId && submissions.length > 0) {
      const idx = submissions.findIndex((s) => s.id === activeId);
      if (idx !== -1) {
        setCurrentIndex(idx);
      } else {
        setCurrentIndex(-1);
      }
    } else {
      setCurrentIndex(-1);
    }
  }, [activeId, submissions]);

  const activeSubmission = currentIndex >= 0 ? submissions[currentIndex] : null;

  // Tự động cuộn Filmstrip tới ảnh active
  useEffect(() => {
    if (filmstripRef.current && currentIndex >= 0) {
      const thumbEl = filmstripRef.current.children[currentIndex] as HTMLElement;
      if (thumbEl) {
        thumbEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [currentIndex]);

  // Reset Zoom/Pan khi đổi ảnh
  const resetTransform = useCallback(() => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setRotation(0);
    setIsFlippedH(false);
  }, []);

  useEffect(() => {
    resetTransform();
  }, [currentIndex, resetTransform]);

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

    const intervalTime = 100;
    startTimeRef.current = Date.now();
    setProgress(0);

    progressIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const percentage = Math.min((elapsed / autoplaySpeed) * 100, 100);
      setProgress(percentage);

      if (percentage >= 100) {
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

  const handleNext = useCallback(() => {
    if (submissions.length === 0) return;
    if (soundEnabled) playRetroClick(750, 0.03);
    setCurrentIndex((prev) => (prev + 1) % submissions.length);
    if (isAutoplay) {
      startTimeRef.current = Date.now();
      setProgress(0);
    }
  }, [submissions.length, soundEnabled, isAutoplay]);

  const handlePrev = useCallback(() => {
    if (submissions.length === 0) return;
    if (soundEnabled) playRetroClick(550, 0.03);
    setCurrentIndex((prev) => (prev - 1 + submissions.length) % submissions.length);
    if (isAutoplay) {
      startTimeRef.current = Date.now();
      setProgress(0);
    }
  }, [submissions.length, soundEnabled, isAutoplay]);

  // Áp dụng custom swipe hook (chỉ kích hoạt khi không đang zoom)
  const { handleTouchStart, handleTouchEnd } = useSwipe(
    () => { if (zoomScale <= 1) handleNext(); },
    () => { if (zoomScale <= 1) handlePrev(); }
  );

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
        .then(() => {
          setIsFullscreen(true);
          showToast("🖥️ Đã bật chế độ Toàn Màn Hình");
        })
        .catch((err) => console.error("Lỗi bật Fullscreen:", err));
    } else {
      document.exitFullscreen()
        .then(() => {
          setIsFullscreen(false);
          showToast("🗗 Đã thoát chế độ Toàn Màn Hình");
        })
        .catch((err) => console.error("Lỗi tắt Fullscreen:", err));
    }
  };

  // Zoom Handler
  const handleZoomIn = () => {
    setZoomScale((prev) => {
      const next = Math.min(prev + 0.35, 4.0);
      showToast(`🔍 Phóng to: ${Math.round(next * 100)}%`);
      return next;
    });
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => {
      const next = Math.max(prev - 0.35, 0.8);
      if (next <= 1) {
        setPanOffset({ x: 0, y: 0 });
      }
      showToast(`🔍 Thu nhỏ: ${Math.round(next * 100)}%`);
      return next;
    });
  };

  const handleRotate = () => {
    setRotation((prev) => {
      const next = (prev + 90) % 360;
      showToast(`🔄 Xoay góc: ${next}°`);
      return next;
    });
  };

  const handleFlipH = () => {
    setIsFlippedH((prev) => {
      const next = !prev;
      showToast(next ? "🪞 Đã lật gương ngang" : "🪞 Đã khôi phục hướng gốc");
      return next;
    });
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      // Zoom In
      setZoomScale((prev) => Math.min(prev + 0.2, 4.0));
    } else {
      // Zoom Out
      setZoomScale((prev) => {
        const next = Math.max(prev - 0.2, 0.8);
        if (next <= 1) setPanOffset({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Drag to Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomScale > 1) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Double Click / Double Tap to toggle Zoom
  const handleDoubleClick = () => {
    if (zoomScale > 1.2) {
      resetTransform();
      showToast("🔍 Khôi phục kích thước vừa khung (Fit)");
    } else {
      setZoomScale(2.2);
      showToast("🔍 Phóng to chi tiết 220%");
    }
  };

  // Chuyển nhanh qua filter tiếp theo
  const cycleFilter = () => {
    const filterIds = VISUAL_FILTERS.map(f => f.id);
    const currentIndex = filterIds.indexOf(activeFilter);
    const nextIndex = (currentIndex + 1) % filterIds.length;
    const nextFilter = filterIds[nextIndex];
    setActiveFilter(nextFilter);
    const filterObj = VISUAL_FILTERS.find(f => f.id === nextFilter);
    showToast(`🎨 Bộ lọc: ${filterObj?.icon} ${filterObj?.label}`);
  };

  // Tải ảnh chất lượng cao
  const handleDownload = async () => {
    if (!activeSubmission || isDownloading) return;
    setIsDownloading(true);
    showToast("💾 Đang tải ảnh xuống máy...");

    try {
      const response = await fetch(activeSubmission.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeTitle = activeSubmission.title.toLowerCase().replace(/[^a-z0-9]/g, "_");
      link.download = `vapor_art_${safeTitle}_${activeSubmission.id.substring(0, 8)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast("✓ Đã tải ảnh thành công!");
    } catch (err) {
      window.open(activeSubmission.image_url, "_blank");
      showToast("↗ Đã mở ảnh gốc trong tab mới");
    } finally {
      setIsDownloading(false);
    }
  };

  // Sao chép ảnh trực tiếp vào Clipboard (Image Blob)
  const handleCopyImage = async () => {
    if (!activeSubmission) return;
    try {
      const response = await fetch(activeSubmission.image_url);
      const blob = await response.blob();
      
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      img.crossOrigin = "anonymous";
      img.src = activeSubmission.image_url;
      
      img.onload = async () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx?.drawImage(img, 0, 0);
        canvas.toBlob(async (pngBlob) => {
          if (pngBlob && (navigator.clipboard as any)?.write) {
            await (navigator.clipboard as any).write([
              new ClipboardItem({ "image/png": pngBlob })
            ]);
            setCopiedImage(true);
            showToast("📋 Đã sao chép ảnh vào Clipboard!");
            setTimeout(() => setCopiedImage(false), 2500);
          } else {
            handleCopyLink();
          }
        }, "image/png");
      };
    } catch (err) {
      handleCopyLink();
    }
  };

  // Phím tắt bàn phím nâng cao
  useEffect(() => {
    if (currentIndex === -1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;

      if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "Escape") {
        handleClose();
      } else if (e.key.toLowerCase() === "f") {
        toggleNativeFullscreen();
      } else if (e.key.toLowerCase() === "z") {
        setIsZenMode((prev) => {
          const next = !prev;
          showToast(next ? "🎬 Chế độ Rạp Chiếu (Zen Mode) BẬT" : "🗖 Chế độ Tiêu Chuẩn BẬT");
          return next;
        });
      } else if (e.key.toLowerCase() === "m") {
        cycleFilter();
      } else if (e.key.toLowerCase() === "r") {
        handleRotate();
      } else if (e.key.toLowerCase() === "h") {
        handleFlipH();
      } else if (e.key === "+" || e.key === "=") {
        handleZoomIn();
      } else if (e.key === "-" || e.key === "_") {
        handleZoomOut();
      } else if (e.key === "0") {
        resetTransform();
        showToast("🔍 Khôi phục kích thước 100%");
      } else if (e.key === " ") {
        e.preventDefault();
        setIsAutoplay((prev) => {
          const next = !prev;
          showToast(next ? "▶ Đang chạy Slideshow" : "⏸ Đã tạm dừng Slideshow");
          return next;
        });
      } else if (e.key.toLowerCase() === "d") {
        handleDownload();
      } else if (e.key.toLowerCase() === "l") {
        const btn = document.getElementById("lightbox-favorite-btn");
        if (btn) btn.click();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, submissions.length, handleNext, handlePrev, showToast]);

  // Đồng bộ trạng thái khi trình duyệt thay đổi fullscreen bằng phím cứng F11 hoặc chuột
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/gallery/${activeSubmission?.id}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopiedLink(true);
        showToast("🔗 Đã sao chép liên kết tác phẩm!");
        setTimeout(() => setCopiedLink(false), 2000);
      })
      .catch((err) => console.error("Không thể sao chép link:", err));
  };

  const shareFacebook = () => {
    const shareUrl = encodeURIComponent(`${window.location.origin}/gallery/${activeSubmission?.id}`);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, "_blank");
  };

  const shareX = () => {
    const shareUrl = encodeURIComponent(`${window.location.origin}/gallery/${activeSubmission?.id}`);
    const text = encodeURIComponent(`Khám phá tác phẩm nghệ thuật "${activeSubmission?.title}" trên Lovely Yellow Cat!`);
    window.open(`https://twitter.com/intent/tweet?url=${shareUrl}&text=${text}`, "_blank");
  };

  if (!activeSubmission) return null;

  const formattedDate = new Date(activeSubmission.created_at).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  // Tính toán CSS filter string tương ứng với activeFilter
  const getFilterStyle = (): React.CSSProperties => {
    let filterString = "";
    let imageRendering: any = "auto";

    switch (activeFilter) {
      case "crt":
        filterString = "contrast(115%) brightness(105%) saturate(120%)";
        break;
      case "vhs":
        filterString = "contrast(125%) saturate(150%) hue-rotate(10deg)";
        break;
      case "gameboy":
        filterString = "contrast(180%) brightness(85%) sepia(100%) hue-rotate(50deg) saturate(320%)";
        break;
      case "cyber":
        filterString = "contrast(135%) brightness(110%) hue-rotate(140deg) saturate(220%)";
        break;
      case "dither":
        filterString = "contrast(140%) saturate(130%) brightness(105%)";
        imageRendering = "pixelated";
        break;
      case "marble":
        filterString = "grayscale(100%) contrast(130%) brightness(105%)";
        break;
      default:
        filterString = "saturate(115%) contrast(105%)";
        break;
    }

    return {
      filter: filterString,
      imageRendering,
      transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px) rotate(${rotation}deg) scaleX(${isFlippedH ? -1 : 1})`,
      transition: isDragging ? "none" : "transform 0.15s ease-out, filter 0.3s ease",
      cursor: zoomScale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
      maxWidth: "100%",
      maxHeight: "100%",
      objectFit: "contain"
    };
  };

  return ReactDOM.createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Xem tác phẩm: ${activeSubmission.title || "không tên"}`}
      tabIndex={-1}
      className="fixed inset-0 bg-vapor-night/98 -webkit-backdrop-filter:blur(12px) backdrop-blur-md z-[var(--z-lightbox)] flex flex-col justify-between p-1 sm:p-3 overflow-hidden font-retro text-black select-none"
      style={{ height: "100dvh" }}
    >
      {/* Toast HUD Notification */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] bg-vapor-green text-black font-mono font-bold text-xs px-4 py-2 border-2 border-black shadow-[4px_4px_0_#000] animate-[fadeIn_0.15s_ease-out] pointer-events-none flex items-center gap-2">
          <span>⚡</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Background Ambient Glow (Tạo ánh sáng hắt màu phía sau ảnh) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 blur-3xl transition-all duration-700 -z-10"
        style={{
          background: activeFilter === 'gameboy' ? 'radial-gradient(#8bac0f, transparent 70%)'
                    : activeFilter === 'cyber' ? 'radial-gradient(#01cdfe, transparent 70%)'
                    : activeFilter === 'marble' ? 'radial-gradient(#b967ff, transparent 70%)'
                    : 'radial-gradient(#ff71ce, #01cdfe, transparent 70%)'
        }}
      />

      {/* Lớp dòng quét CRT toàn cục khi bật filter CRT hoặc VHS */}
      {(activeFilter === "crt" || activeFilter === "vhs") && (
        <div className="absolute inset-0 pointer-events-none z-40 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_4px] opacity-70" />
      )}

      {/* KHUNG CỬA SỔ WIN95 CHÍNH */}
      <div className={`win95-container w-full ${isZenMode ? "max-w-full flex-1" : "max-w-6xl mx-auto"} bg-win-gray flex flex-col relative z-10 shadow-2xl overflow-hidden transition-all duration-300 ${isZenMode ? "h-full" : "max-h-[96dvh]"}`}>
        
        {/* THANH TIÊU ĐỀ WINDOWS 95 */}
        <div className="win95-header shrink-0 min-h-[30px] select-none flex justify-between items-center bg-gradient-to-r from-win-titlebar via-sticker-purple to-vapor-blue-dark text-white px-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm">🖼️</span>
            <span className="font-bold text-[11px] sm:text-xs tracking-wide truncate">
              CYBER_GALLERY_PRO.EXE - [{activeSubmission.title}]
            </span>
            {zoomScale > 1 && (
              <span className="bg-vapor-green text-black font-mono text-[10px] px-1.5 py-0.2 font-bold hidden sm:inline">
                {Math.round(zoomScale * 100)}%
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Nút bật/tắt âm thanh */}
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                showToast(soundEnabled ? "🔇 Đã tắt âm thanh hiệu ứng" : "🔊 Đã bật âm thanh hiệu ứng");
              }}
              className="win95-btn py-0 px-2 text-[10px] font-mono hidden sm:inline"
              title="Bật/Tắt âm thanh retro"
            >
              {soundEnabled ? "🔊" : "🔇"}
            </button>

            {/* Nút chế độ Zen / Rạp Chiếu */}
            <button
              onClick={() => {
                setIsZenMode(!isZenMode);
                showToast(!isZenMode ? "🎬 Chế độ Rạp Chiếu (Zen Mode) BẬT" : "🗖 Chế độ Tiêu Chuẩn BẬT");
              }}
              className={`win95-btn py-0 px-2 font-bold text-[10px] flex items-center gap-1 ${
                isZenMode ? "bg-vapor-yellow text-black border-2 border-black" : ""
              }`}
              title="Chế độ Rạp Chiếu tối giản (Phím Z)"
            >
              <span>{isZenMode ? "🗗 THƯỜNG" : "🎬 ZEN"}</span>
            </button>

            {/* Nút Toàn Màn Hình */}
            <button
              onClick={toggleNativeFullscreen}
              className="win95-btn py-0 px-2 font-bold hover:bg-web-gray-panel hidden sm:block"
              style={{ minHeight: "22px" }}
              title="Toàn màn hình (Phím F)"
            >
              {isFullscreen ? "🗗" : "🗖"}
            </button>

            {/* Nút Đóng */}
            <button
              onClick={handleClose}
              className="win95-btn py-0 px-2.5 font-bold text-red-800 hover:bg-red-200"
              style={{ minHeight: "22px" }}
              title="Đóng cửa sổ (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* THANH MENU & TOOLBAR THAO TÁC ẢNH */}
        <div className="win95-menubar bg-win-gray px-2 py-1 text-xs border-b border-win-dark flex items-center justify-between flex-wrap gap-1.5 select-none">
          {/* Nhóm công cụ Zoom, Xoay & Lật */}
          <div className="flex items-center gap-1 flex-wrap">
            {/* Zoom Controls */}
            <div className="flex items-center bg-white border border-win-dark px-1 py-0.5 shadow-inner">
              <button
                onClick={handleZoomOut}
                disabled={zoomScale <= 0.8}
                className="px-1.5 font-bold text-xs hover:bg-win-light disabled:opacity-30"
                title="Thu nhỏ (-)"
              >
                −
              </button>
              <span className="font-mono text-[10px] font-bold px-1.5 min-w-[38px] text-center">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoomScale >= 4.0}
                className="px-1.5 font-bold text-xs hover:bg-win-light disabled:opacity-30"
                title="Phóng to (+)"
              >
                +
              </button>
              {zoomScale !== 1 && (
                <button
                  onClick={resetTransform}
                  className="win95-btn px-1.5 py-0 text-[10px] font-bold bg-vapor-yellow ml-1"
                  title="Khôi phục vừa màn hình (Phím 0)"
                >
                  FIT
                </button>
              )}
            </div>

            {/* Rotate & Flip */}
            <button
              onClick={handleRotate}
              className="win95-btn py-0.5 px-2 text-[10px] font-bold flex items-center gap-1"
              title="Xoay ảnh 90 độ (Phím R)"
            >
              <span>🔄</span> Xoay
            </button>
            <button
              onClick={handleFlipH}
              className={`win95-btn py-0.5 px-2 text-[10px] font-bold flex items-center gap-1 ${
                isFlippedH ? "bg-vapor-pink/30 border-vapor-pink" : ""
              }`}
              title="Lật gương ngang (Phím H)"
            >
              <span>🪞</span> Lật
            </button>

            {/* Menu Bộ Lọc Shaders */}
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`win95-btn py-0.5 px-2 text-[10px] font-bold flex items-center gap-1 ${
                  activeFilter !== "normal" ? "bg-vapor-purple text-white border-black" : ""
                }`}
                title="Chọn hiệu ứng thị giác hoài cổ (Phím M để đổi nhanh)"
              >
                <span>🎨 Lọc:</span>
                <span className="font-mono text-[10px] uppercase">
                  {VISUAL_FILTERS.find(f => f.id === activeFilter)?.label.split(" ")[0]}
                </span>
                <span className="text-[10px]">▼</span>
              </button>

              {/* Dropdown Bộ lọc */}
              {showFilterMenu && (
                <div className="absolute left-0 top-full mt-1 bg-win-gray border-2 border-win-dark shadow-2xl p-1.5 z-50 min-w-[220px] space-y-1 animate-[fadeIn_0.1s_ease-out]">
                  <div className="win95-header py-0.5 px-1 bg-gradient-to-r from-win-titlebar to-vapor-blue-dark text-white text-[10px] font-bold">
                    CHỌN HIỆU ỨNG THỊ GIÁC RETRO (PHÍM M)
                  </div>
                  {VISUAL_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setActiveFilter(f.id);
                        setShowFilterMenu(false);
                        showToast(`🎨 Bộ lọc: ${f.icon} ${f.label}`);
                      }}
                      className={`w-full text-left p-1.5 flex items-center justify-between text-[10px] border ${
                        activeFilter === f.id
                          ? "bg-win-titlebar text-white font-bold border-black"
                          : "hover:bg-win-light text-black border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{f.icon}</span>
                        <span>{f.label}</span>
                      </div>
                      {activeFilter === f.id && <span className="font-mono text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Nhóm công cụ Tải xuống, Copy & Chia sẻ */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="win95-btn py-0.5 px-2 text-[10px] font-bold flex items-center gap-1 bg-vapor-green/25 hover:bg-vapor-green/50 border border-black"
              title="Tải ảnh gốc HD về máy (Phím D)"
            >
              <span>💾</span>
              <span>{isDownloading ? "..." : "TẢI HD"}</span>
            </button>
            <button
              onClick={handleCopyImage}
              className="win95-btn py-0.5 px-2 text-[10px] font-bold hidden sm:flex items-center gap-1"
              title="Sao chép ảnh vào bộ nhớ tạm"
            >
              <span>📋</span>
              <span>{copiedImage ? "✓ ĐÃ CHÉP" : "COPY ẢNH"}</span>
            </button>
          </div>
        </div>

        {/* THÂN CỬA SỔ (MAIN CONTENT GRID) */}
        <div className={`grid ${isZenMode ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-12"} bg-win-gray p-1.5 sm:p-2.5 gap-2.5 overflow-hidden flex-1 min-h-0`}>
          
          {/* CỘT TRÁI: VÙNG XEM ẢNH VÀ ĐIỀU KHIỂN (12 cols khi Zen mode, 8 cols khi thường) */}
          <div className={`${isZenMode ? "col-span-1" : "lg:col-span-8"} flex flex-col gap-2 min-h-0 flex-1`}>
            
            {/* Vùng Canvas Xem Tranh Chính (Có hỗ trợ Deep Zoom, Pan, Drag & Shaders) */}
            <div
              ref={imageWrapperRef}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onDoubleClick={handleDoubleClick}
              className="relative bg-vapor-dark-edge flex-1 min-h-[320px] sm:min-h-[420px] flex items-center justify-center border-2 border-win-dark overflow-hidden group select-none shadow-inner"
              style={{ touchAction: zoomScale > 1 ? "none" : "pan-y" }}
            >
              {/* Lưới tọa độ thẩm mỹ Cyberpunk Matrix */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(var(--color-vapor-pink) 1px, transparent 0)',
                  backgroundSize: '24px 24px'
                }}
              />

              {/* Khung HUD Cyberpunk Overlay khi kích hoạt Filter Cyber */}
              {activeFilter === "cyber" && (
                <div className="absolute inset-0 pointer-events-none border border-vapor-blue/40 p-2 flex flex-col justify-between text-[10px] font-mono text-vapor-blue z-20">
                  <div className="flex justify-between">
                    <span>TARGET_ACQUIRED // RES_1080P</span>
                    <span>COORDS: X={Math.round(panOffset.x)} Y={Math.round(panOffset.y)}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span>MATRIX_ZOOM: {Math.round(zoomScale * 100)}%</span>
                    <span>CYBER_OPTICS_ONLINE</span>
                  </div>
                </div>
              )}

              {/* Bức Tranh Nghệ Thuật với CSS Transformations & Filters */}
              <img
                src={activeSubmission.image_url}
                alt={activeSubmission.title}
                draggable={false}
                style={getFilterStyle()}
                className="select-none pointer-events-auto filter-drop-shadow"
              />

              {/* Nút mũi tên chuyển ảnh nhanh (Trái) */}
              <button
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 border border-win-dark text-white w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center font-bold text-lg transition-all z-30 active:scale-95 shadow-md"
                aria-label="Ảnh trước (Mũi tên trái)"
              >
                ◀
              </button>

              {/* Nút mũi tên chuyển ảnh nhanh (Phải) */}
              <button
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 border border-win-dark text-white w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center font-bold text-lg transition-all z-30 active:scale-95 shadow-md"
                aria-label="Ảnh tiếp theo (Mũi tên phải)"
              >
                ▶
              </button>

              {/* Badge thông tin chỉ số ảnh góc dưới trái */}
              <div className="absolute bottom-2 left-2 bg-black/80 border border-win-dark text-[10px] sm:text-[10px] text-vapor-blue font-bold px-2 py-0.5 z-20 flex items-center gap-1.5">
                <span>SUBMISSION {currentIndex + 1} / {submissions.length}</span>
                {zoomScale > 1 && (
                  <span className="text-vapor-green font-mono">• Kéo chuột để di chuyển</span>
                )}
              </div>

              {/* Badge phím tắt góc trên phải */}
              <div className="absolute top-2 right-2 bg-black/70 text-white/80 font-mono text-[10px] px-2 py-0.5 hidden md:block z-20">
                [LĂN CHUỘT] ZOOM • [DBL CLICK] 2X • [Z] ZEN • [M] FILTER
              </div>
            </div>

            {/* THANH ĐIỀU KHIỂN AUTOPLAY VÀ SLIDESHOW */}
            <div className="win95-container p-2 bg-web-gray-dark flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shrink-0">
              <div className="flex items-center gap-2 justify-between sm:justify-start flex-wrap">
                <button
                  onClick={() => setIsAutoplay(!isAutoplay)}
                  className={`win95-btn px-3 py-1 font-bold flex items-center gap-1.5 ${
                    isAutoplay ? "bg-vapor-green/20 border-vapor-green text-green-900" : ""
                  }`}
                  style={{ minHeight: "32px" }}
                >
                  {isAutoplay ? "⏸ TẠM DỪNG" : "▶ CHẠY SLIDESHOW"}
                </button>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-win-dark uppercase font-bold">Giây:</span>
                  <select
                    value={autoplaySpeed}
                    onChange={(e) => {
                      setAutoplaySpeed(Number(e.target.value));
                      if (isAutoplay) startTimeRef.current = Date.now();
                    }}
                    className="border border-win-dark bg-white text-[10px] px-1 py-0.5 outline-none font-bold"
                  >
                    <option value={3000}>3s</option>
                    <option value={5000}>5s</option>
                    <option value={8000}>8s</option>
                    <option value={10000}>10s</option>
                  </select>
                </div>
                <button
                  onClick={() => setShowFilmstrip(!showFilmstrip)}
                  className={`win95-btn py-0.5 px-2 text-[10px] font-bold hidden sm:inline ${
                    showFilmstrip ? "win95-sunken bg-white" : ""
                  }`}
                  title="Ẩn/Hiện cuộn ảnh thu nhỏ"
                >
                  🎞️ Filmstrip
                </button>
              </div>

              {/* Thanh tiến trình Autoplay (Progress Neon Bar) */}
              <div className="w-full sm:flex-1 h-3 bg-black border border-win-dark p-0.5 relative mx-1">
                <div
                  className="h-full bg-gradient-to-r from-vapor-purple via-vapor-pink to-vapor-green shadow-[0_0_8px_#ff71ce] transition-all duration-100 ease-linear"
                  style={{ width: `${isAutoplay ? progress : 0}%` }}
                />
              </div>

              <div className="text-[10px] text-win-dark font-bold hidden xl:block shrink-0 font-mono">
                [←/→] ĐỔI | [ESC] ĐÓNG | [F] FULL | [SPACE] PLAY
              </div>
            </div>

            {/* FILMSTRIP THUMBNAILS CAROUSEL (Dải ảnh thu nhỏ cuộn ngang) */}
            {showFilmstrip && (
              <div
                ref={filmstripRef}
                className="flex items-center gap-1.5 overflow-x-auto p-1 bg-black/90 border border-win-dark h-16 shrink-0 scrollbar-thin select-none"
              >
                {submissions.map((sub, sIdx) => {
                  const isActive = sIdx === currentIndex;
                  return (
                    <div
                      key={sub.id}
                      onClick={() => {
                        if (soundEnabled) playRetroClick(600, 0.02);
                        setCurrentIndex(sIdx);
                      }}
                      className={`h-full aspect-video shrink-0 cursor-pointer overflow-hidden border-2 relative transition-all ${
                        isActive
                          ? "border-vapor-green scale-105 shadow-[0_0_8px_#05ffa1] z-10 opacity-100"
                          : "border-win-dark opacity-60 hover:opacity-100 hover:border-vapor-pink"
                      }`}
                    >
                      <img
                        src={sub.image_url}
                        alt={sub.title}
                        className="w-full h-full object-cover"
                      />
                      {isActive && (
                        <div className="absolute inset-0 border border-white pointer-events-none" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CỘT PHẢI: THÔNG TIN CHI TIẾT + TƯƠNG TÁC (Ẩn trong Zen mode để tối đa hóa không gian) */}
          {!isZenMode && (
            <div className="lg:col-span-4 flex flex-col gap-2.5 justify-between min-h-0 overflow-y-auto">
              {/* Block thông tin tác giả và tác phẩm */}
              <div className="space-y-2">
                {/* Tác giả */}
                <div className="win95-container p-2 bg-web-gray-dark flex items-center gap-2.5">
                  <img
                    src={activeSubmission.profiles?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop"}
                    alt={activeSubmission.profiles?.full_name}
                    className="w-9 h-9 border border-win-dark object-cover filter saturate-150 contrast-110 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-[10px] text-win-dark font-bold uppercase">Nghệ sĩ cộng tác</div>
                    <div className="text-[11px] sm:text-xs font-bold text-black truncate">{activeSubmission.profiles?.full_name}</div>
                  </div>
                </div>

                {/* Chi tiết tác phẩm */}
                <div
                  className="win95-container p-2.5 bg-white space-y-2 border-inner overflow-y-auto"
                  style={{ maxHeight: "28vh", minHeight: "110px" }}
                >
                  <h3 className="text-xs sm:text-sm font-extrabold text-black leading-tight border-b-2 border-dashed border-web-gray-light pb-1 uppercase">
                    {activeSubmission.title}
                  </h3>
                  <p className="text-[10px] text-win-dark font-mono" suppressHydrationWarning>{formattedDate}</p>
                  <p className="text-[11px] text-black/90 leading-relaxed font-sans break-words">
                    {activeSubmission.description || "Tác phẩm mang phong cách thẩm mỹ hoài cổ kỹ thuật số, tái hiện hoàn hảo thời kỳ đầu của nghệ thuật đồ họa vi tính."}
                  </p>

                  {activeSubmission.tags && activeSubmission.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {activeSubmission.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-bold text-vapor-purple bg-vapor-purple/10 border border-vapor-purple/30 px-1.5 py-0.5 uppercase tracking-wider"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Các Action và Tương tác (Favorite + Reactions) */}
              <div className="space-y-2 mt-auto">
                {/* Nút yêu thích + Chia sẻ */}
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
                      className="win95-btn font-bold px-2 py-1 text-[10px]"
                      style={{ minHeight: "32px", minWidth: "32px" }}
                      title="Chia sẻ lên Facebook"
                    >
                      FB
                    </button>
                    <button
                      onClick={shareX}
                      className="win95-btn font-bold px-2 py-1 text-[10px]"
                      style={{ minHeight: "32px", minWidth: "32px" }}
                      title="Chia sẻ lên X"
                    >
                      X
                    </button>
                    <button
                      onClick={handleCopyLink}
                      className={`win95-btn font-bold px-2 py-1 text-[10px] uppercase select-none transition-all ${
                        copiedLink ? "bg-vapor-green/20 border-vapor-green text-green-800" : ""
                      }`}
                      style={{ minHeight: "32px", minWidth: "40px" }}
                      title="Sao chép liên kết"
                    >
                      {copiedLink ? "✓" : "LINK"}
                    </button>
                  </div>
                </div>

                {/* Nút xem bình luận lớn */}
                <a
                  href={`/gallery/${activeSubmission.id}`}
                  className="win95-btn block text-center py-2 text-[10px] font-bold no-underline text-black uppercase bg-vapor-yellow/20 border-vapor-yellow hover:bg-vapor-yellow/40 active:scale-95"
                  style={{ minHeight: "34px" }}
                >
                  💬 Xem Diễn Đàn Bình Luận Chi Tiết &gt;&gt;
                </a>

                {/* Bảng cảm xúc ReactionBar */}
                <div className="border-t border-win-dark/30 pt-1">
                  <ReactionBar articleId={activeSubmission.id} currentUser={currentUser} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* STATUSBAR PHÍA DƯỚI CỦA CỬA SỔ */}
        <div className="win95-statusbar justify-between text-[10px] bg-win-gray px-2 py-0.5 border-t border-win-dark select-none">
          <div className="flex items-center gap-3">
            <span>● ART_ENGINE: READY</span>
            <span className="win95-statusbar-panel font-mono text-vapor-purple font-bold">
              FILTER: {VISUAL_FILTERS.find(f => f.id === activeFilter)?.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-win-dark font-mono hidden sm:inline">
              ZOOM: {Math.round(zoomScale * 100)}% {rotation !== 0 ? `| ${rotation}°` : ""}
            </span>
            <span className="win95-statusbar-panel font-mono font-bold text-win-titlebar">
              {currentIndex + 1} OF {submissions.length}
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
