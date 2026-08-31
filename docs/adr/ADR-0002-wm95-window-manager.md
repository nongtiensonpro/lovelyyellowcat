# ADR-0002: WM/95 — Window Manager chạy client-side, SSR-safe, có fallback tĩnh

- **Trạng thái:** Accepted (2026-08-22)
- **Ngữ cảnh:** Admin/Win95 đang là "ảnh chụp của OS": `Win95Window` tĩnh, không z-order/drag/taskbar; 8 chỗ dùng `z-[9999+]` ad-hoc; chỉ 3 nơi có `role=dialog`.
- **Quyết định:**
  1. WM là React context (`src/ui/wm95/`) quản registry + z-order counter + state machine `closed→opening→active→minimized/maximized→closing`.
  2. SSR: server render state "closed/tile" — không đọc `window` trong module scope; hydrate xong mới có runtime đầy đủ.
  3. No-JS/JS-lỗi: cửa sổ render như section/card tĩnh có nội dung đầy đủ — nội dung không bao giờ bị khoá sau runtime.
  4. z-index chỉ cấp qua WM (`--z-base..--z-critical`); cấm `z-[9999]` mới (checker chặn).
  5. Modal dùng `inert` trên nền, focus restore, Escape pop theo stack.
- **Hệ quả:** taskbar/Alt-Tab khả thi về sau; mọi "cửa sổ" có keyboard path; chi phí: thêm ~1 island provider nhẹ và discipline đăng ký cửa sổ.
