# CHANGELOG — lovelyyellowcat v5 "ULTIMATE OVERENGINEER"

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