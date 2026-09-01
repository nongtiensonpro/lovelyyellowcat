# Kế hoạch hoàn thiện chức năng Thông Báo (WinPopup Station)

## Kết quả audit (01/09/2026)

### Đã có sẵn — hoạt động
- Admin `announcements.astro`: create/toggle/delete + audit log + form đầy đủ
  (title/body/type/days). Server-rendered, SSR cookie auth.
- Bảng `site_announcements`: is_active, end_at, type (banner|marquee|popup).
- BaseLayout đọc announcement active và render **banner** phía public.
- `NotificationBell.tsx`: chuông user (comment_reply, submission_*,
  badge_earned) + realtime + mark read, dùng bảng `notifications`.
- API `/api/notifications`: mark_read / mark_all_read.
- `MarqueeTicker.astro`: chỉ chạy text mặc định — KHÔNG nhận text động.

### Lỗ hổng tìm thấy (theo đúng special spec)

1. **CRITICAL — type="marquee" không hiển thị**: admin chọn Marquee nhưng
   BaseLayout chỉ render banner. MarqueeTicker chỉ nhận prop text mặc định,
   BaseLayout không truyền nội dung announcement vào.
2. **CRITICAL — type="popup" không tồn tại**: admin tạo popup nhưng không
   component nào render popup Win95 một-lần (spec: "cửa sổ Win95 một lần").
3. **HIGH — BaseLayout lấy 1 announcement** (limit 1) trong khi 3 loại có thể
   chạy đồng thời; phải fetch is_active trong hạn, phân loại hiển thị.
4. **MEDIUM — dismiss banner không lưu**: tải lại trang banner vẫn hiện; spec
   Win95 popup một lần cần session-scoped dismiss (sessionStorage).
5. **LOW — admin trang không có thống kê** nhanh (đang chạy/hết hạn) và
   preview text marquee trước khi phát.
6. **LOW — a11y**: banner chưa có nút đóng; marquee thiếu pause on hover
   (chuẩn WCAG 2.2.2 cho moving text).

## Giải pháp

### A. Marquee động (fix CRITICAL 1)
- `MarqueeTicker.astro` nhận prop `announcement?: {id,title}` — khi có,
  prefix `[THÔNG BÁO]` + title, giữ text mặc định khi không có.
- BaseLayout: truyền announcement type=marquee vào MarqueeTicker.

### B. Popup Win95 một lần (fix CRITICAL 2 + MEDIUM 4)
- Component mới `AnnouncementPopup.astro`: render khi có type=popup active;
  cửa sổ Win95 giữa màn hình, titlebar + body + nút OK; script vanilla
  sessionStorage `lyc_ann_dismissed_<id>` — một lần mỗi session.
- role="dialog" aria-modal + focus nút OK khi mở; đóng = sessionStorage +
  remove DOM. Nút ✕ trên titlebar + nút OK.
- z-index token `--z-index-modal`.

### C. Banner dismiss (MEDIUM 4)
- Thêm nút ✕ vào banner BaseLayout, sessionStorage key per-announcement id;
  script inline kiểm tra trước khi hiện (progressive: element có sẵn nếu
  dữ liệu SSR đã chọn nó, JS ẩn đi nếu dismissed — không flash).

### D. BaseLayout fetch logic (fix HIGH 3)
- Fetch tối đa 10 announcement active trong hạn, chia theo type:
  marquee → truyền vào MarqueeTicker; banner → render banner (ưu tiên mới
  nhất); popup → AnnouncementPopup (mới nhất 1).

### E. Admin nâng cấp nhỏ (LOW 5)
- Thêm hàng thống kê: đang chạy / hết hạn / tổng; preview live marquee text
  trong form (JS thuần, không framework).

### F. A11y (LOW 6)
- Marquee: pause on hover/focus (`animation-play-state: paused` qua CSS
  `:hover`), giảm chữ chạy khi prefers-reduced-motion.
- Banner/popup: nút đóng có aria-label, role=dialog + aria-modal cho popup.

## Phạm vi file
- `src/components/MarqueeTicker.astro` — nhận announcement prop
- `src/components/AnnouncementPopup.astro` — MỚI
- `src/layouts/BaseLayout.astro` — fetch logic + truyền props + dismiss
- `src/pages/admin/announcements.astro` — thống kê + preview
- `src/styles/global.css` — pause-on-hover marquee (nếu cần)
- Test mới `tests/unit/announcements.test.ts` — pure logic: phân loại
  announcements, expiry check, marquee text builder, dismiss key builder.

