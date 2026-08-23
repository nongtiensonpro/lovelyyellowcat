import React, { useEffect, useState } from "react";

interface Props {
  articleId: string;
  isLoggedIn?: boolean;
}

export const BookmarkButton: React.FC<Props> = ({ articleId, isLoggedIn = false }) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    fetch(`/api/bookmarks?articleId=${encodeURIComponent(articleId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setIsBookmarked(Boolean(data?.bookmarked));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [articleId, isLoggedIn]);

  const handleToggle = async () => {
    if (!isLoggedIn) {
      alert("Bạn cần đăng nhập bằng Google để lưu bài viết nhé! 🐱🔑");
      return;
    }
    setIsBusy(true);
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId }),
      });
      const data = await res.json();
      if (data.success) {
        setIsBookmarked(Boolean(data.bookmarked));
      }
    } catch {
      // Bỏ qua lỗi mạng — nút giữ trạng thái cũ
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isBusy}
      aria-pressed={isBookmarked}
      aria-label={isBookmarked ? "Bỏ lưu bài viết" : "Lưu bài viết để đọc sau"}
      title={isBookmarked ? "Bấm để bỏ lưu" : "Lưu bài viết để đọc sau (/bookmarks)"}
      className="win95-btn text-black px-3 py-1.5 font-bold"
      style={{ minHeight: 32 }}
    >
      {isBookmarked ? "📑 ĐÃ LƯU" : "🔖 LƯU BÀI"}
    </button>
  );
};
