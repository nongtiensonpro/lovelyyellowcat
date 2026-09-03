# CHANGELOG — lovelyyellowcat v5 "ULTIMATE OVERENGINEER"

## [5.11] — Admin Thư viện Ảnh: quick-filter + sửa nút đè (MEDIA.UI v2)

### Added
- **Quick-filter chips** đầu trang: 🌐 TẤT CẢ / 🟢 ĐANG DÙNG / 🔴 MỒ CÔI (n) — giữ nguyên mọi bộ lọc khác (từ khoá/thư mục/kích thước/ngày/sắp xếp), active ring tím, chip Mồ Côi hiện số lượng trang hiện tại. Filter cũ vẫn còn trong form nâng cao.

### Fixed (nút đè lên nhau)
- Card ảnh: checkbox chọn + nút ℹ️ + badge tình trạng chuyển từ absolute đè-ảnh → **header row in-flow** trên ảnh (không che mất góc ảnh nữa).
- Modal chi tiết (FILE_PROPERTIES.EXE): `max-h-90vh + overflow-y-auto` — không tràn màn hình nhỏ; 4 nút copy chống tràn chữ (`whitespace-nowrap + ellipsis`), grid 1 cột trên mobile.
- Bulk-bar: gap-y + shrink-0 — nút XÓA không bị bóp chữ khi wrap mobile.


## [5.10.1] — fix PONG: "đứng im vẫn thắng" (CPU difficulty overhaul)

### Fixed
- **Root cause**: CPU bám bóng MỖI frame kể cả khi bóng bay về phía người chơi → đoán trước vị trí + score thấp chặn được hầu hết bóng; serve luôn velY=0 thẳng giữa dễ chặn; vòng lặp: velY tích luỹ mỗi cú chặn → CPU miss → P1 điểm đều đặn mà không cần di chuột.
- CPU giờ **chỉ track khi bóng bay về phía mình** (`velX > 0`), bóng đi xa thì **drift về giữa** chuẩn bị — hành vi người chơi thật.
- **Serve góc ngẫu nhiên** (velY ±1.6) — hết bóng thẳng đoán được.
- **Rubber-band skill**: hệ số bám `0.085 + score×0.004` (cap 0.13) — càng ghi điểm CPU càng khó.
- 4 test mới chặn class bug: CPU không track khi bóng đi xa, track khi bóng đến, skill tăng theo điểm, serve luôn có góc. 15 Pong tests (308 tổng).

### Changed
- Hướng serve sau khi P1 ghi điểm: về phía thua (P1 giao lại — chuẩn Pong).


## [5.10] — ARCADE v3: attract-mode minh hoạ sống động + dock full-width

### Added
- **Attract-mode Canvas2D** trên mỗi card game (như màn attract máy arcade thật):
  - 🏓 PONG.SYS: 2 AI đối đánh thật (bám bóng giới hạn tốc độ, tăng tốc 3%/cú, serve lại) trên nền hoàng hôn + lưới synthwave + net đứt + glow + scanline.
  - 🐍 SNAKE.EXE: AI tham lam tự lái đi ăn ⭐ (né tường/thân, tự hồi sinh sau khi thua), rắn neon có mắt, lưới tím pulse.
  - Hiệu năng: **IntersectionObserver chỉ render card đang trong viewport** + pause khi tab ẩn — 0 CPU khi không nhìn thấy.
- Card: icon lớn glow ở giữa canvas demo + title/desc bên dưới.

### Changed
- **Dock full-width**: `max-width 900px flex` → **grid 2 cột chiếm trọn chiều ngang container** — hết hụt hai bên.
- Mobile ≤640px: 2 cột giữ nguyên, icon thu 26px, ẩn mô tả.


## [5.9] — ARCADE v2: Canvas2D sinh động + full-width widescreen

