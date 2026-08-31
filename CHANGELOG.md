# CHANGELOG — lovelyyellowcat v5 "ULTIMATE OVERENGINEER"

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
- fix(ci): `.gitignore` bỏ ignore `artifacts/` — budget gate CI thiếu ui-budgets.json (ENOENT trên runner)
