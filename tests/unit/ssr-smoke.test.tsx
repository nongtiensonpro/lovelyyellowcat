import React from "react";
// ssr-smoke.test.tsx — render các island qua renderToString để bắt lỗi
// "Missing getServerSnapshot" / window-undefined NGAYỤC TRONG CI, không đợi deploy thật.
import { describe, it, expect } from "vitest";
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
