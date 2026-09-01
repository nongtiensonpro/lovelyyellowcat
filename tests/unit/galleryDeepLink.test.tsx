// @vitest-environment jsdom
// Tái hiện luồng production thật: /gallery?view=<id> — deep-link PHẢI mở đúng tác phẩm
// theo id, KHÔNG fallback về item đầu. Bắt class bug: findIndex sai / activeId không
// được áp dụng / lightbox hiển thị submission khác với URL.
import React from "react";
import { describe, it, expect, beforeAll } from "vitest";
import { renderToString } from "react-dom/server";

const itemA = {
  id: "4411e057-d039-4acb-82b4-3c6cd03733fa",
  title: "VAPOR_EXPEDITION — Cyber Pyramid Oasis",
  description: "A",
  image_url: "https://res.cloudinary.com/demo/image/upload/a.png",
  user_id: "u1",
  author_id: "u1",
  status: "approved",
  created_at: "2026-08-31T00:00:00Z",
  profiles: { full_name: "Tester", avatar_url: "" },
};
const itemB = {
  id: "bbbbbbbb-0000-4000-8000-000000000002",
  title: "VAPOR_VN — Halong Digital Nostalgia",
  description: "B",
  image_url: "https://res.cloudinary.com/demo/image/upload/b.png",
  user_id: "u1",
  author_id: "u1",
  status: "approved",
  created_at: "2026-08-30T00:00:00Z",
  profiles: { full_name: "Tester", avatar_url: "" },
};

beforeAll(() => {
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {};
});

describe("Deep-link ?view=<id> phải mở đúng tác phẩm", () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  it("SSR smoke: GalleryLightbox với activeId render không throw", async () => {
    process.env.PUBLIC_SUPABASE_URL ??= "https://stub.supabase.co";
    process.env.PUBLIC_SUPABASE_ANON_KEY ??= "stub-anon-key";
    const { GalleryLightbox } = await import("../../src/components/GalleryLightbox");
    const html = renderToString(
      React.createElement(GalleryLightbox, {
        submissions: [itemA, itemB],
        activeId: "4411e057-d039-4acb-82b4-3c6cd03733fa",
        currentUser: null,
        onClose: () => {},
      }),
    );
    expect(typeof html).toBe("string");
  });

  it("activeId trỏ tới item 2 → lightbox hiển thị item 2 (không fallback item đầu)", async () => {
    process.env.PUBLIC_SUPABASE_URL ??= "https://stub.supabase.co";
    process.env.PUBLIC_SUPABASE_ANON_KEY ??= "stub-anon-key";
    const { GalleryLightbox } = await import("../../src/components/GalleryLightbox");
    const ReactDOMClient = await import("react-dom/client");
    const { act } = await import("react");

    const container = document.createElement("div");
    document.body.appendChild(container);
    let rootEl: ReturnType<typeof ReactDOMClient.createRoot> | null = null;
    const errors: unknown[] = [];
    const origError = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args[0]);
    };
    try {
      rootEl = ReactDOMClient.createRoot(container);
      // Truyền theo thứ tự grid: A (mới nhất) trước, B sau — activeId là B
      await act(async () => {
        rootEl!.render(
          React.createElement(GalleryLightbox, {
            submissions: [itemA, itemB],
            activeId: "bbbbbbbb-0000-4000-8000-000000000002",
            currentUser: null,
            onClose: () => {},
          }),
        );
      });
      await act(async () => {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 50));
      });
      const html = document.body.innerHTML;
      // phải chứa title của B — activeId là B, không phải A
      expect(html).toContain("Halong Digital Nostalgia");
      expect(errors.join(" ")).not.toContain("VISUAL_FILTERS is not defined");
    } finally {
      await act(async () => {
        rootEl?.unmount();
      });
      console.error = origError;
      container.remove();
    }
  });
});
