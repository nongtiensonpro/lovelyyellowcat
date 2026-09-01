// GalleryLightbox.tsx — trình xem ảnh toàn màn hình. Bản dựng lại 01/09/2026
// sau khi bug deep-link/?view= tái diễn nhiều lần không rõ nguyên nhân ở bản
// cũ (1070 dòng). Nguyên tắc:
//   1. Index hiển thị LUÔN resolve từ prop activeId (single source of truth là
//      URL) — không cache index, không initialIndex magic.
//   2. Toàn bộ logic math/navigation/filter nằm trong gallery/*.ts (pure,
//      unit-tested); component chỉ orchestrate.
//   3. Đóng = xóa ?view bằng replaceState (Back không rơi vào vòng loop);
//      chuyển ảnh = replaceState (không spam history).
//   4. Dialog chuẩn ARIA: role=dialog + aria-modal, focus trap, Escape,
//      aria-live cho toast, phím tắt đầy đủ (spec D7).
import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { FavoriteButton } from "./FavoriteButton";
import { ReactionBar } from "./ReactionBar";
import { useFocusTrap } from "../lib/a11y";
import {
  zoomIn as xfZoomIn,
  zoomOut as xfZoomOut,
  rotate as xfRotate,
  flipH as xfFlipH,
  panTo as xfPanTo,
  zoomTo as xfZoomTo,
  transformToCss,
  zoomPercent,
  INITIAL_TRANSFORM,
  type TransformState,
} from "./gallery/galleryTransform";
import { nextIndex, prevIndex, neighborUrls, autoplayProgress } from "./gallery/galleryNavigation";
import { filterCss, VISUAL_FILTERS, type VisualFilter } from "./gallery/galleryFilters";
import { LazyImage } from "./LazyImage";

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
  currentUser: { id: string } | null;
  onClose: () => void;
  /** Chuyển ảnh đang xem (next/prev/filmstrip) — Grid cập nhật URL qua replaceView. */
  onNavigate: (id: string) => void;
}

/** Âm thanh retro nhẹ, respect autoplay policy. */
function playRetroClick(freq = 600, duration = 0.04): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
    // Audio policy — bỏ qua
  }
}

function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const startX = useRef<number>(0);
  const startY = useRef<number>(0);
  return {
    handleTouchStart: (e: React.TouchEvent) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    },
    handleTouchEnd: (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = e.changedTouches[0].clientY - startY.current;
      if (Math.abs(dx) < Math.abs(dy) * 0.8 || Math.abs(dx) < 45) return;
      if (dx < 0) onSwipeLeft();
      else onSwipeRight();
    },
  };
}

