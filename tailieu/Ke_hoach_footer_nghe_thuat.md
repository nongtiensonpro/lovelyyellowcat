# Kế hoạch: Footer nghệ thuật (trang chủ + quản trị) — "FOOTER.SYS"

> Trạng thái: HOÀN THÀNH (G1→G4) — 7 gates xanh (budget nới 189k có chủ đích), 282/282 tests
> Ghi chú sự cố: BaseLayout truncate 0-byte do write_text(encoding=typo) — khôi phục git HEAD, SHA khớp; anchor-assert chặn ghi rác.
> Tham chiếu: /about (vaporwave sunset, perspective grid, noise, neon glow, terminal mono)

## 1. Mục tiêu
Footer hiện tại thuần Win95 chức năng (3 dải xám). Nâng cấp thành "bức tranh hoàng hôn
cuối trang" nhưng GIỮ nguyên cấu trúc Win95 + links (usability-first):
- Băng nghệ thuật phía trên footer: mặt trời sọc lặn sau lưới phối cảnh + sao nhấp nháy.
- Dòng terminal neon: "> FOOTER.SYS LOADED — ..." + con trỏ nháy (CSS only).
- Admin: phiên bản compact của cùng băng + chips trạng thái (BUILD/ROLE).

## 2. Nguyên tắc
- CSS-only 100% (0 JS mới) — animation dùng background-position + opacity.
- Màu: var(--color-vapor-*) + rgba() — KHÔNG hex mới (ratchet policy:ui 142).
- prefers-reduced-motion: tắt mọi animation (grid scroll, twinkle, cursor).
- Không generic < > trong template .astro. Không đụng deploy.yml.
- CSS budget sẽ tăng ~3KB → nới ui-budgets.json có chủ đích + lý do trong commit.

## 3. Thực thi
| Bước | Việc |
|---|---|
| G1 | CSS .footer-art-* trong global.css (horizon/sun/grid/stars/terminal + admin variant + reduced-motion) |
| G2 | BaseLayout footer: chèn art band + terminal line, giữ 3 dải Win95 |
| G3 | AdminLayout footer: art band compact + chips |
| G4 | Gates (stylelint/policy/budget/build/test/eslint) + CHANGELOG + tick plan |
