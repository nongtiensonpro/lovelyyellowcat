// useGalleryUrl.ts — nguồn chân lý URL cho tham số ?view=<submission-id>.
// Mọi thay đổi trạng thái "đang xem tác phẩm nào" phải đi qua module này để URL,
// history và state React không bao giờ lệch nhau (gốc của bug deep-link cũ:
// nhiều nơi tự ghi URL bằng pushState/replaceState rải rác).
import { useCallback, useEffect, useState } from "react";

export const VIEW_PARAM = "view";

/** Đọc id đang xem từ URL hiện tại. SSR-safe: trả null khi không có window. */
export function readViewFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(VIEW_PARAM);
}

function writeView(id: string | null, method: "push" | "replace"): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (id) {
    url.searchParams.set(VIEW_PARAM, id);
  } else {
    url.searchParams.delete(VIEW_PARAM);
  }
  if (method === "push") {
    window.history.pushState(null, "", url.toString());
  } else {
    window.history.replaceState(null, "", url.toString());
  }
}

/** Mở lightbox cho id: ghi ?view=<id> vào history (shareable, Back quay lại được). */
export function pushView(id: string): void {
  writeView(id, "push");
}

/** Đồng bộ URL khi lightbox tự điều hướng (next/prev) — không tạo entry history rác. */
export function replaceView(id: string): void {
  writeView(id, "replace");
}

/** Đóng lightbox: xoá tham số bằng replace để Back quay về trang trước thật. */
export function clearView(): void {
  writeView(null, "replace");
}

/**
 * Hook: viewId state luôn mirror URL.
 * - Khởi tạo từ URL hiện tại => deep-link hoạt động ngay từ render đầu.
 * - Lắng nghe popstate (Back/Forward) và đồng bộ lại.
 * - open/replace/close vừa ghi URL vừa set state trong một thao tác => không lệch pha.
 */
export function useGalleryViewParam(): [
  string | null,
  (id: string) => void,
  () => void,
  (id: string) => void,
] {
  const [viewId, setViewId] = useState<string | null>(() => readViewFromUrl());

  useEffect(() => {
    const sync = () => setViewId(readViewFromUrl());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const open = useCallback((id: string) => {
    pushView(id);
    setViewId(id);
  }, []);

  const replace = useCallback((id: string) => {
    replaceView(id);
    setViewId(id);
  }, []);

  const close = useCallback(() => {
    clearView();
    setViewId(null);
  }, []);

  return [viewId, open, close, replace];
}