export const GalleryLightbox: React.FC<GalleryLightboxProps> = ({
  submissions,
  activeId,
  currentUser,
  onClose,
  onNavigate,
}) => {
  const [transform, setTransform] = useState<TransformState>(INITIAL_TRANSFORM);
  const [activeFilter, setActiveFilter] = useState<VisualFilter>("normal");
  const [isAutoplay, setIsAutoplay] = useState(false);
  const [autoplaySpeed, setAutoplaySpeed] = useState(5000);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const autoplayStartRef = useRef<number>(0);
  const toastTimeoutRef = useRef<number | null>(null);

  // ── Resolve index TỪ activeId mỗi render — gốc của bug cũ là state index ──
  const currentIndex = activeId ? submissions.findIndex((s) => s.id === activeId) : -1;
  const active = currentIndex >= 0 ? submissions[currentIndex] : null;

  useFocusTrap(containerRef, true, onClose);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMsg(msg);
    toastTimeoutRef.current = window.setTimeout(() => setToastMsg(null), 2500);
  }, []);

  // Thông báo mỗi khi đổi ảnh: deps theo id (string) — showToast là useCallback
  // ổn định nên không gây re-run vòng.
  const activeTitle = active?.title ?? null;
  useEffect(() => {
    if (activeTitle !== null) showToast(`Đang xem: ${activeTitle}`);
  }, [activeTitle, showToast]);

  const goNext = useCallback(() => {
    if (submissions.length === 0) return;
    const target = submissions[nextIndex(currentIndex, submissions.length)];
    if (target && target.id !== activeId) {
      if (soundOn) playRetroClick(750, 0.03);
      onNavigate(target.id);
    }
  }, [submissions, currentIndex, activeId, onNavigate, soundOn]);

  const goPrev = useCallback(() => {
    if (submissions.length === 0) return;
    const target = submissions[prevIndex(currentIndex, submissions.length)];
    if (target && target.id !== activeId) {
      if (soundOn) playRetroClick(550, 0.03);
      onNavigate(target.id);
    }
  }, [submissions, currentIndex, activeId, onNavigate, soundOn]);

  // Reset transform mỗi khi đổi ảnh
  useEffect(() => {
    setTransform(INITIAL_TRANSFORM);
  }, [activeId]);

  // Filmstrip auto-scroll tới thumb active
  useEffect(() => {
    if (filmstripRef.current && currentIndex >= 0) {
      const thumb = filmstripRef.current.children[currentIndex] as HTMLElement | undefined;
      thumb?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [currentIndex]);

  // Preload ảnh kề (spec D2)
  useEffect(() => {
    if (currentIndex === -1 || submissions.length === 0) return;
    const urls = submissions.map((s) => s.image_url);
    for (const u of neighborUrls(currentIndex, urls)) {
      const img = new Image();
      img.src = u;
    }
  }, [currentIndex, submissions]);

  // ── Keyboard (spec D7) ──
  useEffect(() => {
    if (currentIndex === -1) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      switch (e.key) {
        case "ArrowRight":
          goNext();
          break;
        case "ArrowLeft":
          goPrev();
          break;
        case "Escape":
          onClose();
          break;
        case " ":
          e.preventDefault();
          setIsAutoplay((v) => !v);
          break;
        case "+":
        case "=":
          setTransform((t) => xfZoomIn(t));
          break;
        case "-":
        case "_":
          setTransform((t) => xfZoomOut(t));
          break;
        case "0":
          setTransform(INITIAL_TRANSFORM);
          showToast("🔍 Khôi phục kích thước 100%");
          break;
        default: {
          const k = e.key.toLowerCase();
          if (k === "f") {
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
            } else {
              containerRef.current?.requestFullscreen?.().catch(() => {});
            }
          } else if (k === "m") {
            setActiveFilter((f) => {
              const ids = VISUAL_FILTERS.map((x) => x.id);
              return ids[(ids.indexOf(f) + 1) % ids.length];
            });
          } else if (k === "r") {
            setTransform((t) => xfRotate(t));
          } else if (k === "h") {
            setTransform((t) => xfFlipH(t));
          } else if (k === "s") {
            setSoundOn((v) => !v);
          } else if (k === "l") {
            document.getElementById("lightbox-favorite-btn")?.click();
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentIndex, goNext, goPrev, onClose, showToast]);

  // ── Fullscreen sync (F11) ──
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // ── Slideshow autoplay (spec D4) ──
  useEffect(() => {
    if (!isAutoplay || currentIndex === -1 || submissions.length <= 1) {
      setProgress(0);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      return;
    }
    autoplayStartRef.current = Date.now();
    setProgress(0);
    progressIntervalRef.current = window.setInterval(() => {
      const pct = autoplayProgress(Date.now() - autoplayStartRef.current, autoplaySpeed);
      setProgress(pct);
      if (pct >= 100) {
        autoplayStartRef.current = Date.now();
        setProgress(0);
        goNext();
      }
    }, 100);
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [isAutoplay, currentIndex, submissions.length, autoplaySpeed, goNext]);

  // ── Copy link / download (spec D8) ──
  const shareUrl = active ? `${window.location.origin}/gallery/${active.id}` : "";

  const handleCopyLink = useCallback(() => {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => showToast("🔗 Đã sao chép liên kết tác phẩm!"))
      .catch(() => showToast("⚠️ Không thể sao chép link"));
  }, [shareUrl, showToast]);

  const handleDownload = useCallback(() => {
    if (!active) return;
    fetch(active.image_url)
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `vapor_art_${active.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${active.id.slice(0, 8)}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
        showToast("💾 Đã tải ảnh xuống!");
      })
      .catch(() => {
        window.open(active.image_url, "_blank");
        showToast("↗ Đã mở ảnh gốc trong tab mới");
      });
  }, [active, showToast]);

  const cycleFilter = useCallback(() => {
    setActiveFilter((f) => {
      const ids = VISUAL_FILTERS.map((x) => x.id);
      const nf = ids[(ids.indexOf(f) + 1) % ids.length];
      showToast(`🎨 Bộ lọc: ${nf}`);
      return nf;
    });
  }, [showToast]);

  // ── Zoom bằng wheel; pan bằng drag ──
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setTransform((t) => (e.deltaY < 0 ? xfZoomIn(t, 0.2) : xfZoomOut(t, 0.2)));
  };
  const onDragStart = (e: React.PointerEvent) => {
    if (transform.zoom <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - transform.pan.x, y: e.clientY - transform.pan.y };
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setTransform((t) =>
      xfPanTo(t, e.clientX - dragStartRef.current.x, e.clientY - dragStartRef.current.y),
    );
  };
  const onDragEnd = () => setIsDragging(false);

  const { handleTouchStart, handleTouchEnd } = useSwipe(goNext, goPrev);

  if (!active) {
    // activeId không hợp lệ (bị xoá / không tồn tại) — đóng nhẹ nhàng, không treo
    return null;
  }

  // Ngày định dạng UTC deterministic — toLocaleDateString phụ thuộc ICU/timezone
  // của runtime (SSR workerd khác Chrome) đã gây hydration mismatch #418.
  const d = new Date(active.created_at);
  const dateStr = `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;

  return ReactDOM.createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Xem tác phẩm: ${active.title || "không tên"}`}
      tabIndex={-1}
      className="fixed inset-0 bg-vapor-night/98 backdrop-blur-md flex flex-col justify-between p-1 sm:p-3 overflow-hidden font-retro text-black select-none"
      style={{ height: "100dvh", zIndex: "var(--z-index-modal, 600)" }}
    >
      <div aria-live="polite" className="sr-only">
        {toastMsg ?? ""}
      </div>
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] bg-vapor-green text-black font-mono font-bold text-xs px-4 py-2 border-2 border-black shadow-[4px_4px_0_#000] animate-[fadeIn_0.15s_ease-out] pointer-events-none flex items-center gap-2">
          <span>⚡</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Titlebar điều hướng */}
      <div className="win95-container w-full max-w-6xl mx-auto bg-win-gray flex flex-col relative">
        <div className="win95-header py-1 px-2 bg-gradient-to-r from-win-titlebar to-vapor-blue-dark flex justify-between items-center text-[10px] font-bold">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              className="win95-btn px-2 py-0.5 font-bold"
              style={{ minHeight: "24px" }}
              aria-label="Ảnh trước"
            >
              ←
            </button>
            <span className="font-mono uppercase truncate max-w-[40vw]">
              CYBER_GALLERY_PRO.EXE — [{active.title}]
            </span>
            <button
              type="button"
              onClick={goNext}
              className="win95-btn px-2 py-0.5 font-bold"
              style={{ minHeight: "24px" }}
              aria-label="Ảnh tiếp theo"
            >
              →
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="win95-btn px-2 py-0.5 font-bold"
            style={{ minHeight: "24px" }}
            aria-label="Đóng trình xem"
          >
            ✕
          </button>
        </div>
        <div className="px-2 py-0.5 bg-win-gray text-[10px] font-mono flex justify-between">
          <span>
            SUBMISSION {currentIndex + 1} / {submissions.length}
          </span>
          <span>
            {zoomPercent(transform.zoom)}% {isFullscreen ? "· FULLSCREEN" : ""}
          </span>
        </div>
        {isAutoplay && (
          <div className="h-1 bg-black" role="presentation">
            <div
              className="h-full bg-vapor-pink transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Vùng ảnh — role="presentation" wrapper; tương tác zoom/pan nằm trên
          container dialog (keyboard đã có đầy đủ ←→+−0 F M R H), vùng này chỉ là
          pointer-gesture phụ. */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden py-1"
        role="presentation"
      >
        <div
          className="relative max-w-4xl w-full"
          role="application"
          aria-label="Vùng xem ảnh — cuộn để zoom, kéo để di chuyển"
          onWheel={onWheel}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerLeave={onDragEnd}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <LazyImage
            src={active.image_url}
            alt={active.title}
            className="w-full h-auto max-h-[70vh] object-contain"
            style={{
              filter: filterCss(activeFilter),
              transform: transformToCss(transform),
              cursor: isDragging ? "grabbing" : transform.zoom > 1 ? "grab" : "default",
            }}
          />
          {(activeFilter === "crt" || activeFilter === "vhs") && (
            <div className="absolute inset-0 pointer-events-none z-40 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_4px] opacity-70" />
          )}
        </div>
      </div>

      {/* Panel thông tin + hành động */}
      <div className="win95-container max-w-6xl w-full mx-auto bg-win-gray p-2 space-y-2 max-h-[30vh] overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {active.profiles?.avatar_url ? (
              <img
                src={active.profiles.avatar_url}
                alt={active.profiles?.full_name || "Ẩn danh"}
                className="w-8 h-8 border border-win-dark object-cover shrink-0"
              />
            ) : (
              <span
                aria-hidden="true"
                className="w-8 h-8 border border-win-dark bg-win-gray flex items-center justify-center text-xs shrink-0"
              >
                👤
              </span>
            )}
            <div className="min-w-0">
              <p className="font-bold text-xs truncate">{active.title}</p>
              <p className="text-[10px] font-mono text-win-darkest truncate">
                {active.profiles?.full_name} · 📅 {dateStr}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <FavoriteButton
              submissionId={active.id}
              currentUser={currentUser}
              variant="win95"
              id="lightbox-favorite-btn"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="win95-btn px-2 py-1 text-[10px] font-bold"
              style={{ minHeight: "28px" }}
            >
              🔗 LINK
            </button>
            <button
              type="button"
              onClick={() =>
                window.open(
                  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
                  "_blank",
                )
              }
              className="win95-btn px-2 py-1 text-[10px] font-bold"
              style={{ minHeight: "28px" }}
              aria-label="Chia sẻ lên Facebook"
            >
              f
            </button>
            <button
              type="button"
              onClick={() =>
                window.open(
                  `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Khám phá tác phẩm "${active.title}" trên Lovely Yellow Cat!`)}`,
                  "_blank",
                )
              }
              className="win95-btn px-2 py-1 text-[10px] font-bold"
              style={{ minHeight: "28px" }}
              aria-label="Chia sẻ lên X"
            >
              𝕏
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="win95-btn px-2 py-1 text-[10px] font-bold"
              style={{ minHeight: "28px" }}
            >
              💾 HD
            </button>
          </div>
        </div>

        {active.description && (
          <p className="text-[10px] leading-relaxed text-win-darkest">{active.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[240px]">
            <ReactionBar articleId={active.id} currentUser={currentUser} />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={cycleFilter}
              className="win95-btn px-2 py-1 text-[10px] font-bold"
              style={{ minHeight: "28px" }}
            >
              🎨 {activeFilter.toUpperCase()}
            </button>
            <button
              type="button"
              onClick={() => setTransform((t) => xfZoomOut(t))}
              className="win95-btn px-2 py-1 text-[10px] font-bold"
              style={{ minHeight: "28px" }}
              aria-label="Thu nhỏ"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setTransform((t) => xfZoomIn(t))}
              className="win95-btn px-2 py-1 text-[10px] font-bold"
              style={{ minHeight: "28px" }}
              aria-label="Phóng to"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setTransform((t) => xfRotate(t))}
              className="win95-btn px-2 py-1 text-[10px] font-bold"
              style={{ minHeight: "28px" }}
              aria-label="Xoay 90 độ"
            >
              🔄
            </button>
            <button
              type="button"
              onClick={() => setTransform((t) => xfFlipH(t))}
              className="win95-btn px-2 py-1 text-[10px] font-bold"
              style={{ minHeight: "28px" }}
              aria-label="Lật ngang"
            >
              🪞
            </button>
            <button
              type="button"
              onClick={() => {
                if (transform.zoom > 1.2) {
                  setTransform(INITIAL_TRANSFORM);
                  showToast("🔍 Vừa khung (Fit)");
                } else {
                  setTransform((t) => xfZoomTo(t, 2.2));
                  showToast("🔍 Phóng to chi tiết 220%");
                }
              }}
              className="win95-btn px-2 py-1 text-[10px] font-bold"
              style={{ minHeight: "28px" }}
            >
              🔍 FIT/220%
            </button>
            <button
              type="button"
              onClick={() => setIsAutoplay((v) => !v)}
              className={`win95-btn px-2 py-1 text-[10px] font-bold ${isAutoplay ? "win95-sunken bg-vapor-pink/25" : ""}`}
              style={{ minHeight: "28px" }}
              aria-pressed={isAutoplay}
            >
              {isAutoplay ? "⏸ DỪNG" : "▶ SLIDESHOW"}
            </button>
            <select
              value={autoplaySpeed}
              onChange={(e) => setAutoplaySpeed(Number(e.target.value))}
              className="win95-sunken bg-white border border-win-dark text-[10px] font-bold px-1"
              style={{ minHeight: "28px" }}
              aria-label="Tốc độ slideshow"
            >
              <option value={3000}>3s</option>
              <option value={5000}>5s</option>
              <option value={8000}>8s</option>
              <option value={10000}>10s</option>
            </select>
          </div>
        </div>

        {/* Filmstrip */}
        <div
          ref={filmstripRef}
          className="flex gap-1 overflow-x-auto py-1"
          role="listbox"
          aria-label="Danh sách tác phẩm"
        >
          {submissions.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="option"
              aria-selected={i === currentIndex}
              onClick={() => onNavigate(s.id)}
              className={`shrink-0 w-16 h-12 border-2 ${i === currentIndex ? "border-vapor-pink" : "border-win-dark"} bg-black overflow-hidden`}
            >
              <img
                src={s.image_url}
                alt={s.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
};
