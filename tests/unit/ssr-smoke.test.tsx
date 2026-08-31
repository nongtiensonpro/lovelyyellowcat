// @vitest-environment jsdom
import React from "react";
// ssr-smoke.test.tsx — render các island qua renderToString để bắt lỗi
// "Missing getServerSnapshot" / window-undefined NGAYỤC TRONG CI, không đợi deploy thật.
import { describe, it, expect, beforeAll } from "vitest";
import { renderToString } from "react-dom/server";
import { WMHost } from "../../src/ui/wm95/WMHost";
import { DialogHost } from "../../src/ui/wm95/DialogHost";
import { CommandPalette } from "../../src/ui/shell/CommandPalette";

describe("SSR smoke — islands phải render được trên server", () => {
  it("WMHost render không throw (useSyncExternalStore có getServerSnapshot)", () => {
    const html = renderToString(React.createElement(WMHost));
    expect(typeof html).toBe("string");
  });
  it("DialogHost render không throw", () => {
    const html = renderToString(React.createElement(DialogHost));
    expect(typeof html).toBe("string");
  });
  it("CommandPalette render không throw (trả null khi đóng)", () => {
    const html = renderToString(React.createElement(CommandPalette, { role: "public" }));
    expect(html).toBe(""); // palette đóng => không render gì
  });
});

describe("SSR smoke — gallery islands", () => {
  it("GalleryGrid render không throw (imports module galleryQuery đầy đủ)", async () => {
    // GalleryGrid module-scope tạo Supabase client — stub env trước khi import
    process.env.PUBLIC_SUPABASE_URL ??= "https://stub.supabase.co";
    process.env.PUBLIC_SUPABASE_ANON_KEY ??= "stub-anon-key";
    const { GalleryGrid } = await import("../../src/components/GalleryGrid");
    const html = renderToString(
      React.createElement(GalleryGrid, {
        initialSubmissions: [],
        currentUser: null,
        isFavoritesOnly: false,
      })
    );
    expect(typeof html).toBe("string");
  });
});

describe("SSR smoke — AI chat", () => {
  it("AiChatStation render không throw (E2EE states render an toàn server-side)", async () => {
    process.env.PUBLIC_SUPABASE_URL ??= "https://stub.supabase.co";
    process.env.PUBLIC_SUPABASE_ANON_KEY ??= "stub-anon-key";
    const { AiChatStation } = await import("../../src/components/AiChatStation");
    const html = renderToString(React.createElement(AiChatStation));
    expect(typeof html).toBe("string");
  });
});

// jsdom chưa implement scrollIntoView — mock trước khi render lightbox
beforeAll(() => {
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {};
});

describe("Gallery lightbox regression — production VISUAL_FILTERS crash", () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  it("GalleryLightbox mở ảnh → đường code VISUAL_FILTERS chạy không ReferenceError (jsdom + effect)", async () => {
    process.env.PUBLIC_SUPABASE_URL ??= "https://stub.supabase.co";
    process.env.PUBLIC_SUPABASE_ANON_KEY ??= "stub-anon-key";
    const { GalleryLightbox } = await import("../../src/components/GalleryLightbox");
    const ReactDOMClient = await import("react-dom/client");
    const { act } = await import("react");
    const item = {
      id: "test-1",
      title: "Tác phẩm thử nghiệm",
      description: "mô tả",
      image_url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      user_id: "u1",
      author_id: "u1",
      status: "approved",
      created_at: "2026-08-31T00:00:00Z",
      profiles: { full_name: "Tester", avatar_url: "" },
    };
    const container = document.createElement("div");
    document.body.appendChild(container);
    let rootEl: ReturnType<typeof ReactDOMClient.createRoot> | null = null;
    const errors: unknown[] = [];
    const origError = console.error;
    console.error = (...args: unknown[]) => { errors.push(args[0]); };
    try {
      rootEl = ReactDOMClient.createRoot(container);
      await act(async () => {
        rootEl!.render(
          React.createElement(GalleryLightbox, {
            submissions: [item],
            activeId: "test-1",
            currentUser: null,
            onClose: () => {},
          })
        );
      });
      // act thứ 2: flush effect sync activeId → currentIndex → activeSubmission → filter UI
      await act(async () => {});
      // Lightbox render qua createPortal vào document.body — nội dung nằm ngoài container
      const html = document.body.innerHTML;
      expect(html).toContain("FILTER");
      expect(errors.join(" ")).not.toContain("VISUAL_FILTERS is not defined");
    } finally {
      console.error = origError;
      rootEl?.unmount();
      container.remove();
    }
  });

  it("galleryFilters module export VISUAL_FILTERS đầy đủ (nguồn chân lý filter)", async () => {
    const { VISUAL_FILTERS, filterCss } = await import("../../src/components/gallery/galleryFilters");
    expect(Array.isArray(VISUAL_FILTERS)).toBe(true);
    expect(VISUAL_FILTERS.length).toBeGreaterThan(0);
    for (const f of VISUAL_FILTERS) {
      expect(typeof f.id).toBe("string");
      expect(typeof filterCss(f.id)).toBe("string");
    }
  });
});
