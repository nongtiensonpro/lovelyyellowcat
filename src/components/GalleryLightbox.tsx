// GalleryLightbox.tsx — trình xem ảnh toàn màn hình. v5.4 "Full Frame
// Experience" (01/09/2026), dựng lại từ nền v5.3.
// Nguyên tắc giữ nguyên từ bản rebuild:
//   1. Index hiển thị LUÔN resolve từ prop activeId (single source of truth là
//      URL) — không cache index.
//   2. Logic math/navigation/filter nằm trong gallery/*.ts (pure, unit-tested).
//   3. Đóng = xóa ?view bằng replaceState; chuyển ảnh = replaceState.
//   4. Dialog chuẩn ARIA + focus trap + phím tắt đầy đủ.
// Mới v5.4:
//   - ZEN MODE (phím Z / nút ⛶): ảnh tràn toàn khung 100dvh, UI Win95 tự ẩn,
//     hiện lại khi di chuột lên mép trên/dưới. Lớp ảnh bỏ khung max-w.
//   - HOLD-TO-COMPARE (phím C giữ): tạm về filter Gốc để so sánh, thả ra trả lại.
//   - HELP OVERLAY (phím ?): bảng phím tắt Win95.
//   - COPY IMAGE (phím C tap... dùng K): canvas → clipboard.
//   - SHARE URL dùng chính ?view= hiện tại (deep-link copy khớp URL thật).
//   - Thumb counter trên filmstrip; reduced-motion aware.
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

