// GalleryCard.tsx — card masonry gallery. Bài học từ bug cũ: card từng là
// div[role=button] có onClick, trong đó lồng một FavoriteButton (<button>) —
// hệ thống tự động hoá/AT mapping đôi khi rơi vào nút con => URL đổi nhưng
// không mở viewer, hoặc ngược lại. Kiến trúc mới: toàn card là MỘT thẻ <a>
// duy nhất (native link, keyboard/middle-click/modifier miễn phí), nút
// favorite là SIBLING tuyệt đối bên ngoài <a>. Không handler trùng, không
// interactive lồng nhau, không stopPropagation.
import React from "react";
import { FavoriteButton } from "../FavoriteButton";
import { LazyImage } from "../LazyImage";

export interface GalleryCardProps {
  id: string;
  title: string;
  imageUrl: string;
  authorName: string;
  authorAvatar: string | null;
  reactionCount: number;
  isFavoritesOnly?: boolean;
  currentUser: { id: string } | null;
  /** Gọi khi click trái không modifier — Grid sẽ push URL ?view=<id> và mở lightbox. */
  onOpen: (id: string) => void;
  /** Favorites-only mode: bỏ item khỏi danh sách khi un-favorite. */
  onUnfavorite?: (id: string) => void;
}

export const GalleryCard: React.FC<GalleryCardProps> = ({
  id,
  title,
  imageUrl,
  authorName,
  authorAvatar,
  reactionCount,
  isFavoritesOnly = false,
  currentUser,
  onOpen,
  onUnfavorite,
}) => (
  <article className="break-inside-avoid win95-container bg-win-gray p-1 flex flex-col group hover:border-vapor-pink hover:shadow-[0_0_15px_rgba(255,113,206,0.6)] transition-all duration-200 relative">
    {/*
      Link toàn card. Href tĩnh ?view=<id> => SEO/copy-link/scraper hiểu;
      click trái thường được intercept để mở lightbox không reload.
      Ctrl/Cmd/Shift/Alt click + middle click + touch-hold => để browser tự xử lý.
    */}
    <a
      href={`?view=${encodeURIComponent(id)}`}
      aria-label={`Xem tác phẩm: ${title}`}
      onClick={(event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return; // giữ hành vi browser mặc định (tab mới, save link...)
        }
        event.preventDefault();
        onOpen(id);
      }}
      className="block w-full cursor-pointer no-underline text-inherit"
    >
      <div className="win95-header py-0.5 px-2 bg-gradient-to-r from-win-titlebar to-vapor-blue-dark text-[10px] flex justify-between items-center">
        <span className="truncate max-w-[70%] font-bold uppercase">{title}</span>
        <span className="text-[10px] opacity-80 font-mono">ART_VIEW.DLL</span>
      </div>

      <div className="relative bg-cosmic-mid/10 overflow-hidden aspect-auto min-h-[160px] max-h-[420px] border border-win-dark flex items-center justify-center">
        <LazyImage
          src={imageUrl}
          alt={title}
          className="w-full h-auto max-h-full object-cover filter saturate-[1.1] contrast-[1.03] sm:group-hover:scale-[1.02] transition-transform duration-300"
          width="480"
          height="360"
        />
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_4px] pointer-events-none" />
      </div>

      <div className="p-2 bg-web-gray-dark flex justify-between items-center text-[10px]">
        <div className="flex items-center gap-1.5 min-w-0">
          <img
            src={
              authorAvatar ||
              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50&auto=format&fit=crop"
            }
            alt={authorName}
            className="w-5 h-5 border border-win-dark object-cover filter saturate-150 shrink-0"
          />
          <span className="truncate text-black font-bold">{authorName}</span>
        </div>
        <div className="flex gap-2 text-win-darkest font-mono font-bold shrink-0">
          <span>💜 {reactionCount}</span>
        </div>
      </div>
    </a>

    {/* Favorite là SIBLING của <a>, không lồng vào trong — bắt mọi regression
        kiểu "click card nhưng lại kích nút tim" bằng chính cấu trúc DOM. */}
    <div className="absolute top-8 right-2 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
      <FavoriteButton
        submissionId={id}
        currentUser={currentUser}
        variant="icon"
        initialIsFavorited={isFavoritesOnly ? true : undefined}
        onToggle={(isFav) => {
          if (isFavoritesOnly && !isFav) onUnfavorite?.(id);
        }}
      />
    </div>
  </article>
);
