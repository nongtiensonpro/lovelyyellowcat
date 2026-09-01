// @vitest-environment jsdom
// Regression cho bản dựng lại Gallery (01/09/2026). Bắt đúng các bug đã gặp:
// 1) click card mở viewer đúng artwork theo id (không rơi vào nút favorite);
// 2) deep-link ?view=<id thứ 2> hiển thị artwork thứ 2, KHÔNG fallback item đầu;
// 3) đóng lightbox xóa ?view khỏi URL;
// 4) lightbox next/prev điều hướng đúng wrap-around và thay đổi URL.
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const itemA = {
  id: "4411e057-d039-4acb-82b4-3c6cd03733fa",
  title: "[VAPOR_EXPEDITION] :: Cyber_Pyramid_Oasis.raw",
  description: "",
  tags: [] as string[],
  image_url: "https://res.cloudinary.com/demo/image/upload/a.png",
  author_id: "author-1",
  created_at: "2026-08-31T00:00:00Z",
  profiles: { full_name: "Tester A", avatar_url: "" },
};
const itemB = {
  id: "57ef4a70-9aa8-4690-a0a9-6a94b62903f6",
  title: "[VAPOR_VN] :: Halong_Digital_Nostalgia.bmp",
  description: "",
  tags: [] as string[],
  image_url: "https://res.cloudinary.com/demo/image/upload/b.png",
  author_id: "author-1",
  created_at: "2026-08-30T00:00:00Z",
  profiles: { full_name: "Tester B", avatar_url: "" },
};

// Mock trả về đúng shape chuỗi .from().select().eq().order() của Grid;
// data giống initialSubmissions để effect refetch không xoá grid trong test.
vi.mock("../../src/lib/supabaseBrowser", () => ({
  getSupabaseBrowserClient: () => ({
    from: (table: string) => {
      if (table === "reactions") {
        return { select: () => Promise.resolve({ data: [], error: null }) };
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [itemA, itemB], error: null }),
          }),
        }),
      };
    },
    channel: () => {
      const c = { on: () => c, subscribe: () => c };
      return c;
    },
    removeChannel: vi.fn(),
  }),
}));

vi.mock("../../src/ui/kernel/ErrorBoundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock LazyImage vẫn truyền style (filter/transform) xuống img để test filter chain
vi.mock("../../src/components/LazyImage", () => ({
  LazyImage: ({ src, alt, style }: { src: string; alt: string; style?: React.CSSProperties }) => (
    <img src={src} alt={alt} style={style} />
  ),
}));

vi.mock("../../src/components/FavoriteButton", () => ({
  FavoriteButton: ({ submissionId }: { submissionId: string }) => (
    <button type="button" aria-label="Thêm vào danh sách yêu thích" data-fav-for={submissionId}>
      🤍
    </button>
  ),
}));

vi.mock("../../src/components/ReactionBar", () => ({
  ReactionBar: () => <div data-testid="reaction-bar" />,
}));

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.history.replaceState(null, "", "/gallery");
  // jsdom chưa có matchMedia — stub cho prefers-reduced-motion check
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string): Pick<MediaQueryList, "matches" | "media"> => ({
      matches: false,
      media: query,
    }),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Render GalleryGrid với jsdom IntersectionObserver + scrollIntoView stub. */
async function renderGrid(initialSubmissions = [itemA, itemB]) {
  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    writable: true,
    value: class {
      observe() {}
      disconnect() {}
    },
  });
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {};

  const { GalleryGrid } = await import("../../src/components/GalleryGrid");
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(React.createElement(GalleryGrid, { initialSubmissions, currentUser: null }));
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
  return { root, container };
}