/** Âm thanh retro nhẹ, respect autoplay policy + sound toggle. */
function playRetroClick(freq = 600, duration = 0.04, enabled = true): void {
  if (!enabled) return;
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

/** prefers-reduced-motion — tắt animation trang trí. SSR/jsdom-safe. */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  } catch {
    return false;
  }
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
  // v5.4 states
  const [isZen, setIsZen] = useState(false); // Full Frame mode
  const [uiPeek, setUiPeek] = useState(false); // UI hiện lại tạm khi rê chuột mép
  const [isComparing, setIsComparing] = useState(false); // hold-to-compare
  const [showHelp, setShowHelp] = useState(false); // help overlay
  const [copiedImg, setCopiedImg] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const autoplayStartRef = useRef<number>(0);
  const toastTimeoutRef = useRef<number | null>(null);

  // ── Resolve index TỪ activeId mỗi render ──
  const currentIndex = activeId ? submissions.findIndex((s) => s.id === activeId) : -1;
  const active = currentIndex >= 0 ? submissions[currentIndex] : null;

  // Escape layering: focus trap (capture, document) chạy TRƯ�C window listener.
  // Trao wrapper cho trap để Esc lần lượt: đóng help -> thoát zen -> đóng lightbox
  // (nếu trao onClose thẳng, trap sẽ đóng lightbox bất chấp zen/help đang mở).
  const handleEscapeLayered = useCallback(() => {
    if (showHelp) setShowHelp(false);
    else if (isZen) setIsZen(false);
    else onClose();
  }, [showHelp, isZen, onClose]);
  useFocusTrap(containerRef, true, handleEscapeLayered);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMsg(msg);
    toastTimeoutRef.current = window.setTimeout(() => setToastMsg(null), 2500);
  }, []);

  // Thông báo mỗi khi đổi ảnh
  const activeTitle = active?.title ?? null;
  useEffect(() => {
    if (activeTitle !== null) showToast(`Đang xem: ${activeTitle}`);
  }, [activeTitle, showToast]);

  const goNext = useCallback(() => {
    if (submissions.length === 0) return;
    const target = submissions[nextIndex(currentIndex, submissions.length)];
    if (target && target.id !== activeId) {
      if (soundOn) playRetroClick(750, 0.03, true);
      onNavigate(target.id);
    }
  }, [submissions, currentIndex, activeId, onNavigate, soundOn]);

  const goPrev = useCallback(() => {
    if (submissions.length === 0) return;
    const target = submissions[prevIndex(currentIndex, submissions.length)];
    if (target && target.id !== activeId) {
      if (soundOn) playRetroClick(550, 0.03, true);
      onNavigate(target.id);
    }
  }, [submissions, currentIndex, activeId, onNavigate, soundOn]);

  // Reset transform + thoát compare khi đổi ảnh
  useEffect(() => {
    setTransform(INITIAL_TRANSFORM);
    setIsComparing(false);
  }, [activeId]);

  // Zen mode reset UI peek khi thoát
  useEffect(() => {
    if (!isZen) setUiPeek(false);
  }, [isZen]);

  // Filmstrip auto-scroll
  useEffect(() => {
    if (filmstripRef.current && currentIndex >= 0) {
      const thumb = filmstripRef.current.children[currentIndex] as HTMLElement | undefined;
      thumb?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [currentIndex]);

  // Preload ảnh kề
  useEffect(() => {
    if (currentIndex === -1 || submissions.length === 0) return;
    const urls = submissions.map((s) => s.image_url);
    for (const u of neighborUrls(currentIndex, urls)) {
      const img = new Image();
      img.src = u;
    }
  }, [currentIndex, submissions]);

  // ── Keyboard (mở rộng v5.4) ──
  useEffect(() => {
    if (currentIndex === -1) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      switch (e.key) {
        case "ArrowRight":
          goNext();
          break;
        case "ArrowLeft":
          goPrev();
          break;
        case "Escape":
          // Zen → thoát Zen trước, help → đóng help, cuối cùng mới đóng lightbox
          if (showHelp) setShowHelp(false);
          else if (isZen) setIsZen(false);
          else onClose();
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
        case "?":
          setShowHelp((v) => !v);
          break;
        default: {
          const k = e.key.toLowerCase();
          if (k === "f") {
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
            } else {
              containerRef.current?.requestFullscreen?.().catch(() => {});
            }
          } else if (k === "z") {
            // Full Frame / Zen mode
            setIsZen((v) => {
              showToast(
                !v
                  ? "⛶ CHẾ ĐỘ TOÀN KHUNG BẬT — rê chuột vào mép để hiện UI, Z/Esc để thoát"
                  : "🗖 Đã thoát chế độ toàn khung",
              );
              return !v;
            });
          } else if (k === "c") {
            // Hold-to-compare: giữ C xem ảnh gốc
            if (!e.repeat) showToast("👁 Đang xem GỐC (giữ C) — thả để quay lại bộ lọc");
            setIsComparing(true);
          } else if (k === "k") {
            copyImageToClipboard();
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
            setSoundOn((v) => {
              showToast(v ? "🔇 Âm thanh TẮT" : "🔊 Âm thanh BẬT");
              return !v;
            });
          } else if (k === "l") {
            document.getElementById("lightbox-favorite-btn")?.click();
          }
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "c") setIsComparing(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
    // copyImageToClipboard ổn định qua ref — xem bên dưới
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, goNext, goPrev, onClose, showToast, showHelp, isZen]);

  // ── Fullscreen sync (F11) ──
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // ── Slideshow autoplay ──
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

  // ── Share URL: dùng ?view= hiện tại (deep-link thật) ──
  const shareUrl = active
    ? `${window.location.origin}/gallery?view=${encodeURIComponent(active.id)}`
    : "";

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

  // ── Copy ảnh vào clipboard (Canvas) ──
  const copyImageToClipboard = useCallback(() => {
    if (!active) return;
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = active.image_url;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(async (blob) => {
          if (blob && navigator.clipboard && "write" in navigator.clipboard) {
            try {
              await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
              setCopiedImg(true);
              showToast("📋 Đã sao chép ảnh vào Clipboard!");
              window.setTimeout(() => setCopiedImg(false), 2000);
            } catch {
              handleCopyLink();
            }
          } else {
            handleCopyLink();
          }
        }, "image/png");
      };
      img.onerror = () => handleCopyLink();
    } catch {
      handleCopyLink();
    }
  }, [active, showToast, handleCopyLink]);

  const cycleFilter = useCallback(() => {
    setActiveFilter((f) => {
      const ids = VISUAL_FILTERS.map((x) => x.id);
      const nf = ids[(ids.indexOf(f) + 1) % ids.length];
      showToast(`🎨 Bộ lọc: ${nf}`);
      return nf;
    });
  }, [showToast]);

  // ── Zoom wheel; pan pointer drag ──
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

  // UI peek chỉ hoạt động trong Zen: rê chuột lên 60px mép trên hoặc 80px mép dưới
  const onMouseMoveRoot = (e: React.MouseEvent) => {
    if (!isZen) return;
    const nearEdge = e.clientY <= 60 || e.clientY >= window.innerHeight - 80;
    setUiPeek(nearEdge);
  };

  if (!active) return null;

  const dateStr = (() => {
    const dt = new Date(active.created_at);
    return `${String(dt.getUTCDate()).padStart(2, "0")}/${String(dt.getUTCMonth() + 1).padStart(2, "0")}/${dt.getUTCFullYear()}`;
  })();

  const effectiveFilter: VisualFilter = isComparing ? "normal" : activeFilter;
  const chromeHidden = isZen && !uiPeek; // ẩn UI khi zen không peek
  const reducedMotion = prefersReducedMotion();

  return ReactDOM.createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Xem tác phẩm: ${active.title || "không tên"}`}
      tabIndex={-1}
      onMouseMove={onMouseMoveRoot}
      className="fixed inset-0 bg-vapor-night/98 backdrop-blur-md flex flex-col justify-between overflow-hidden font-retro text-black select-none"
      style={{
        height: "100dvh",
        zIndex: "var(--z-index-modal, 600)",
        padding: chromeHidden ? 0 : undefined,
      }}
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

      {/* ═══ TITLEBAR — thu thành floating pill khi zen, ẩn khi chromeHidden ═══ */}
      <div
        className={`transition-all duration-300 ${chromeHidden ? "opacity-0 -translate-y-full pointer-events-none h-0 overflow-hidden" : isZen ? "absolute top-2 left-1/2 -translate-x-1/2 w-[92%] z-50 shadow-[0_4px_20px_rgba(0,0,0,0.6)]" : "relative w-full"}`}
        aria-hidden={chromeHidden}
      >
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
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsZen(true)}
                className={`win95-btn px-2 py-0.5 font-bold ${isZen ? "win95-sunken bg-vapor-blue/25" : ""}`}
                style={{ minHeight: "24px" }}
                aria-label="Bật chế độ toàn khung (phím Z)"
                aria-pressed={isZen}
                title="Toàn khung (Z)"
              >
                ⛶
              </button>
              <button
                type="button"
                onClick={() => setShowHelp((v) => !v)}
                className="win95-btn px-2 py-0.5 font-bold"
                style={{ minHeight: "24px" }}
                aria-label="Bảng phím tắt (phím ?)"
                aria-pressed={showHelp}
                title="Phím tắt (?)"
              >
                ?
              </button>
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
          </div>
          <div className="px-2 py-0.5 bg-win-gray text-[10px] font-mono flex justify-between">
            <span>
              SUBMISSION {currentIndex + 1} / {submissions.length}
            </span>
            <span>
              {zoomPercent(transform.zoom)}% {isFullscreen ? "· FULLSCREEN" : ""}{" "}
              {isZen ? "· ZEN" : ""}
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
      </div>

      {/* ═══ VÙNG ẢNH — full frame: bỏ max-w khi zen ═══ */}
      <div
        className={`flex-1 flex items-center justify-center overflow-hidden ${chromeHidden ? "p-0" : "py-1"}`}
        role="presentation"
      >
        <div
          className={`relative ${isZen ? "w-full h-full" : "max-w-4xl w-full"}`}
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
            className={
              isZen ? "w-full h-full object-contain" : "w-full h-auto max-h-[70vh] object-contain"
            }
            style={{
              filter: filterCss(effectiveFilter),
              transform: transformToCss(transform),
              cursor: isDragging ? "grabbing" : transform.zoom > 1 ? "grab" : "default",
              transition: reducedMotion ? "none" : undefined,
            }}
          />
          {(effectiveFilter === "crt" || effectiveFilter === "vhs") && (
            <div className="absolute inset-0 pointer-events-none z-40 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_4px] opacity-70" />
          )}
          {/* Badge compare đang giữ */}
          {isComparing && (
            <div className="absolute top-2 left-2 z-50 bg-black/80 text-vapor-green font-mono text-[10px] font-bold px-2 py-1 border border-vapor-green pointer-events-none">
              👁 GỐC (ORIGINAL)
            </div>
          )}
        </div>
      </div>

      {/* Zen: pill nhắc thoát khi UI ẩn */}
      {chromeHidden && (
        <button
          type="button"
          onClick={() => setIsZen(false)}
          className="absolute bottom-3 right-3 z-50 bg-black/70 text-white font-mono text-[10px] px-3 py-1.5 border border-win-dark opacity-40 hover:opacity-100 transition-opacity"
          style={{ minHeight: "28px", minWidth: "28px" }}
          aria-label="Thoát chế độ toàn khung"
        >
          ⛶ Thoát toàn khung (Z)
        </button>
      )}

      {/* ═══ HELP OVERLAY — bảng phím tắt Win95 ═══ */}
      {showHelp && (
        <div className="absolute inset-0 z-[99998] bg-black/70 flex items-center justify-center p-4">
          <div
            className="win95-container bg-win-gray w-full max-w-md"
            role="dialog"
            aria-label="Bảng phím tắt"
          >
            <div className="win95-header py-1 px-2 bg-gradient-to-r from-win-titlebar to-vapor-blue-dark flex justify-between items-center">
              <span className="font-bold text-xs">KEYBOARD_SHORTCUTS.HLP</span>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="win95-btn px-1.5 py-0 font-bold"
                aria-label="Đóng bảng phím tắt"
              >
                ✕
              </button>
            </div>
            <div className="p-3 bg-win-gray text-[11px] font-mono grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-black">
              {[
                ["← / →", "Ảnh trước / tiếp theo"],
                ["Esc", "Đóng (Zen → thoát Zen trước)"],
                ["Z", "Toàn khung (Full Frame)"],
                ["F", "Fullscreen API trình duyệt"],
                ["Space", "Bật/tắt Slideshow"],
                ["+ / − / 0", "Zoom in / out / về 100%"],
                ["M", "Đổi bộ lọc hiệu ứng"],
                ["C (giữ)", "So sánh nhanh với ảnh Gốc"],
                ["K", "Copy ảnh vào Clipboard"],
                ["R / H", "Xoay 90° / Lật ngang"],
                ["S", "Bật/tắt âm thanh"],
                ["L", "Lưu yêu thích"],
                ["?", "Bảng phím tắt này"],
              ].map(([key, desc]) => (
                <React.Fragment key={key}>
                  <kbd className="win95-sunken bg-white px-1.5 border border-win-dark font-bold whitespace-nowrap">
                    {key}
                  </kbd>
                  <span>{desc}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ PANEL THÔNG TIN + HÀNH ĐỘNG — ẩn trong zen (trừ peek) ═══ */}
      <div
        className={`win95-container max-w-6xl w-full mx-auto bg-win-gray p-2 space-y-2 max-h-[30vh] overflow-y-auto transition-all duration-300 ${chromeHidden ? "opacity-0 translate-y-full pointer-events-none h-0 overflow-hidden" : ""} ${isZen && !chromeHidden ? "absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.6)]" : ""}`}
        aria-hidden={chromeHidden}
      >
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
              onClick={copyImageToClipboard}
              className="win95-btn px-2 py-1 text-[10px] font-bold"
              style={{ minHeight: "28px" }}
              aria-label="Copy ảnh vào clipboard (phím K)"
            >
              {copiedImg ? "✅" : "📋"}
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
            {/* Hold-to-compare button: pointerdown = so sánh, pointerup = thả */}
            <button
              type="button"
              onPointerDown={() => setIsComparing(true)}
              onPointerUp={() => setIsComparing(false)}
              onPointerLeave={() => setIsComparing(false)}
              className={`win95-btn px-2 py-1 text-[10px] font-bold ${isComparing ? "win95-sunken bg-vapor-green/30" : ""}`}
              style={{ minHeight: "28px" }}
              aria-pressed={isComparing}
              aria-label="Giữ để so sánh với ảnh gốc (phím C)"
              title="Giữ để so sánh ảnh Gốc (C)"
            >
              👁 SO SÁNH
            </button>
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

        {/* Filmstrip — thumb active có ring + số thứ tự */}
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
              className={`relative shrink-0 w-16 h-12 border-2 ${i === currentIndex ? "border-vapor-pink shadow-[0_0_8px_rgba(255,113,206,0.8)]" : "border-win-dark"} bg-black overflow-hidden`}
            >
              <img
                src={s.image_url}
                alt={s.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {i === currentIndex && (
                <span className="absolute bottom-0 right-0 bg-vapor-pink text-black text-[9px] font-bold px-0.5 leading-tight">
                  {i + 1}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
};