### Changed
- **Widescreen 16:9**: canvas 640×480 → **960×540**; cửa sổ overlay `min(92vw, 860px)` → `min(96vw, 1280px)`; PONG tốc độ scale (start 6.3, CPU_MAX 4.6, phím 9, velY-max 10.5); SNAKE lưới 20×15 → **32×18** (cell 30px). Core + test chuẩn hoá theo hằng số (PONG_W/2...) — hết hardcoded.
- **PONG canvas sống động**: 12 sao nhấp nháy sin 3 màu, mặt trời glow "thở" + sọc cắt, lưới synthwave chạy vô hạn về phía người xem, **trail bóng** mờ dần 14 điểm, paddle + bóng **shadowBlur neon** (flash tăng đột biến khi chặn — `state.flash` decay 0.88/step), score to giữa trời, scanline CRT.
- **SNAKE canvas sống động**: lưới pulse alpha, thân rắn **sóng sáng** chạy theo index+thời gian, đầu rắn có **mắt xoay theo hướng di chuyển**, ⭐ phồng/xẹp + nghiêng lắc, game-over nhấp đỏ dịu, scanline CRT.
- mouseY scale theo chiều cao canvas mới (540).

### Notes
- Màu render hex đều trùng giá trị token vapor (policy hex xanh).
- Gameplay unchanged — mọi thay đổi chỉ render/widescreen; 304/304 tests (cores test theo hằng số).


## [5.8] — VIEWPORT.SYS: tối ưu diện tích trang chủ (PC + Mobile)

### PC
- Navbar tray gọn: bỏ badge SYS_V2.0, nút Gửi Tranh/Người Dùng trùng lặp, brand còn 1 dòng.
- Hero: bỏ 3 sticker trang trí, py-8→py-5/6 — nội dung chính lên sớm hơn.
- Bỏ FEATURED STRIP + DANH MỤC + GitHub box (nhân bản journal/spotlight/navbar/footer) — index -7.8KB markup, bỏ 2 query Supabase thừa (2 round-trip ít hơn).
- Grid 12 cột: màn ≥1280px (xl) content chiếm 9/12 (trước 8/12) — bài viết + tranh rộng hơn.
- CTA đỏ bỏ hotline giả "1-800-VAPORWAVE", padding gọn.

### Mobile
- **Đảo thứ tự DOM**: nội dung chính (bài viết/spotlight) hiển thị TRƯỚC widget hệ thống + CTA (order-1/2, khôi phục lg).
- ARCADE card compact ≤640px: art 92→56px, ẩn mô tả, card 2 cột ngang — tiết kiệm ~250px cuộn.

### Kết quả
Hero nét → ARCADE gọn → ngay nội dung bài viết/tranh (mobile), spacing thưa hơn (mb-8→mb-6, space-y-8→6), mọi thứ còn truy cập đủ (drawer + footer).


## [5.7] — ARCADE.SYS: 2 game retro toàn màn hình + dọn Sliced Sun

### Added
- **ARCADE.SYS DOCK** trên trang chủ: 2 "đĩa game" Win95 — click mở **overlay toàn màn hình** (Esc/✕ đóng, focus trả về nút mở, pause khi tab ẩn).
  - 🏓 **PONG.SYS — Vapor Pong**: paddle chuột/mũi tên, CPU bám bóng, mỗi cú chặn bóng nhanh hơn 4.5%; nền hoàng hôn sọc + mặt trời sọc + lưới synthwave + net đứt đoạn; điểm = số lần bóng qua CPU, BEST lưu localStorage.
  - 🐍 **SNAKE.EXE — Neon Snake**: lưới 20×15 phát sáng, mồi ⭐, chặn quay đầu 180°, chạm tường/thân = game over (Space chơi lại); rắn gradient xanh lục/xanh dương neon.
- Pure cores `src/lib/games/{pongCore,snakeCore}.ts` + **22 test** (304/304 tổng) — physics test 100% không DOM.
- Canvas màu hex **trùng giá trị token** vapor (policy hex vẫn xanh).

### Removed
- `<!-- Vaporwave Sliced Sun -->` trên hero + `.vapor-sun` CSS (Pixel Reveal Title đã đủ — yêu cầu user).