describe("Gallery rebuild — URL/viewport đồng bộ", () => {
  it("click card mở lightbox đúng artwork, URL đổi theo, favorite là sibling", async () => {
    const { root, container } = await renderGrid();
    try {
      const link = container.querySelector<HTMLAnchorElement>(
        'a[aria-label^="Xem tác phẩm: [VAPOR_VN]"]',
      );
      expect(link).toBeTruthy();
      expect(link?.getAttribute("href")).toBe(`?view=${itemB.id}`);

      // favorite KHÔNG nằm trong <a> (bài học từ bug cũ)
      const fav = container.querySelector('button[aria-label="Thêm vào danh sách yêu thích"]');
      expect(fav?.closest("a")).toBeNull();

      // Click card B (tác phẩm thứ 2)
      await act(async () => {
        link
          ?.querySelector("img")
          ?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
      });

      // Lightbox render qua createPortal vào document.body (không nằm trong container)
      const dialog = document.body.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
      expect(dialog?.getAttribute("aria-label")).toContain("Halong_Digital_Nostalgia");
      expect(window.location.search).toBe(`?view=${itemB.id}`);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("deep-link ?view=<id B> hiển thị B ngay, không fallback về item đầu", async () => {
    window.history.replaceState(null, "", `/gallery?view=${itemB.id}`);
    const { root, container } = await renderGrid();
    try {
      const dialog = document.body.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
      expect(dialog?.getAttribute("aria-label")).toContain("Halong_Digital_Nostalgia");
      expect(dialog?.getAttribute("aria-label")).not.toContain("Cyber_Pyramid_Oasis");
    } finally {
      await act(async () => root.unmount());
      container.remove();
      window.history.replaceState(null, "", "/gallery");
    }
  });

  it("đóng lightbox xóa ?view khỏi URL", async () => {
    const { root, container } = await renderGrid();
    try {
      await act(async () => {
        container
          .querySelector<HTMLAnchorElement>('a[aria-label^="Xem tác phẩm: [VAPOR_EXPEDITION]"]')
          ?.querySelector("img")
          ?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
      });
      expect(window.location.search).toBe(`?view=${itemA.id}`);

      const closeBtn = document.body.querySelector<HTMLButtonElement>(
        '[role="dialog"] button[aria-label="Đóng trình xem"]',
      );
      await act(async () => {
        closeBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      });

      expect(window.location.search).toBe("");
      expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("phím ArrowRight trong lightbox chuyển sang artwork kế và update URL", async () => {
    window.history.replaceState(null, "", `/gallery?view=${itemA.id}`);
    const { root, container } = await renderGrid();
    try {
      const dialog = document.body.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();

      await act(async () => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      });

      // wrap-around processed newest-first: A(0) next -> B(1)
      expect(window.location.search).toBe(`?view=${itemB.id}`);
      const after = document.body.querySelector('[role="dialog"]');
      expect(after?.getAttribute("aria-label")).toContain("Halong_Digital_Nostalgia");
    } finally {
      await act(async () => root.unmount());
      container.remove();
      window.history.replaceState(null, "", "/gallery");
    }
  });

  it("phím Z bật Zen mode: ẩn panel, thoát bằng Esc trả UI lại", async () => {
    window.history.replaceState(null, "", `/gallery?view=${itemA.id}`);
    const { root, container } = await renderGrid();
    try {
      const dialog = document.body.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();

      // Bật Zen
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", bubbles: true }));
      });
      const zenBtn = document.body.querySelector<HTMLButtonElement>(
        '[aria-label^="Thoát chế độ toàn khung"]',
      );
      expect(zenBtn).toBeTruthy(); // pill thoát hiện ra khi UI ẩn
      // Panel hành động bị ẩn (opacity-0 + pointer-events-none)
      const panel = document.body.querySelector<HTMLElement>('[aria-hidden="true"]');
      expect(panel).toBeTruthy();

      // Esc thoát Zen (không đóng lightbox)
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      });
      expect(window.location.search).toBe(`?view=${itemA.id}`); // lightbox vẫn mở
      expect(document.body.querySelector('[role="dialog"]')).toBeTruthy();
    } finally {
      await act(async () => root.unmount());
      container.remove();
      window.history.replaceState(null, "", "/gallery");
    }
  });

  it("giữ phím C so sánh: ảnh về filter Gốc, thả trả lại filter đã chọn", async () => {
    window.history.replaceState(null, "", `/gallery?view=${itemA.id}`);
    const { root, container } = await renderGrid();
    try {
      // chọn filter crt trước (nhấn M một lần)
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "m", bubbles: true }));
      });
      const img = document.body.querySelector<HTMLImageElement>('[role="application"] img');
      const crtCss = "saturate(1.25)";
      expect(img?.style.filter).toContain(crtCss);

      // giữ C → về Gốc
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "c", bubbles: true }));
      });
      expect(img?.style.filter).toBe("none");
      expect(document.body.textContent).toContain("GỐC");

      // thả C → trả lại crt
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent("keyup", { key: "c", bubbles: true }));
      });
      expect(img?.style.filter).toContain(crtCss);
    } finally {
      await act(async () => root.unmount());
      container.remove();
      window.history.replaceState(null, "", "/gallery");
    }
  });

  it("phím ? mở bảng phím tắt, Esc đóng help trước khi đóng lightbox", async () => {
    window.history.replaceState(null, "", `/gallery?view=${itemA.id}`);
    const { root, container } = await renderGrid();
    try {
      expect(document.body.querySelector('[aria-label="Bảng phím tắt"]')).toBeNull();
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "?", bubbles: true }));
      });
      expect(document.body.querySelector('[aria-label="Bảng phím tắt"]')).toBeTruthy();

      await act(async () => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      });
      // help đóng, lightbox vẫn mở
      expect(document.body.querySelector('[aria-label="Bảng phím tắt"]')).toBeNull();
      expect(document.body.querySelector('[role="dialog"]')).toBeTruthy();
    } finally {
      await act(async () => root.unmount());
      container.remove();
      window.history.replaceState(null, "", "/gallery");
    }
  });

  it("nút ? trên titlebar mở/đóng help (aria-pressed đồng bộ)", async () => {
    window.history.replaceState(null, "", `/gallery?view=${itemA.id}`);
    const { root, container } = await renderGrid();
    try {
      const helpBtn = document.body.querySelector<HTMLButtonElement>(
        '[aria-label^="Bảng phím tắt (phím"]',
      );
      expect(helpBtn).toBeTruthy();
      expect(helpBtn?.getAttribute("aria-pressed")).toBe("false");

      await act(async () => {
        helpBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      });
      expect(document.body.querySelector('[aria-label="Bảng phím tắt"]')).toBeTruthy();

      const closeHelp = document.body.querySelector<HTMLButtonElement>(
        '[aria-label="Đóng bảng phím tắt"]',
      );
      await act(async () => {
        closeHelp?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      });
      expect(document.body.querySelector('[aria-label="Bảng phím tắt"]')).toBeNull();
    } finally {
      await act(async () => root.unmount());
      container.remove();
      window.history.replaceState(null, "", "/gallery");
    }
  });
});
