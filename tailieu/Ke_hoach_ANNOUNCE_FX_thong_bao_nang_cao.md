# Kế hoạch: ANNOUNCE.FX — WinPopup Station v2 (màu chữ + ký hiệu + hiệu ứng)

> Ngày lập: theo phiên làm việc sau v5.1 (ESLint 472→0)
> Trạng thái: HOÀN THÀNH (F1→F7) — 7 gates xanh, 282/282 tests, eslint 0 problems
> Sự cố đã xử lý: HTML comment trong JSX expression vỡ parse (di chuyển ra ngoài container); banner else-branch thiếu </p>; import marqueeTextFrom thừa (ratchet chặn); CSS budget vượt 6 bytes → nới 187k có chủ đích.
> Phạm vi: chỉ hệ thống Thông Báo (site_announcements), không đụng pipeline khác.

## 1. Mục tiêu

Hiện tại thông báo chỉ có: type (marquee/banner/popup) + title/body — màu chữ cứng
(marquee = vapor-orange, banner = mặc định) và icon mặc định (📣/🚩/📢).

Nâng cấp để admin chọn cho MỖI thông báo:
1. **accent** — màu nhấn từ palette token có sẵn (6 màu vapor), không thêm hex mới (ratchet policy:ui không tăng).
2. **icon** — ký hiệu đặc biệt đầu tiêu đề (bộ ~12 icon Win95/cập nhật + auto-detect cũ giữ nguyên khi để "auto").
3. **fx** — hiệu ứng chữ: `none | neon | chromatic | rainbow | blink`.
   - neon: text-shadow glow màu accent.
   - chromatic: lệch RGB kiểu CRT (shadow đỏ/xanh+lục).
   - rainbow: animation hue-rotate (chỉ khi không prefers-reduced-motion).
   - blink: nhấp nháy Win95 dịu (opacity steps) — cùng tôn trọng reduced-motion.

## 2. Nguyên tắc bắt buộc

- Màu CHỈ dùng token: class `text-vapor-*` / `var(--color-vapor-*)` — 0 hex mới.
- Mọi fx động (rainbow/blink) PHẢI bị `@media (prefers-reduced-motion: reduce)` tắt.
- Backward compatible: cột mới nullable, mặc định null = hành vi cũ y nguyên.
- Generic kiểu có `< >` KHÔNG viết trong template .astro — dùng type alias frontmatter.
- Pure logic vào announcementUtils.ts/announcementPreview.ts + unit test; component chỉ orchestrate.
- deploy.yml KHÔNG đụng. Ratchet lint=0 phải giữ nguyên (không thêm any/console).

## 3. Thiết kế kỹ thuật

### 3.1 SQL (file mới supabase_sql/announcements_fx.sql)
```sql
ALTER TABLE public.site_announcements ADD COLUMN IF NOT EXISTS accent TEXT;
ALTER TABLE public.site_announcements ADD COLUMN IF NOT EXISTS icon   TEXT;
ALTER TABLE public.site_announcements ADD COLUMN IF NOT EXISTS fx     TEXT;
```
(CHOICE sẽ validate ở app-layer; DB không constraint để migration nhẹ — giá trị lạ → null.)

### 3.2 Pure module announcementUtils.ts — bổ sung
- `ANNOUNCE_ACCENTS: string[]` = ["pink","blue","purple","green","yellow","orange"] (khớp token vapor-*).
- `ANNOUNCE_FX: string[]` = ["none","neon","chromatic","rainbow","blink"].
- `ANNOUNCE_ICONS: { value: string; label: string }[]` = bộ icon (📣 📢 ⚠️ 🎉 🔧 💡 📌 ❤️ ⭐ 🔴 🖼️ 🪟).
- `normalizeAccent(v): string | null` — lạ → null.
- `normalizeFx(v): string | null`.
- `normalizeIcon(v): string | null` — "" hoặc "auto" → null (dùng auto-detect cũ).
- `fxClassFor(fx): string` → `ann-fx-neon` ... (class CSS trong global.css).
- `accentClassFor(accent): string` → `text-vapor-pink` ... (Tailwind token classes).
- `AnnouncementLike` thêm `accent?/icon?/fx?: string | null`.
- `partitionByType` giữ nguyên (không đụng — các field mới đi theo object).

### 3.3 CSS (global.css, dùng var token)
- `.ann-fx-neon` : text-shadow 0 0 6px var(--color-…)? — không biết accent trước → dùng
  `text-shadow: 0 0 6px currentColor` (glow theo màu chữ đang có) — gọn, tự hoạt động mọi accent.
- `.ann-fx-chromatic`: text-shadow 2px 0 rgba(255,0,60,.75), -2px 0 rgba(0,255,200,.75).
- `.ann-fx-rainbow`: animation ann-rainbow 6s linear infinite (hue-rotate filter trên span) + reduced-motion off.
- `.ann-fx-blink`: animation ann-blink 1.2s steps(2) infinite + reduced-motion off.

### 3.4 Kênh render
- MarqueeTicker.astro: nếu announcement có accent/icon/fx → áp; không → giữ nguyên (xanh).
  icon đặt TRƯỚC text chạy; fx class lên 2 span text.
- BaseLayout banner: title span nhận accentClass + fxClass + icon thay 🚩; body giữ màu phụ.
- AnnouncementPopup.astro: icon lớn thay 📢, title nhận fx, header badge đổi màu theo accent
  (nền gradient giữ nguyên — chỉ đổi màu chữ/icon để Win95 không vỡ thẩm mỹ).

### 3.5 Admin (admin/announcements.astro)
- Form thêm: select ann-accent (6 màu + Mặc định), select ann-fx (5 + Mặc định),
  grid radio ann-icon (Auto + 12 icon, tile 40px click chọn).
- INSERT/UPDATE thêm accent/icon/fx (null khi để mặc định).
- Danh sách hiện có: badge nhỏ hiển thị accent/icon/fx của từng dòng.

### 3.6 PREVIEW.ALL (announcementPreview.ts)
- Listener thêm cho 3 control mới; updatePreview áp class + textContent icon lên 3 khung.
- Pure helper `applyFxToPreview(els, {accent, fx, icon})` test được bằng jsdom.

## 4. Chia batch thực thi (mỗi batch nhỏ, gates xanh mới sang bước)

| Batch | Việc | Verify |
|---|---|---|
| F1 | announcementUtils mở rộng + test unit mới (normalize/fxClass/accentClass) | vitest + typecheck |
| F2 | CSS fx trong global.css (token-only + reduced-motion) | stylelint + policy:ui |
| F3 | SQL migration file | review tay |
| F4 | MarqueeTicker + Banner + Popup áp dụng | build + SSR smoke |
| F5 | Admin form + SQL insert/update + list badges | typecheck + build |
| F6 | Preview wiring + test jsdom mở rộng | vitest |
| F7 | 7 gates + update CHANGELOG + commit | full CI local |

## 5. Rủi ro
- Banner nền win-gray (sáng): accent vàng/hồng trên nền sáng kém tương phản → chỉ áp
  accent cho banner khi nền tối, ngược lại dùng nền tối cho khối text (quyết định khi code F4).
- marquee fx rainbow có thể nặng → chỉ 1 element/chữ, hue-rotate GPU-ok.