### Notes
- CSS budget 189k→191k (+1.2KB arcade CSS, lý do trong commit).


## [5.6] — FOOTER.SYS: footer nghệ thuật hoàng hôn (public + admin)

### Added
- Băng nghệ thuật vaporwave cuối trang (CSS-only, 0 hex mới): **mặt trời sọc lặn** + **lưới phối cảnh chạy** + **sao lấp lánh** + **wordmark chrome gradient** + **dòng terminal neon** `> FOOTER.SYS LOADED` với con trỏ nháy.
- Public (BaseLayout): băng 150px trên 3 dải Win95 cũ — cấu trúc links/usability giữ nguyên.
- Admin (AdminLayout): variant compact 96px + chips trạng thái (CONTROL PANEL / MIT / 1024x768 / NET).
- `prefers-reduced-motion` tắt mọi animation.

### Notes
- CSS budget 187,000 → 189,000 bytes (+2KB chủ đích cho art CSS, lý do trong commit).
- Sự cố quy trình: 1 lần BaseLayout bị truncate 0-byte do lỗi encoding param trong tool write (anchor-assert đã chặn ghi rác; khôi phục từ HEAD, SHA verify khớp 100%).


## [5.5] — ANNOUNCE.FX v2: thông báo nâng cao (màu + ký hiệu + hiệu ứng)

### Added
- Admin chọn cho mỗi thông báo: **accent** (6 màu token vapor: pink/blue/purple/green/yellow/orange), **icon** (12 ký hiệu + Auto theo kênh), **hiệu ứng chữ** (neon glow / chromatic CRT / rainbow / blink).
- 3 cột mới `accent/icon/fx` (nullable — `supabase_sql/announcements_fx.sql`); NULL = hành vi mặc định cũ, backward compatible.
- PREVIEW.ALL 3 khung phản ứng live theo accent/fx/icon ngay khi chỉnh form.
- Banner/popup: khi có FX, title thành "màn hình CRT mini" nền tối — giữ tương phản trên nền Win95 sáng.
- 16 test mới (9 utils + 7 jsdom preview wiring) — 282/282.

### Notes
- CSS budget 185,000 → 187,000 bytes (+2KB chủ đích cho fx CSS, ghi lý do trong commit).
- Mọi hiệu ứng động tôn trọng `prefers-reduced-motion`; màu 100% token (không hex mới).


## [5.2] — Tích hợp ESLint đầy đủ (hardening)

### Changed
- `react-hooks/exhaustive-deps` warn → **error** (deps sai = closure cũ = bug state thật; 0 vi phạm từ v5.1).
- Bật lại `jsx-a11y/click-events-have-key-events` + `no-static-element-interactions` cho `.astro` — probe 48 file = 0 warning.
- `reportUnusedDisableDirectives: "error"` — eslint-disable chết = error ngay tại lint (ratchet không đếm được message ruleId=null).
- Thu hẹp override `no-console`: `src/lib/**` quá rộng → 5 file lib server-only cụ thể (supabaseBrowser/a11y/aiCrypto/markdown/siteKnowledge chạy ở browser islands, giờ chịu rule frontend).
- Bỏ `astro.config.mjs` khỏi ignores (lint sạch 0 message).
- **Ratchet per-rule**: logic tách vào `scripts/lint-baseline-core.mjs` (+ `.d.mts`) dùng chung check/update/test — update-lint-baseline từ chối khi BẤT KỲ rule nào tăng, kể cả khi tổng giảm (lỗ hổng cũ: chỉ so tổng — rule A tăng 1→2 + rule B giảm 3→1 vẫn được ghi nhận).

### Fixed
- 4 bug a11y thật trong admin .astro (label không associate control): users.astro ×3 (u-search/u-role/u-status), comments.astro "Lý do xóa" (id theo `comment.id` vì form lặp mỗi comment).
- Comment config stale ("v5 hotfix gate") cập nhật theo trạng thái v5.2; WindowFrame disable exhaustive-deps thêm lý do mount-only.

