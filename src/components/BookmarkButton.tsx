import React, { useEffect, useState } from "react";
import { RetroButton } from "../ui/kernel/RetroButton";
import { uiAlert } from "../ui/wm95/dialogService";

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
      // v5: thay alert() native bằng dialogService Win95 (ADR-0002)
      uiAlert("Bạn cần đăng nhập bằng Google để lưu bài viết nhé! \u{1F431}\u{1F511}", "bookmark-login");
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
    <RetroButton
      onClick={handleToggle}
      busy={isBusy}
      aria-pressed={isBookmarked}
      aria-label={isBookmarked ? "Bỏ lưu bài viết" : "Lưu bài viết để đọc sau"}
      title={isBookmarked ? "Bấm để bỏ lưu" : "Lưu bài viết để đọc sau (/bookmarks)"}
    >
      {isBookmarked ? "\u{1F4D1} ĐÃ LƯU" : "\u{1F516} LƯU BÀI"}
    </RetroButton>
  );
};