## Không làm
- Không đổi schema DB (dùng đúng site_announcements hiện có).
- Không đụng NotificationBell/notifications (user inbox hoạt động tốt).
- Không đổi deploy.yml; không thêm dependency.

## Tiêu chí hoàn thành
- Tạo thông báo qua admin với từng loại → hiển thị đúng ở public:
  marquee chạy trong LIVE.SYS, banner dưới HeaderNav, popup hiện 1 lần
  rồi biến mất cho đến session sau.
- Dừng (toggle) hoặc hết hạn → biến mất khỏi public.
- Gates xanh: test/lint/typecheck/stylelint/policy/budget/build + smoke
  runtime: tạo popup qua UI admin → trang chủ hiện popup → đóng → refresh
  không hiện lại (cùng session), session mới hiện lại.

---

## KẾT QUẢ (hoàn tất 01/09/2026)

### Đánh giá ban đầu: CHƯA hoàn thiện (65%)

Trang admin tạo/sửa/xoá/tạm dừng hoạt động tốt, NHƯNG phía public:
1. BaseLayout chỉ lấy **1 announcement duy nhất** (`limit(1)`) rồi ép làm banner —
   admin chọn `type=marquee/popup` nhưng hiển thị luôn là banner.
2. **Popup type không tồn tại trên site** — tạo popup xong không có gì hiện.
3. **Banner không dismiss được** — không có nút đóng, không nhớ đã đọc.
4. Không có preview, không có thống kê.

### Đã hoàn thiện

| File | Thay đổi |
|---|---|
| `src/lib/announcementUtils.ts` (MỚI) | Pure logic: `partitionByType` (chia marquee/banner/popup, mỗi loại lấy mới nhất), `filterLive`, `isExpired` (fail-open), `marqueeTextFrom`, `dismissKey`, `safeIdToken` |
| `src/components/AnnouncementPopup.astro` (MỚI) | Cửa sổ Win95 `ANNOUNCE.EXE` — role=dialog + aria-labelledby, focus OK khi mở, đóng qua OK/✕/Esc/backdrop, **1 lần mỗi session** (sessionStorage theo id) |
| `src/components/MarqueeTicker.astro` | Nhận prop `announcement` → text `[THÔNG BÁO] title — body`; giữ fallback ticker tĩnh |
| `src/layouts/BaseLayout.astro` | Fetch 10 active → partition 3 loại; banner có nút ✕ dismiss theo session; render popup; script dismiss |
| `src/pages/admin/announcements.astro` | 4 ô thống kê (ĐANG PHÁT/TẠM DỪNG/HẾT HẠN/TỔNG) + **preview marquee live** cập nhật theo ô nhập |
| `src/styles/global.css` | `.marquee-pausable` pause on hover/focus (WCAG 2.2.2) + tắt hẳn với prefers-reduced-motion |
| `tests/unit/announcements.test.ts` (MỚI) | 9 test pure logic |

### Bug thật gặp & sửa trong lúc verify (smoke Chrome headless + CDP)

1. **Script popup `define:vars` + `document.currentScript.previousElementSibling`** —
   Astro bundle script tách khỏi vị trí trong DOM → `root` null → click OK không chạy.
   Fix: script bundled thường, query qua `data-dismiss-key` attribute.
2. **Script banner nằm sau `</html>`** — tôi append sai chỗ, Astro không xử lý.
   Fix: chuyển vào trước `</body>`.
3. **Race BootSplash** (z-10000, 7s) nuốt click đầu → smoke test phải đợi boot kết thúc.
4. Smoke test click banner lúc popup còn mở → trúng backdrop z-600 (kết quả giả).
   Bài học: đóng popup trước, rồi test banner.

### Verification — 7 gates xanh

- Test: 27 files / 257 tests (9 mới) · Lint 0/0 debt · Typecheck · Stylelint · policy:ui · budget:ui · Build · Prettier — tất cả PASS
- **Smoke E2E với dữ liệu production thật** (3 announcement "Meo Meo @/<3" user vừa tạo):
  popup hiện đúng → OK đóng + ghi key → banner ✕ đóng + ghi key → reload: cả hai vẫn ẩn → marquee vẫn chạy. **0 console exception.**

### Đề xuất sau này (chưa làm)

- Realtime: admin tạo xong popup hiện ngay không cần reload (hiện cache SSR per-request).
- NotificationBell cộng gộp popup mới làm badge "cửa sổ mới" thay vì chỉ list.
- i18n key "THÔNG BÁO HỆ THỐNG" — đang hard-code tiếng Việt.