### Docs
- WAIVERS: W-8 → resolved; thêm W-9 (label rule off cho .astro — false-positive parser, bằng chứng probe 21/21).
- Kế hoạch + kết quả: `tailieu/Ke_hoach_tich_hop_ESLint_day_du_v5.2.md`

## [5.1] — Dọn nợ ESLint hoàn thành

### Xóa bỏ
- **ESLint debt 472 → 0 problems** (0 errors + 0 warnings) qua 11 batch có kế hoạch (`tailieu/Ke_hoach_du_nha_ESLint_397_warnings_v5.1.md`): unused-vars 50→0, no-console policy 58→0, form labels 46→0, keyboard a11y 28→0, no-explicit-any ~200→0 (6 sub-batch).
- Ratchet `artifacts/lint-baseline.json` về **0** — mọi warning mới sẽ fail CI ngay từ đây.

### Fixed
- ~8 bug type thật bị `any` che: `clampTemperature(0)`→0.7, `verifyData.score` undefined so NaN, stream signature thiếu `error?`, `ban_reason` undefined vào URL, `.message` trên unknown ×30+, WindowFrame hooks thứ tự, SearchModal `sectionHeaderClass`, `setIsE2EELoading` typo.


Toàn bộ nâng cấp giao diện theo kế hoạch `tailieu/Ke_hoach_nang_cap_Giao_dien_v5_ULTIMATE_OVERENGINEER.md`.
Mỗi phase đều qua 5 gates: test · tokens:check · stylelint · build · policy:ui.

## [v5.0.0] — 2026-08-31

### Phase 0 — Nền móng
- ADR-0001..0004; ESLint 9 flat (AST rule chặn alert/confirm), Stylelint, Prettier, Vitest, .editorconfig
- `scripts/ui-audit.mjs` baseline: 873 hex, 1.603 arbitrary, 369 inline styles, 24 alert/confirm, 14 client:load
- `outDir` dist→build (né file `.assetsignore` bị khóa quyền)

### Phase 1 — Design Token Pipeline + Retro Kernel
- Token DTCG (`primitives.json` + `semantic.json`, 3 mode catalog/crt/access) → `@theme` gen (utility Tailwind tự động đầy đủ)
- Contrast WCAG 12/12 pass (6.67–16.01); prebuild gate `tokens:check`
- Kernel: RetroButton, dialogStack/dialogService/DialogHost (focus trap), confirmDelegate `data-confirm`
- Migrate **24 → 0** alert/confirm; codemod 266 class hex→token; ratchet policy 142
- Demo `/dev/kernel` + `src/ui/MIGRATION.md`

### Phase 2 — Preference Store + AppShell
- `preferenceStore` (`lyc_prefs_v1`, BroadcastChannel, migration legacy `vapor_crt_mode`)
- `fxAbility` (off/low/medium/high) + `AppShell.astro` mount 2 layout; client:load **14 → 4**
- Hero video policy (save-data/reduced-motion/mobile); `mediaPolicy.ts`

### Phase 3 — WM/95 + Command Palette
- `windowStore` reducer (snap 8 vùng, z-order), WindowFrame (Pointer Events drag/resize + Alt+F4), Taskbar, WMHost
- Command registry + CommandPalette (Ctrl+K) + keyboardManager + 8 default commands

### Phase 4 — Gallery Exhibition OS
- `galleryTransform` (zoom/pan/rotate/flip) + `galleryQuery` (process/shouldRefetch/SortMode)
- GalleryLightbox refactor; LazyImage srcset Cloudinary; GalleryGrid debounce realtime

### Phase 5 — Reading OS (WordPad)
- `wordpadState` (zoom clamp 70–150), `commentTree` (MAX_DEPTH=3), `readingProgress`, `particleBurst`
- `[slug].astro` WordPad script ~370 dòng → ESM module

