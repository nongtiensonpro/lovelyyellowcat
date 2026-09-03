# Kế hoạch: ARCADE v2 — Canvas2D sinh động + full-width (PC/Mobile)

> Trạng thái: HOÀN THÀNH (V1→V4) — 7 gates xanh, 304/304 tests, canvas 960×540 16:9
> Yêu cầu: (1) canvas 2 game sinh động hơn, (2) hiển thị rộng đầy đủ chiều ngang.

## 1. Chẩn đoán
- Canvas logic 640×480 (4:3), cửa sổ overlay min(92vw, 860px) → mỗi bên dư ~15% chiều ngang.
- Render tĩnh: nền vẽ 1 kiểu, không animation, bóng không trail, paddle không glow, rắn không mắt.

## 2. Giải pháp
### Full-width widescreen 16:9
- PONG: PONG_W 640→960, PONG_H 480→540 (16:9); tốc độ scale ×1.5 (START 6.3, CPU_MAX 4.6,
  paddle phím 9, velY clamp 10.5) giữ cảm giác gameplay.
- SNAKE: COLS 20→32, ROWS 15→18 (cell 30px → đúng 960×540); init giữ vị trí cũ (trong lưới).
- Canvas attrs 960×540; CSS aspect-ratio 16/9; cửa sổ min(96vw, theo-chiều-cao, 1280px).
- Test PONG đổi hardcoded (320/200/660) sang hằng số (PONG_W/2 ...) — chuẩn hoá vĩnh viễn.

### Canvas sinh động (render-only, core giữ thuần)
- PONG: sao nhấp nháy (sin), lưới synthwave chạy, mặt trời glow thở, trail bóng mờ dần,
  paddle + bóng shadowBlur neon, flash trắng khi chặn paddle (state.flash — core set 1,
  decay 0.9/step, có test), scanline CRT overlay.
- SNAKE: lưới pulse alpha, ⭐ food phồng/xẹp (sin), thân rắn sóng sáng theo index+thời gian,
  đầu rắn có MẮT theo hướng, scanline CRT, game-over nhấp đỏ dịu.

## 3. Batch
| Bước | Việc | Verify |
|---|---|---|
| V1 | plan + pongCore 960×540 + flash + test hằng số | vitest |
| V2 | snakeCore 32×18 | vitest (test cũ pass nhờ hằng số) |
| V3 | GameDock render overhaul + canvas/CSS full-width | build + eslint 0 + policy (hex phải trùng token!) |
| V4 | 7 gates + CHANGELOG + tick plan | full |
