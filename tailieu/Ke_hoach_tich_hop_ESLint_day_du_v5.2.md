# KẾ HOẠCH TÍCH HỢP ESLint ĐẦY ĐỦ — v5.2

> Ngày: 2026-09-01 · Tiền đề: audit ESLint sau v5.1 — lint đã là gate CI thật (0 problems, ratchet 0) nhưng còn 6 khoảng trống hardening
> Mỗi batch: sửa xong chạy đủ `npm run lint · typecheck · test · build` — 0 warnings là điều kiện (ratchet=0, mọi warning mới = fail)
> Ràng buộc: KHÔNG đụng deploy.yml; KHÔNG tự commit (user tự push); sửa tận gốc, không disable mù quáng

## Khoảng trống từ audit → phân bổ batch

| # | Khoảng trống (bằng chứng) | Batch | Ưu tiên |
|---|---|---|---|
| 1 | `react-hooks/exhaustive-deps` chỉ WARN — mâu thuẫn comment "(error)" trong config (print-config: severity 1) | A | P1 |
| 2 | `update-lint-baseline.mjs` chỉ so TỔNG: mô phỏng rule-a 1→2 + rule-b 3→1 (tổng 4→3) vẫn được chấp nhận | B | P1 |
| 3 | 3 rule jsx-a11y off toàn bộ `**/*.astro` (label/click/static) — 48 file .astro không được kiểm | C | P1/P2 |
| 4 | `no-console` off cả `src/lib/**` — `supabaseBrowser.ts` là module browser (islands import) | A | P2 |
| 5 | `astro.config.mjs` bị ignore dù `--no-ignore` lint sạch (0 message) | A | P2 |
| 6 | Doc lệch thực tế: WAIVERS W-8 còn ghi "472 warnings"; comment config stale; disable trong WindowFrame thiếu lý do | A+D | P2 |

## Batch A — Config hardening
- [ ] `react-hooks/exhaustive-deps` → `"error"` tường minh (sau spread recommended rules)
- [ ] Bỏ `astro.config.mjs` khỏi `ignores` (đã verify 0 lỗi khi lint `--no-ignore`)
- [ ] Thêm `{ linterOptions: { reportUnusedDisableDirectives: "error" } }` — stale eslint-disable = error ngay tại lint, không đợi ratchet (ratchet không đếm message ruleId=null)
- [ ] Thu hẹp `no-console`: các file lib chạy ở browser (grep islands import xác nhận danh sách) quay lại `["warn", { allow: ["error", "warn"] }]`
- [ ] Sửa comment stale block "v5 hotfix gate" (mô tả đúng trạng thái v5.2)
- Verify: lint 0/0 · typecheck · test · build

## Batch B — Ratchet per-rule
- [ ] Tách logic thuần `scripts/lint-baseline-core.mjs` (+ `.d.mts` khai báo kiểu cho tsc): `countWarnings / totalOf / checkRatchet / nextBaseline`
- [ ] `check-lint-debt.mjs` + `update-lint-baseline.mjs` dùng core; update CHỈ chấp nhận khi không rule nào tăng (kể cả rule mới xuất hiện)
- [ ] `tests/unit/lintBaselineCore.test.ts` — đủ ca kể cả hồi quy: "tổng giảm nhưng 1 rule tăng → TỪ CHỐI"
- Verify: vitest (228 + N pass) · lint · typecheck

## Batch C — A11y .astro: thí nghiệm trước khi đổi config
- [ ] Probe bằng config tạm `.lyc-eslint-probe.mjs` (.gitignore đã sẵn `.lyc-*`): bật lần lượt 3 rule cho `**/*.astro`, đếm warning thật trên 48 file
- [ ] Rule ra 0 warning → bật lại thật (nâng khỏi off); warning là bug thật → sửa markup tận gốc rồi bật; false-positive parser → giữ off + comment chính xác theo từng rule + ghi W-9
- Verify: lint 0/0 · build

## Batch D — Đồng bộ tài liệu
- [ ] `docs/runbooks/WAIVERS.md`: W-8 → resolved (v5.1 dọn xong, baseline 0); thêm W-9 nếu còn exception
- [ ] `CHANGELOG.md`: mục [5.2] ghi các thay đổi hardening
- [ ] `src/ui/shell/WindowFrame.tsx:35`: ghi lý do cho disable exhaustive-deps
- [ ] Tick checkbox + điền kết luận trong file này bằng số liệu gates thật

## Kết luận — HOÀN THÀNH (2026-09-01)

**Kết quả gates sau toàn bộ 4 batch (số liệu thật lần chạy cuối):**
- `npm run lint` — rc=0: `LINT DEBT OK (tổng hiện tại: 0 / baseline 0)`; strict `--max-warnings 0` = 0 message trên 183 file
- `npm run typecheck` — rc=0
- `npm run test` — rc=0: **26 file / 240 tests** (228 cũ + 12 mới `lintBaselineCore.test.ts`)
- `npm run build` — rc=0 (prebuild tokens:check 12/12 contrast pass)

**Per-batch:**
- Batch A: exhaustive-deps=error (probe stdin: severity 2) · astro.config được lint (0 message) · no-console lại trên 5 lib browser (probe print-config: supabaseBrowser=[1,allow e/w], emailNotification=off) · directive chết = error (probe: rc=1)
- Batch B: core module + 2 script + 12 test. End-to-end qua script thật (baseline tạm, đã hoàn nguyên, `git diff artifacts/` trống): check từ-chối `rule-a (2 > 1)` rc=1; update từ-chối "tổng giảm nhưng rule tăng" rc=1 KHÔNG ghi đè; update chấp nhận giữ-nguyên+giảm rc=0; check dưới baseline mới rc=0
- Batch C: probe 48 file .astro → click/static = 0 warning (bật lại thật); label = 21 (16 false-positive for=+id khớp, 1 wrapping chuẩn HTML, 4 BUG THẬT) → sửa tận gốc users.astro ×3 + comments.astro ×1 (id theo comment.id — form lặp), label giữ off + W-9
- Batch D: CHANGELOG [5.2], WAIVERS W-8 resolved + W-9 mới, WindowFrame lý do mount-only, block comment config cập nhật

**Số dư lỗ hổng audit v1 → sau v5.2:** 6 → 0 (1 sửa tận gốc markup, 4 sửa config/tooling, 1 sửa docs).
