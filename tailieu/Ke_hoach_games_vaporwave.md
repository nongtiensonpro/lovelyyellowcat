# Kế hoạch: ARCADE.SYS — 2 game retro toàn màn hình trên trang chủ

> Trạng thái: HOÀN THÀNH (GM1→GM5) — 7 gates xanh, 304/304 tests
> Sự cố: createPong namespace import sai (build bắt MISSING_EXPORT — đúng quy trình); shadowing step/pongStep (eslint bắt); CSS budget +224B → nới 191k.
> Yêu cầu user: (1) bỏ <!-- Vaporwave Sliced Sun --> (Pixel Reveal Title đã đủ), (2) 2 game đơn giản
> đậm phong cách site, click → chơi toàn màn hình. Sáng tạo tự do.

## 1. Thiết kế — ARCADE.SYS DOCK

Trang chủ thêm dock 2 "đĩa game" Win95 (sau hero, trước FEATURED strip):
- 🏓 **PONG.SYS** — Vapor Pong: paddle/di chuột-hay-mũi tên, bóng tăng tốc, nền hoàng hôn
  sọc + lưới synthwave + scanline CRT, điểm vs CPU, BEST lưu localStorage.
- 🐍 **SNAKE.EXE** — Neon Snake: lưới phát sáng, mồi = ⭐, tường = game over, điểm + BEST.

Click card → overlay **toàn màn hình** (fixed inset-0 z-modal): cửa sổ Win95 chrome
(title PONG.SYS — A SCREENSAVER GONE ROGUE), canvas 4:3 max, Escape/✕ đóng,
pause khi tab ẩn (visibilitychange), focus về nút mở khi đóng.

## 2. Kiến trúc (đúng convention: pure core + test, component orchestrate)
- src/lib/games/pongCore.ts — physics thuần: init/step(state,input)/bounce/score/speedup. Testable.
- src/lib/games/snakeCore.ts — grid thuần: init/step/dir-queue/chặn quay đầu 180°/food/game over.
- src/components/games/GameDock.astro — markup dock + overlay + canvas + script bundled import core.
- Màu canvas: hex TRÙNG giá trị token (policy whitelist primitives) — #ff71ce #01cdfe #b967ff #05ffa1 #fffb96 #0b001a...
- a11y: overlay role=dialog aria-modal, Esc, focus trap nhẹ, reduced-motion không liên quan (game user-initiated).

## 3. Batch
| Bước | Việc | Verify |
|---|---|---|
| GM1 | Bỏ Sliced Sun (markup index + .vapor-sun CSS) + GameDock markup + CSS | eslint parse + build |
| GM2 | pongCore + ~10 test | vitest |
| GM3 | snakeCore + ~10 test | vitest |
| GM4 | Script overlay/input/render/score + wire 2 game | build + eslint 0 problems |
| GM5 | 7 gates (budget nới nếu cần, lý do trong commit) + CHANGELOG + tick plan | full CI local |

## 4. Rủi ro
- JS budget 642k/660k: game core nhỏ (<6KB min), vẫn dư — theo dõi sau build.
- CSS +~2KB → nới 189k→191k chủ đích.
- index.astro đang 0Byte? KHÔNG — file nguyên vẹn (BaseLayout sự cố trước là cell khác).
