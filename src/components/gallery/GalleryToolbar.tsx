// GalleryToolbar.tsx — search + tag filter + sort. Presentational: nhận state
// và callback từ Grid, không own state (tránh hai nguồn chân lý).
import React from "react";
import { ALL_TAGS_LABEL, collectTags, type GalleryItem, type SortMode } from "./galleryQuery";

export interface GalleryToolbarProps {
  items: GalleryItem[];
  selectedTag: string;
  searchQuery: string;
  sortBy: SortMode;
  searchInputId: string;
  onSelectTag: (tag: string) => void;
  onSearch: (query: string) => void;
  onSort: (mode: SortMode) => void;
}

const SORT_LABEL: Record<SortMode, string> = {
  newest: "💾 Mới Nhất",
  reactions: "💜 Yêu Thích",
  random: "🎰 Ngẫu Nhiên",
};

export const GalleryToolbar: React.FC<GalleryToolbarProps> = ({
  items,
  selectedTag,
  searchQuery,
  sortBy,
  searchInputId,
  onSelectTag,
  onSearch,
  onSort,
}) => {
  const tags = [ALL_TAGS_LABEL, ...collectTags(items)];

  return (
    <div className="flex flex-col md:flex-row gap-3 mb-4 items-start md:items-center">
      <div className="flex flex-col gap-1 w-full md:w-64 shrink-0">
        <label
          htmlFor={searchInputId}
          className="text-[10px] text-win-darkest font-bold uppercase tracking-wider"
        >
          🔎 TÌM KIẾM
        </label>
        <input
          id={searchInputId}
          type="search"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Tên tác phẩm, nghệ sĩ..."
          className="win95-sunken bg-white px-2 py-1 text-xs font-retro text-black border border-win-dark focus:outline-none focus:ring-1 focus:ring-vapor-pink"
          style={{ minHeight: "28px" }}
        />
      </div>

      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <span className="text-[10px] text-win-darkest font-bold uppercase tracking-wider">
          🏷️ NHÃN
        </span>
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onSelectTag(tag)}
              className={`win95-btn px-2.5 py-1 text-[10px] uppercase font-bold ${
                selectedTag === tag
                  ? "win95-sunken bg-vapor-pink/25 font-extrabold text-black"
                  : "bg-win-gray"
              }`}
              style={{ minHeight: "28px" }}
            >
              {tag === ALL_TAGS_LABEL ? "📁 Tất Cả" : `#${tag}`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1 shrink-0">
        <span className="text-[10px] text-win-darkest font-bold uppercase tracking-wider">
          ⚡ SẮP XẾP:
        </span>
        <div className="flex gap-1">
          {(Object.keys(SORT_LABEL) as SortMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onSort(mode)}
              className={`win95-btn px-2.5 py-1 text-[10px] uppercase font-bold ${
                sortBy === mode ? "win95-sunken bg-vapor-blue/25 font-extrabold" : "bg-win-gray"
              }`}
              style={{ minHeight: "28px" }}
            >
              {SORT_LABEL[mode]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
