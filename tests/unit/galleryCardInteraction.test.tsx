// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const submission = {
  id: "4411e057-d039-4acb-82b4-3c6cd03733fa",
  title: "[VAPOR_EXPEDITION] :: Cyber_Pyramid_Oasis.raw",
  image_url: "https://res.cloudinary.com/demo/image/upload/a.png",
  description: "",
  tags: [],
  created_at: "2026-08-31T00:00:00Z",
  author_id: "author-1",
  profiles: { full_name: "Tester", avatar_url: "" },
};

vi.mock("../../src/lib/supabaseBrowser", () => ({
  getSupabaseBrowserClient: () => ({
    from: (table: string) => {
      if (table === "reactions") {
        return { select: () => Promise.resolve({ data: [], error: null }) };
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [submission], error: null }),
          }),
        }),
      };
    },
    channel: () => {
      const channel = {
        on: () => channel,
        subscribe: () => channel,
      };
      return channel;
    },
    removeChannel: vi.fn(),
  }),
}));

vi.mock("../../src/ui/kernel/ErrorBoundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("../../src/components/LazyImage", () => ({
  LazyImage: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement("img", { src, alt }),
}));

vi.mock("../../src/components/FavoriteButton", () => ({
  FavoriteButton: ({ onToggle }: { onToggle?: (value: boolean) => void }) =>
    React.createElement(
      "button",
      {
        type: "button",
        "aria-label": "Thêm vào danh sách yêu thích",
        onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          onToggle?.(true);
        },
      },
      "🤍",
    ),
}));

vi.mock("../../src/components/GalleryLightbox", () => ({
  GalleryLightbox: ({ activeId }: { activeId: string }) =>
    React.createElement("div", { role: "dialog", "data-active-id": activeId }, activeId),
}));

const observer = class {
  observe() {}
  disconnect() {}
};

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(window, "IntersectionObserver", { configurable: true, value: observer });
  window.history.replaceState(null, "", "/gallery");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Gallery card interaction", () => {
  it("dùng link card độc lập với nút favorite và mở đúng viewer khi click card", async () => {
    const { GalleryGrid } = await import("../../src/components/GalleryGrid");
    const container = document.createElement("div");
    document.body.appendChild(container);
    let root: Root | null = null;

    try {
      root = createRoot(container);
      await act(async () => {
        root!.render(
          React.createElement(GalleryGrid, { initialSubmissions: [submission], currentUser: null }),
        );
      });
      await act(async () => {});

      const cardLink = container.querySelector<HTMLAnchorElement>(
        'a[aria-label="Xem tác phẩm: [VAPOR_EXPEDITION] :: Cyber_Pyramid_Oasis.raw"]',
      );
      const favorite = container.querySelector<HTMLButtonElement>(
        'button[aria-label="Thêm vào danh sách yêu thích"]',
      );

      expect(cardLink).not.toBeNull();
      expect(favorite).not.toBeNull();
      expect(favorite?.parentElement?.closest("a")).toBeNull();
      expect(favorite?.parentElement?.closest('[role="button"][tabindex="0"]')).toBeNull();

      await act(async () => {
        cardLink!
          .querySelector("img")
          ?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
      });

      expect(window.location.search).toBe(`?view=${submission.id}`);
      expect(container.querySelector('[role="dialog"]')?.getAttribute("data-active-id")).toBe(
        submission.id,
      );
    } finally {
      await act(async () => root?.unmount());
      container.remove();
    }
  });
});
