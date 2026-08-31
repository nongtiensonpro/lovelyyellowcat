// defaultCommands.ts — lệnh mặc định đăng ký cho mọi trang (ADR-0002 §3.5).
import { registerCommand } from "./commands";
import { openWindow, dispatchWindow } from "../wm95/windowRuntime";
import { setUiMode } from "../services/preferenceStore";

let registered = false;
export function registerDefaultCommands(): () => void {
  if (registered) return () => {};
  registered = true;

  const unsubs = [
    // ── Điều hướng ──
    registerCommand({ id: "nav-home", label: "Về trang chủ", icon: "🏠", keywords: ["home", "trang chủ"], action: () => { location.href = "/"; } }),
    registerCommand({ id: "nav-gallery", label: "Triển lãm tranh", icon: "🖼️", keywords: ["gallery", "tranh", "vapor"], action: () => { location.href = "/gallery"; } }),
    registerCommand({ id: "nav-articles", label: "Tạp chí — bài viết", icon: "📰", keywords: ["articles", "bài"], action: () => { location.href = "/articles"; } }),
    registerCommand({ id: "nav-ai", label: "Trò chuyện với MEOW AI", icon: "🐱", keywords: ["ai", "chat", "mèo"], action: () => { location.href = "/ai"; } }),
    registerCommand({ id: "nav-submit", label: "Gửi tranh của bạn", icon: "📤", keywords: ["submit", "gửi"], scope: "auth", action: () => { location.href = "/submit"; } }),

    // ── UI mode ──
    registerCommand({ id: "mode-crt", label: "Bật chế độ CRT", icon: "📺", keywords: ["crt", "scanline", "retro"], action: () => setUiMode("crt") }),
    registerCommand({ id: "mode-catalog", label: "Chế độ CATALOG (mặc định)", icon: "📖", keywords: ["catalog", "mặc định"], action: () => setUiMode("catalog") }),
    registerCommand({ id: "mode-access", label: "Chế độ ACCESS (tiếp cận)", icon: "♿", keywords: ["access", "a11y", "reduced"], action: () => setUiMode("access") }),

    // ── Hành động UI ──
    registerCommand({ id: "ui-open-window", label: "Mở cửa sổ MEOW_INFO.EXE", icon: "🗔", keywords: ["window", "wm", "test"], action: () => {
      openWindow({ id: "meow-info", title: "MEOW_INFO.EXE", icon: "🐱", rect: { x: 120, y: 120, width: 360, height: 240 } });
    } }),
  ];
  return () => { for (const u of unsubs) u(); registered = false; };
}

// Tự đăng ký khi import (module side-effect) — an toàn vì registerCommand idempotent
if (typeof window !== "undefined") {
  registerDefaultCommands();
}