### Phase 6 — AI Chat Cockpit
- `aiPersonaData` (4 persona + prompts), `aiStreamCore` (SSE parsing + fallback + classifiers), `aiMarkdown` (**fix XSS: escape trước format**)
- Fix `clampTemperature(0)` nuốt giá trị 0; AiChatStation 2.454 LOC giảm 123→110KB

### Phase 7 — Admin Control Panel 98 v2
- `adminTable` pure module: parsePage/calcPage/buildAdminUrl/selection/multi-token search/sortByKey vi-locale (24 tests)
- Retrofit comments/users/articles; **chặn 1 crash thiếu import trước deploy** (scan usage↔import)

### Phase 8 — Performance / A11y / Resilience
- ErrorBoundary kernel — wrap AiChatStation (CAT_AI.EXE) + GalleryGrid (GALLERY_GRID.EXE); fallback Win95 BSOD-mini + THỬ LẠI
- Web Vitals telemetry **0 deps**: LCP/CLS/INP qua PerformanceObserver, no-PII (safePath/compactUA/sid hash), sampling 10%, sendBeacon
- `/api/ui-telemetry` (rate-limit 30/min/IP, insert-only) + `supabase_sql/ui_telemetry.sql` (RLS anon-insert/admin-select)
- `.cv-auto` content-visibility; aria-live ReactionBar

### Phase 9 — Visual QA + Launch
- `check-budgets.mjs` ratchet (JS 650KB/660KB, CSS 181KB/185KB, hydration load≤4/idle≤6/visible≤16, test files≥20)
- Route matrix smoke production 19 routes (16 public 200, redirect-pattern 2, 404 đúng)
- Demo `/dev/kernel` mở rộng (ErrorBoundary live crash/recovery)
- Dọn file mồ côi (WindowManagerProvider, focusScope); rollback runbook + dogfood checklist + waivers

### Hotfix production (trong quá trình)
- fix(ci): deploy.yml trỏ dist→build
- fix(ssr): thiếu import AppShell trong BaseLayout (ReferenceError trên Worker)
- fix(ui): getServerSnapshot cho useSyncExternalStore
- fix(ui): snapshot cache preferenceStore/commands (React #185)
- fix(gallery): thiếu import galleryQuery ở GalleryGrid (SSR crash /gallery) + smoke test chặn
- fix(ui): token gen `@theme` thay `:root` — utility Tailwind sinh đủ; bubble user AI gradient rõ ràng
- fix(ci): `.gitignore` bỏ ignore `artifacts/` — budget gate CI thiếu ui-budgets.json (ENOENT trên runner)- fix(gallery): GalleryLightbox thiếu import VISUAL_FILTERS — lightbox crash /gallery khi mở ảnh (re-export không tạo biến local); + jsdom test chặn đường code filter
- fix(a11y): SearchModal `sectionHeaderClass` chưa từng được định nghĩa — Ctrl+K crash khi có kết quả (bug tồn tại từ trước v5, TS gate bắt)
- fix(ai): AiChatStation `setIsE2EELoading` typo (crash nút MỞ KHÓA), xóa type ModelUsage trùng lặp, return failure thiếu model/durationMs
- fix(ui): WindowFrame import WindowEntry sai nguồn; windowStore restore action thiếu id; windowRuntime rect fallback; preferenceStore casts; SubmissionWizard `class=` → `className=` (nút đăng nhập mất style)
- fix(api): 5 file API thêm return type AuthResult — TS narrow `"error" in auth` hoạt động; ambient types cloudflare:sockets/workers; tsconfig types [node]
- chore: script `typecheck` (tsc --noEmit 78→0 lỗi) — gate khuyến nghị chạy tay trước push- ci: deploy.yml tái cấu trúc thành pipeline 8 bước có chú thích đầy đủ — checkout → npm ci (lockfile) → 7 gates (typecheck/test/lint/stylelint/build/policy/budget) → deploy; typecheck giờ là gate 1 chặn class lỗi thiếu import ngay trên CI