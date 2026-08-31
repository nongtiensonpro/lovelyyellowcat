# KẾ HOẠCH DỌN NỢ ESLint — 397 WARNINGS (v5.1)

> Ngày: 2026-09 · Tiền đề: lint-baseline ratchet đã chốt (397, chỉ được GIẢM)
> Mỗi batch = 1 commit, phải qua đủ 7 gates (typecheck/test/lint/stylelint/build/policy/budget)
> Sau mỗi batch: `npm run lint:baseline` cập nhật ratchet (chỉ chấp nhận giảm)

## Nguyên tắc
1. **Ưu tiên theo giá trị bug**, không theo số lượng: rule có khả năng che bug thật xử lý trước.
2. **Không disable mù quáng**: mỗi chỗ đều đọc hiểu; ignore có chủ đích phải ghi lý do.
3. **Sửa tận gốc**: a11y sửa markup thật, không eslint-disable tràn lan.
4. **Mỗi batch nhỏ** (10–60 warnings), verify gates ngay — không nuốt lớn.

## Phân bổ 397 warnings → 8 batches

| Batch | Rule | Số | Độ khó | Giá trị bug | Lý do thứ tự |
|---|---|---|---|---|---|
| **4** | react-hooks/exhaustive-deps | 6 | Cao | ★★★ | Nhiều khả năng che bug state cũ nhất (deps sai = closure cũ) |
| **5** | no-unused-vars | 50 | Thấp | ★★ | Cơ học; dead code + biến sót có thể lộ bug; prefix `_` cho cố ý |
| **6** | no-console | 58 | Thấp | ★ | Phân loại: api/admin = log chủ đích (override theo path); frontend = bỏ |
| **7** | jsx-a11y/label-has-associated-control | 46 | Trung bình | ★★ | Sửa markup: htmlFor/id pairs — улучш доступ thật |
| **8** | jsx-a11y click/static/noninteractive (3 rule) | 28 | Trung bình | ★★ | Thêm keyboard handlers / role / đổi thành <button> |
| **9** | jsx-a11y alt/autofocus/role-required | 4 | Thấp | ★ | Số ít — sửa trực tiếp |
| **10** | no-unused-expressions | 5 | Thấp | ★ | Cơ học |
| **11+** | no-explicit-any | 200 | Cao (chia 6 sub-batch theo module) | ★★ | api/ (80) → lib/ (30) → components/ai (30) → components/gallery+admin (40) → ui/ (20) |

## Chi tiết từng batch

### Batch 4 — exhaustive-deps (6)
Xem từng chỗ: deps thiếu = state/props cũ trong closure. Sửa: thêm đủ deps hoặc
useRef pattern nếu cố ý. KHÔNG dùng disable-next-line nếu chưa ghi lý do.

### Batch 5 — no-unused-vars (50)
3 loại xử lý:
- Cố ý (catch(e) không dùng, import side-effect) → đổi tên `_var` (convention ESLint)
- Dead code thật → xóa + ghi commit
- Sót do refactor → kiểm tra có phải bug thiếu logic không trước khi xóa

### Batch 6 — no-console (58)
- `src/pages/api/**`, `src/lib/emailNotification.ts`, middleware: log server có chủ đích
  → eslint.config thêm override `"no-console": "off"` cho các path này (ghi lý do)
- Frontend components/pages: console.error giữ (error path), console.log bỏ
- Không dùng blanket off toàn repo

### Batch 7 — label-has-associated-control (46)
Markup sửa: mỗi <label> cần htmlFor="<id>" + control có id tương ứng. Với label
bọc control (wrapping) → cấu hình rule chấp nhận. Ưu tiên: admin pages trước
(form dày nhất), rồi components.

### Batch 8 — keyboard interactions (28)
- div/span onClick → đổi <button type="button"> nếu là nút thật
- Nhạc/hero canvas cần pointer → thêm role+tabIndex+onKeyDown hoặc eslint-disable 1 dòng có lý do
- alt-text 2 chỗ: thêm alt mô tả

### Batch 9+ — no-explicit-any (200, 6 sub-batch)
Thứ tự module (nhỏ → lớn để quen pattern):
1. ui/ (~20): types kernel đã rõ
2. lib/ (~30): supabase client types, cloudinary response
3. components/ai (~30): ChatMessage/StreamResult đã có interface
4. components/gallery+admin (~40): GalleryItem/Submission đã mở rộng
5. pages/api (~80): body parsing → type assertion tường minh `as SpecificType`
6. pages/*.astro inline scripts: script type="module" trong .astro — AST parser giới hạn → review riêng
Kỹ thuật chuẩn: `const body = (await request.json()) as SomeType;` — KHÔNG `any`.

## Hoàn thành
- [x] Batch 4 exhaustive-deps (6) — DONE: ReactionBar/GalleryGrid/NotificationBell/RealtimeComments wrap useCallback+deps; GalleryLightbox bọc 8 handler; WindowFrame đã sạch từ fix trước
- [x] Batch 5 no-unused-vars (50→0) — DONE: imports dead xóa, catch(e) → catch, dead props/refs xóa, AppShell side-effect import; AI dead code -4KB; GalleryLightbox bỏ fetch thừa (tiết kiệm 1 request network mỗi copy)
- [x] Batch 6 no-console (58→0) — DONE: đọc 58/58 chỗ, quyết định ops-discipline: error-path logging giữ (error/warn), frontend cấm console.log, server paths (api/lib/middleware/admin) off; override có comment trong eslint.config
- [ ] Batch 7 label a11y (46)
- [ ] Batch 8 keyboard a11y (28)
- [ ] Batch 9 a11y số ít (4)
- [ ] Batch 10 unused-expressions (5)
- [ ] Batch 11 no-explicit-any (200) — 6 sub-batches
- **Đích: 0 warnings → bỏ rule khỏi override warn, nâng về error thật**
