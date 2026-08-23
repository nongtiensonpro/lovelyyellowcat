# 📼 KẾ HOẠCH NÂNG CẤP TOÀN DIỆN GIAO DIỆN — LOVELYYELLOWCAT v3 "RETRO-OS"

> **Tài liệu định hướng vibe-coding** · Phiên bản 1.0 · Ngày soạn: 22/08/2026
> **Phạm vi:** Nâng cấp toàn bộ giao diện người dùng (public) + khu vực quản trị viên (/admin)
> **Trạng thái mã nguồn tham chiếu:** main @ tháng 08/2026 (Astro v7 SSR · React 19 · Tailwind v4 · Supabase · Cloudflare Workers · Cloudinary — ngân sách $0)

---

## MỤC LỤC

1. [Phân tích hiện trạng](#phan-1--phan-tich-hien-trang)
2. [Tầng nền: Design System v2](#phan-2--tầng-nền-design-system-v2)
3. [Nâng cấp giao diện người dùng](#phan-3--nâng-cấp-giao-diện-người-dùng)
4. [Nâng cấp quản trị viên — "LYC CONTROL PANEL 98"](#phan-4--nâng-cấp-quản-trị-viên--lyc-control-panel-98-)
5. [Database migrations](#phan-5--database-migrations--supabase_sqlsupabase_upgrade_v3_adminsql)
6. [API endpoints mới](#phan-6--api-endpoints-mới)
7. [Roadmap triển khai](#phan-7--roadmap-triển-khai-6-tuần-part-time)
8. [Rủi ro & lưu ý vận hành](#phan-8--rủi-ro--lưu-ý-vận-hành)

---

<a id="phan-1--phan-tich-hien-trang"></a>
## PHẦN 1 · PHÂN TÍCH HIỆN TRẠNG

### 1.1. Điểm mạnh (giữ nguyên & phát huy)

- **Design system token hóa tốt**: ~35 token màu (`src/styles/global.css:3-87`), shadow Win95 công thức inset 4 lớp, tier animation có `prefers-reduced-motion`, hybrid thẩm mỹ **Win95 × Dell-1996 catalog** rất nhất quán.
- **Admin nền tảng chắc**: middleware 2 tầng (`src/middleware.ts`) + RLS + trigger `protect_profile_sensitive_fields()` chống leo thang đặc quyền; luồng duyệt tranh đủ vòng đời (XP → notification → email); xóa cascade sạch cả DB lẫn Cloudinary (`src/lib/adminModeration.ts`).
- **Realtime đầy đủ** với Exponential Backoff tự phục hồi (BaseDelay 1500ms × 1.5^n, MaxDelay 5 phút).

### 1.2. Bảng vấn đề tổng hợp (theo mức nghiêm trọng)

| Mức | Vấn đề | Vị trí |
|---|---|---|
| 🔴 Nghiêm trọng | API `/api/ai/config` trả **apiKey gốc về client**, không auth | `src/pages/api/ai/config.ts:13-18` |
| 🔴 | Editor có quyền FOR ALL trên articles/submissions; dashboard không ẩn nút XÓA theo role | `middleware.ts:48`, RLS fixes |
| 🟠 Kiến trúc | Không có trang quản lý bài viết riêng — nhét vào dashboard, `select *` không phân trang/lọc | `admin/index.astro:93-96` |
| 🟠 | Audit log chỉ ghi user-management; duyệt tranh/xóa comment/xóa bài KHÔNG được ghi | bảng `admin_audit_log` |
| 🟠 | Hydration: **100% island dùng `client:load`**, SearchModal + NotificationBell nhân bản x2 mỗi trang | `HeaderNav.astro:96-235` |
| 🟡 UX | Comments admin: không filter/pagination, hiện raw `article_id`; submissions không lọc pending mặc định; `rejection_reason` không lưu dù schema có cột | `comments.astro:189-191`, `submissions.astro:119-166` |
| 🟡 | Thiếu: RSS, trang 404, bookmark bài viết, Web Share API; tag filter đọc `?tag=` không hoạt động; sitemap thiếu toàn bộ `/gallery/*` + `/artists` | `sitemap.xml.ts:21-42` |
| 🟡 A11y | Modal thiếu `role="dialog"`/focus trap; nút emoji không aria-label; text 7-8px phổ biến | nhiều nơi |
| ⚪ Design system | Thiếu table/badge/pagination/z-index scale/layout classes dùng chung; keyframes mồ côi | `global.css` |
| ⚪ Khác | ~100 dòng console.log production; stack trace hiển thị ra UI; code trùng lặp menubar × 6 trang admin | `admin/index.astro:25-152,163-174` |

---

<a id="phan-2--tầng-nền-design-system-v2"></a>
## PHẦN 2 · TẦNG NỀN: DESIGN SYSTEM v2

> Làm trước mọi thứ bên dưới — cả public lẫn admin đều tái sử dụng. Trích xuất từ gap giữa tài liệu thiết kế (`tailieu/Vaporwave_Design_System_va_Responsive_CSS.md`) và code thực tế.

### DS-1. Bổ sung component primitives vào `global.css`

```css
.win-table        /* bảng Win95: header gradient navy, row hover #000080/10,
                     ô viền sunken, variant .compact */
.badge-*          /* badge ngữ cảnh success/error/warning/info (đã có token state-*) */
.pagination-bar   /* thanh phân trang Win95: nút ◀ ▶ + dropdown "Trang 1/12" */
/* Z-index scale token hóa trong @theme (thay thế giá trị ad-hoc 9999/99999): */
--z-nav: 100; --z-modal: 9000; --z-toast: 9500; --z-lightbox: 9800; --z-crt: 9999;
.input-error / .input-ok / .select-vapor / .checkbox-vapor  /* checkbox Win95 ✓ xanh navy */
.progress-vapor   /* thanh tiến trình lõm + fill neon gradient (upload/analytics) */
.skeleton-win     /* skeleton loading kiểu dithered checkerboard Win95 */
```

### DS-2. Chuẩn hóa A11y trong `Win95Window.tsx` + modal

- Thêm `role="dialog"`, `aria-modal`, focus trap, đóng bằng Escape, trả focus về trigger.
- Fix touch-target: bỏ inline style 16×16 của nút `_ □ ✕` (vi phạm checklist 44px của chính dự án).
- Viết hook dùng chung `useFocusTrap()` tại `src/lib/a11y.ts`.

### DS-3. Dọn dẹp

- Gắn class cho keyframes `glitch-strong` đang mồ côi hoặc xóa bỏ.
- Token hóa hex rải rác: `#1084d0` → `--color-win-titlebar-accent`, footer `#0000ee` → `--color-dell-link`.
- Xóa dead code: `AiChatWindow.tsx` (~330 dòng không import), `CloudinaryUpload.tsx` (component mồ côi — chức năng upload đã nhúng trực tiếp trong ArticleEditor).

---

<a id="phan-3--nâng-cấp-giao-diện-người-dùng"></a>
## PHẦN 3 · NÂNG CẤP GIAO DIỆN NGƯỜI DÙNG

### P-A. Hiệu năng (quick-win ROI cao nhất)

| # | Việc | Chi tiết |
|---|---|---|
| 1 | **Hydration strategy** | ReactionBar + RealtimeComments → `client:visible`; SearchModal/NotificationBel mobile drawer → chỉ hydrate instance đang hiển thị (hiện nhân bản x2); AiChatStation → `client:idle`. Mục tiêu giảm ~40% JS hydrate mỗi trang. |
| 2 | **Bỏ re-fetch trùng SSR→client** | GalleryGrid nhận đủ props SSR nhưng mount lại fetch toàn bộ (`gallery/index.astro:51`, `favorites.astro:125`) → tin dữ liệu SSR làm first paint, chỉ fetch khi infinite scroll tải thêm. Đếm reactions bằng view `article_reaction_counts` (có sẵn) thay vì tải nguyên bảng về đếm tay (`GalleryGrid.tsx:49-61`). |
| 3 | **Cloudinary responsive transform** | Viết helper `cloudinaryUrl(publicId, 'thumb'\|'card'\|'full')` + srcset (Design Bible đã spec mục :1591-1617, chưa code): thumbnail grid dùng `f_auto,q_auto,w_400` thay URL gốc (`GalleryGrid.tsx:387`) → tiết kiệm ~80% băng thông ảnh. |
| 4 | **View count không chặn SSR** | `[slug].astro:67-70` UPDATE đồng bộ làm tăng TTFB mọi lượt đọc → chuyển sang RPC `increment_view_count()` chạy qua `ctx.waitUntil()`. |
| 5 | **Canvas & media lifecycle** | PixelText thêm IntersectionObserver pause ngoài viewport (hiện chỉ pause khi tab ẩn); hero video thêm `poster` + tôn trọng `navigator.connection.saveData`; đồng hồ taskbar chỉ tick khi tab visible. |
| 6 | **Fonts & script** | Giảm 5 họ Google Fonts xuống 3 (bỏ Orbitron/Outfit trái checklist của chính docs); reCAPTCHA script chỉ inject tại `/submit` thay vì mọi trang (`BaseLayout.astro:67`). |

### P-B. Tính năng mới theo khu vực

| Khu vực | Tính năng | Chi tiết kỹ thuật |
|---|---|---|
| **Tìm kiếm** | Unified Search | Mở rộng `/api/search` trả `{articles, artworks, artists}`; SearchModal hiển thị 3 nhóm có icon riêng. Xóa search rời rạc trong GalleryGrid. |
| **Bài viết** | Bookmark "đọc sau" | Dùng lại bảng `bookmarks` **đã có sẵn trong schema mà chưa từng dùng** (`master_latest.sql:236-241`) — nút 📑 lưu article, trang `/bookmarks`. |
| **Bài viết** | TOC + progress | Parse heading từ body_md SSR → sidebar "MỤC LỤC.CHM" scrollspy; thanh đọc tiến trình neon dưới titlebar; nhớ vị trí cuộn qua localStorage. |
| **Bài viết** | Share chuẩn | Thêm Web Share API (mobile) + nút Facebook/X như lightbox gallery đang có; hiện chỉ có copy link (`[slug].astro:507-521`). |
| **Bài viết** | Comment self-service | Sửa/xóa comment của chính mình trong 15 phút; nút 🚩 báo cáo vi phạm (tạo bảng `reports` → đẩy vào hàng đợi admin mới, xem Phần 4/A-4). |
| **Gallery** | Sửa bug tag filter | Click tag ở trang chi tiết (`gallery/[id].astro:181`) hiện vô tác dụng vì GalleryGrid không đọc `?tag=` → đọc và lọc server-side, kèm deep-link `?page=` cho SEO. |
| **Xã hội** | Follow nghệ sĩ | Bảng `follows`; nút ➕ trên profile; notification khi nghệ sĩ follow có tranh mới được duyệt. |
| **Trang chủ** | RSS + sitemap đủ | `/rss.xml` cho articles; bổ sung `/gallery/*`, `/artists` vào sitemap (đang thiếu toàn bộ — bất lợi SEO nghiêm trọng). |
| **Toàn cục** | Trang 404 Bluescreen | `404.astro` mô phỏng màn xanh Windows kèm ASCII art mèo vàng + nút về chủ — hiện redirect `?error=` thay status code thật. |
| **Trang chủ** | Newsletter | Form đăng ký → bảng `newsletter_subscribers` (lưu DB, admin export CSV — không cần dịch vụ email trả phí). |
| **Mobile** | Thu hẹp gap | CassettePlayer bản compact cho mobile thay `hidden md:block`; WordPad toolbar collapse thành dropdown "☰ Chèn"; drawer mobile khóa scroll nền (`overflow:hidden` trên body) + đóng bằng Escape; nút mark-read thông báo nâng lên ≥40px touch target. |

### P-C. A11y & Polish sweep (1 đợt duyệt toàn bộ)

1. Tất cả modal qua hook `useFocusTrap` + `role="dialog"`: SearchModal, GalleryLightbox, các alert ProfileEditor, modal WINHELP32 của ServerStatusWidget (`ServerStatusWidget.astro:641-735`). Tiêu chí: Tab không thoát ra ngoài, Escape đóng, focus quay về nút mở.
2. **Nút icon-only phải có `aria-label`**: chuông 🔔 (`NotificationBell.tsx:152`), các nút titlebar giả, `?` buttons rải rác (`[slug].astro:192`, `[userId].astro:136`) → thêm `aria-hidden="true"` cho emoji trang trí.
3. Alt text ngữ nghĩa (`alt="Banner {tên nghệ sĩ}"` thay `alt="Banner"`); thêm skip-to-content link vào BaseLayout.
4. Nâng chữ nhỏ nhất từ 7-8px lên ≥10px cho nội dung chính (giữ pixel-font chỉ cho nhãn trang trí).
5. Tab groups dùng `role="tablist"` + phím mũi tên (profile tabs, AI station menubar).

---

<a id="phan-4--nâng-cấp-quản-trị-viên--lyc-control-panel-98"></a>
## PHẦN 4 · NÂNG CẤP QUẢN TRỊ VIÊN — "LYC CONTROL PANEL 98" ⭐

> Triết lý thiết kế: biến `/admin` từ "5 trang form rời rạc" thành **một hệ điều hành quản trị thu nhỏ** — nhất quán với thẩm mỹ Win95 của site, nơi mọi thứ đều là cửa sổ, hàng đợi và thùng rác thật sự.

### A-1. Admin Shell thống nhất (nền móng)

Tạo `src/layouts/AdminLayout.astro` thay thế menubar đang copy-paste ở cả 6 trang:

```
┌─ C:\ADMIN\MISSION_CONTROL ────────────────────[ _ ][ □ ][ ✕ ]─┐
│ ┌───────────────────┐  ┌──────────────────────────────────────┐ │
│ │ 🏠 TỔNG QUAN      │  │                                      │ │
│ │ 📰 BÀI VIẾT   [3] │  │        NỘI DUNG TRANG HIỆN TẠI       │ │
│ │ 🖼 KIỂM DUYỆT  [7] │  │                                      │ │
│ │ 💬 BÌNH LUẬN      │  ├──────────────────────────────────────┤ │
│ │ 👤 NGƯỜI DÙNG     │  │ Ready  │ role=admin │ ▲ ONLINE 14:32  │ │
│ │ 🗑 THÙNG RÁC  [12]│  └──────────────────────────────────────┴──┘ │
└─────────────────────────────────────────────────────────────────┘
```

- Sidebar kiểu **Windows Explorer tree**: icon + tên + badge số lượng live (subscribe **1 kênh Realtime duy nhất** cho `submissions`/`reports`).
- Breadcrumb giả đường dẫn `C:\ADMIN\...` trên titlebar mỗi trang; statusbar hiển thị role + giờ + trạng thái kết nối WebSocket.
- **Role-aware**: editor không thấy Người dùng/Settings/Cron (icon 🔒 với admin-only); ẩn cả route-level lẫn UI-level.
- **Admin Command Palette** (Ctrl+K): tái dùng pattern SearchModal để nhảy trang/hành động ("duyệt", "viết bài", "tìm user @ten...").
- Kết quả: xóa toàn bộ ~60 dòng menubar trùng lặp × 6 trang (`admin/index.astro:186-188`, `users.astro`, `comments.astro`...).

### A-2. Dashboard → "Mission Control"

- **Sparkline SVG tự viết** (~40 dòng, không thêm thư viện — giữ triết lý $0): lượt xem 14 ngày, user mới, tranh gửi về.
- **Activity Feed realtime**: subscribe `audit_log` + `comments` + `submissions` → dòng sự kiện cuộn kiểu Windows Event Viewer ("🎬 @artist vừa gửi TRANH_X.PNG • 2 phút trước").
- Hàng quick-actions: "Duyệt N tranh đang chờ" → nhảy thẳng Moderation Hub với filter pending.
- Thay 5 head-count queries lặp ở menu mỗi trang bằng **1 RPC `get_admin_dashboard_stats()`** duy nhất.

### A-3. Article Manager `/admin/articles` (trang mới, tách khỏi dashboard)

- Bảng server-side `.win-table`: search ILIKE, filter status/tag/tác giả, phân trang 20/trang.
- **Bulk actions** checkbox: publish/unpublish/archive/soft-delete nhiều bài.
- Quick-toggle draft↔published inline; nút ⧉ nhân bản bài thành draft mới.
- **Scheduled publishing** ⭐: cột `scheduled_at`; **Cloudflare Workers Cron Trigger** (miễn phí) gọi `/api/cron/publish-scheduled` xác thực bằng secret header → bài tự lên sóng đúng hẹn. Picker datetime dựng theo style Date/Time Properties của Win95.

### A-4. Moderation Hub `/admin/moderation` — "OUTLOOK EXPRESS CHO ADMIN" ⭐⭐

Tính năng sáng tạo trọng tâm, gộp 3 nguồn vào **một hộp thư kiểm duyệt** 3 pane chuẩn Outlook Express:

```
[Folder Tree]  │  [Danh sách hàng đợi]      │ [Preview pane]
 📥 Inbox (7)  │  ☐ TRANH_X - @artist       │  Ảnh lớn + metadata
 ├ 🖼 Tranh (4) │  ☐ Comment spam @user1     │  + lịch sử vi phạm
 ├ 💬 Flagged(2)│  ☐ Report: bình luận xúc   │  + nút hành động
 └ 🚩 Reports(1)│                            │
```

- **Keyboard-first**: `J/K` di chuyển, `A` duyệt, `R` từ chối, `X` xóa, `B` ban tác giả, `Enter` xem chi tiết — duyệt hàng loạt tốc độ Gmail.
- Sửa bug: **lưu `rejection_reason` vào cột schema có sẵn** (`supabase_master_latest.sql:198`) mà code hiện đang bỏ qua (chỉ nhét vào notification payload).
- Hiện lịch sử vi phạm của tác giả ngay trong preview (số lần bị từ chối/ban) → quyết định nhanh hơn.
- **Auto-flag rules**: bảng `moderation_rules` (danh sách từ khóa cấu hình được) — comment/submission khớp → đánh dấu `is_flagged` đưa vào hàng đợi thay vì hiện public ngay.
- Thanh tiến độ "còn 7/23 mục hôm nay" tạo cảm giác hoàn thành (gamification cho chính admin).

### A-5. Analytics `/admin/analytics`

- Top 10 bài theo `view_count`, top tranh theo reactions/favorites (view `article_reaction_counts` có sẵn), leaderboard XP.
- Growth chart SVG 30 ngày (user/comment/submission) từ view `daily_stats`.
- **Export CSV** client-side (Blob + download, $0).
- Optional: nhúng token Cloudflare Web Analytics (miễn phí) vào tab phụ.

### A-6. Content Ops Suite

| Tính năng | Chi tiết |
|---|---|
| **Tag Manager** `/admin/tags` | CRUD bảng `tag_definitions` (RLS editor/admin đã có sẵn — `master:453-457`), hiển thị số lần dùng, cảnh báo tag mồ côi |
| **Badge & XP Manager** | Modal trên trang users: ±XP thủ công (RPC mới `adjust_xp` ghi audit), tặng/thu hồi huy chương kèm lý do — hiện chỉ có `award_xp` một chiều |
| **Featured Curator** ⭐ | Cột `is_featured` trên articles/submissions → section trang chủ mới "★ BÀI CHỌN LỌC" + "🏆 TRANH TUẦN", admin bật/tắt sao trực tiếp trong bảng |
| **Announcement System** ⭐ | Bảng `site_announcements` (type: banner/marquee/popup-win95, start/end) → BaseLayout render SSR vào MarqueeTicker; kèm nút "phát thông báo in-app hàng loạt" |

### A-7. Recycle Bin `/admin/trash` ⭐

- Refactor `deleteArticleWithRelations`/`deleteSubmissionWithRelations` thành **soft-delete** (`deleted_at`) + restore — hợp thẩm mỹ tuyệt đối với thùng rác Windows 95 (icon đổi đầy/rỗng theo số item).
- Tự purge sau 30 ngày bằng Cron; ảnh Cloudinary chỉ xóa thật khi purge.
- Khắc phục điểm yếu "hard-delete vĩnh viễn không thể hoàn tác".

### A-8. Audit Trail toàn diện

- Helper chung `logAdminAction()` gọi ở **mọi** mutation (hiện chỉ log role/ban — xóa bài, duyệt tranh, xóa comment đều thất thoát).
- Trang `/admin/audit-log`: filter action/admin/khoảng thời gian + phân trang server-side.

### A-9. Media Library `/admin/media`

- Grid tài nguyên Cloudinary (list qua Admin API server-side, key không bao giờ xuống client).
- Copy URL / copy markdown / xóa kèm **orphan-detection** (so PID với `body_md` + `cover_url` đang tham chiếu).
- Thay `window.prompt("URL ảnh")` trong ArticleEditor bằng picker chọn từ thư viện.

### A-10. Settings `/admin/settings` (admin-only)

- Bảng `site_settings` key-value: `maintenance_mode` (middleware render trang bảo trì Win95 cho non-admin), `submissions_open`, `comment_min_length`...
- Ghi `settings_change` vào audit log.

### A-11. Editor nâng cấp

Autosave localStorage mỗi 10s + khôi phục khi reopen; fullscreen distraction-free mode; SEO panel (`meta_description`); cảnh báo slug trùng trước submit.

### A-12. Phân quyền & Security hardening

1. **RLS scope editor**: chỉ UPDATE/DELETE articles/submissions **do mình viết** (`author_id = auth.uid()`), admin full — khắc phục việc editor hiện xóa được bài của admin khác.
2. UI ẩn nút XÓA trên dashboard với editor (đang hiện cho tất cả).
3. CSRF double-submit cookie cho mọi API mutation.
4. Dọn ~100 `console.log` production (`admin/index.astro:25-152`, `middleware.ts:9-72`) + bỏ stack trace ra UI (`index.astro:163-174`).

---

<a id="phan-5--database-migrations--supabase_sqlsupabase_upgrade_v3_adminsql"></a>
## PHẦN 5 · DATABASE MIGRATIONS — `supabase_sql/supabase_upgrade_v3_admin.sql`

Toàn bộ script **idempotent** (`IF NOT EXISTS` / `CREATE OR REPLACE`), chạy trên SQL Editor không phá dữ liệu cũ:

```sql
-- BẢNG MỚI
follows               (follower_id FK, artist_id FK, created_at, UNIQUE pair);
reports               (reporter_id, target_type CHECK IN ('comment','submission','article','user'),
                       target_id, reason, status DEFAULT 'open', resolved_by, created_at);
site_settings         (key TEXT PK, value JSONB, updated_by, updated_at);
site_announcements    (title, body, type CHECK ('banner','marquee','popup'), start_at, end_at, is_active);
newsletter_subscribers(email UNIQUE, subscribed_at, is_active);
moderation_rules      (pattern TEXT, field CHECK ('comment','submission'), is_active);

-- CỘT MỚI
ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false;
-- Partial index cho soft-delete:
CREATE INDEX IF NOT EXISTS idx_articles_alive ON articles (created_at DESC) WHERE deleted_at IS NULL;

-- RPC & VIEW
get_admin_dashboard_stats() RETURNS JSONB    -- gom 5 count queries cũ thành 1
increment_view_count(p_slug TEXT)            -- SECURITY DEFINER, không chặn SSR
adjust_xp(p_profile_id, p_amount, p_reason)  -- ghi audit, cho phép số âm
daily_stats VIEW                             -- GROUP BY date: new_users/articles/submissions/views

-- RLS: follows (select all, insert/delete self), reports (insert authed,
-- select own|admin), site_settings (update admin), announcements (select active|admin)
```

> ⚠️ Backup SQL trước khi chạy. Script phải chạy lại được an toàn.

<a id="phan-6--api-endpoints-mới"></a>
## PHẦN 6 · API ENDPOINTS MỚI

| Endpoint | Methods | Auth | Ghi chú |
|---|---|---|---|
| `api/admin/articles.ts` | GET/PATCH/DELETE | editor (DELETE: admin) | list phân trang, bulk, soft-delete |
| `api/admin/moderation.ts` | POST | editor/admin | approve/reject/delete/ban/resolve-report |
| `api/admin/tags.ts` · `badges.ts` · `settings.ts` · `media.ts` | CRUD | tương ứng role | |
| `api/cron/publish-scheduled.ts` · `purge-trash.ts` | GET | header `CRON_SECRET` | 2 Cron Trigger miễn phí |
| `api/reports.ts` · `follows.ts` · `bookmarks.ts` · `newsletter.ts` | POST | đăng nhập/public | |
| `api/search.ts` | GET | public | mở rộng multi-type |

> 🔴 **Hotfix ngay trước tất cả**: `src/pages/api/ai/config.ts:13-18` — chỉ trả `{hasKey}`, tuyệt đối không trả `apiKey`.

---

<a id="phan-7--roadmap-triển-khai-6-tuần-part-time"></a>
## PHẦN 7 · ROADMAP TRIỂN KHAI (≈6 tuần part-time)

| Giai đoạn | Nội dung | Tiêu chí nghiệm thu |
|---|---|---|
| **GĐ 0** (1-2 ngày) 🔴 | Hotfix security: ai/config, RLS editor scope, dọn console.log + stack trace | `curl /api/ai/config` không thấy key; editor không xóa được bài người khác |
| **GĐ 1** (tuần 1) | DS v2 primitives (`.win-table`, `.badge-*`, `.pagination-bar`, z-scale, `useFocusTrap`) + AdminShell chuyển 6 trang | `npm run build` sạch; mọi trang admin dùng chung shell, xóa hết menubar trùng |
| **GĐ 2** (tuần 2-3) | Article Manager + Moderation Hub + rebuild comments/submissions + audit mở rộng + migration core | Duyệt 10 tranh chỉ bằng phím tắt không chạm chuột; rejection_reason lưu DB |
| **GĐ 3** (tuần 4) | User-side: unified search, bookmark, TOC/Web Share, RSS/404, `?tag=` fix, hydration `client:visible`, newsletter | JS hydrate/trang giảm ≥40%; sitemap đủ gallery |
| **GĐ 4** (tuần 5) | Creative suite: Analytics, Featured, Announcements, Recycle Bin, Media Library, Settings | Cron publish đúng hẹn; restore từ thùng rác OK |
| **GĐ 5** (tuần 6) | A11y sweep + mobile polish + re-audit | Lighthouse mobile ≥90; axe-core 0 critical |

---

<a id="phan-8--rủi-ro--lưu-ý-vận-hành"></a>
## PHẦN 8 · RỦI RO & LƯU Ý

- **Free tier**: không lưu pageview raw (chỉ `daily_stats` aggregate) để giữ DB <500MB; admin feed gói vào **1** channel Realtime duy nhất (Supabase giới hạn concurrent connections).
- **Workers free 100k req/day**: cron chạy 1-2 lần/ngày hoàn toàn nằm trong hạn mức.
- **Migration**: backup SQL trước khi chạy; script phải idempotent để chạy lại an toàn.
- **Astro islands**: kiểm chứng `client:idle`/`client:visible` hoạt động ổn với Cloudflare adapter sau mỗi giai đoạn bằng `npm run build`.
- **Thẩm mỹ**: mọi component mới đi qua checklist Design Bible (chỉ dùng token màu, shadow Win95 công thức 4 lớp, reduced-motion tier).
- **Nếu thiếu thời gian**, Top 10 must-have theo thứ tự: security fixes → AdminShell → Article Manager → Moderation Hub → rejection_reason → hydration wins → RSS/404 → focus trap → audit mở rộng → Recycle Bin.

---

*Tài liệu này được sinh ra từ buổi phân tích codebase toàn diện ngày 22/08/2026. Khi vibe coding, hãy làm theo đúng thứ tự giai đoạn và cập nhật checkbox tiến độ tại đây.*

## ☑️ TIẾN ĐỘ THEO DÕI

- [x] GĐ 0 — Security hotfix ✅ (22/08/2026)
  - Fix `/api/ai/config` lộ key · AiChatStation chuyển BYOK-only · dọn log middleware/dashboard
  - **SQL cần chạy: `supabase_sql/supabase_phase0_security.sql`**
- [x] GĐ 1 — Design System v2 + AdminShell ✅ (22/08/2026)
  - Token z-index 9 tầng · .win-table/.badge-*/.pagination-bar/skeleton/select/checkbox · hook useFocusTrap
  - `AdminLayout.astro` sidebar Explorer + breadcrumb + statusbar · migrate 7 trang admin
  - Hydration: ReactionBar/RealtimeComments → client:visible, AiChatStation → client:idle
- [x] GĐ 2 — Admin core ✅ (22/08/2026)
  - Article Manager `/admin/articles`: filter/sort/pagination/bulk/toggle/nhân bản
  - API `/api/admin/articles.ts` GET/PATCH/DELETE
  - Comments: search + phân trang + join tiêu đề bài viết
  - Submissions: tab trạng thái mặc định pending + **lưu rejection_reason**
  - Helper `logAdminAction()` ghi audit mọi mutation
- [x] GĐ 3 — User-facing ✅ (22/08/2026)
  - RSS `/rss.xml` + sitemap đầy đủ gallery/artists · 404 Bluescreen
  - Bookmark bài viết (`/bookmarks`) dùng lại bảng bookmarks có sẵn
  - Unified Search Ctrl+K (bài viết + tranh + nghệ sĩ) có focus trap
  - Web Share API + FB/X · fix bug gallery `?tag=`
- [x] GĐ 4 — Creative admin suite ✅ (22/08/2026)
  - Settings + maintenance mode 503 · Analytics sparkline SVG + CSV export
  - Announcements WinPopup + banner toàn trang · Featured Curator section trang chủ
  - Recycle Bin soft-delete/restore/purge · Media Library Cloudinary signed API
  - **SQL cần chạy: `supabase_sql/supabase_upgrade_v3_admin.sql`** (sau phase0)
- [x] GĐ 5 — A11y & polish sweep ✅ (22/08/2026)
  - Skip-to-content BaseLayout + main#main-content
  - reCAPTCHA chỉ load tại /submit (giảm trọng lượng mọi trang)
  - HeaderNav drawer: khóa scroll nền + Escape + trả focus; đồng hồ pause khi tab ẩn
  - GalleryLightbox: role="dialog" + aria-modal + focus trap
  - NotificationBell aria-label · titlebar giả aria-hidden/tabindex=-1
  - PixelText pause khi ngoài viewport · hero video poster + tôn trọng saveData

### 📌 Việc còn lại cho bạn (thủ công)
1. Chạy 2 file SQL trên Supabase SQL Editor theo thứ tự: `phase0_security` → `upgrade_v3_admin`
2. Commit + push qua GitHub Desktop → CI/CD deploy lên Cloudflare Workers
3. (Tùy chọn) Tạo Cron Trigger trên Cloudflare Dashboard gọi `/api/cron/purge-trash` với header `CRON_SECRET` để tự động dọn thùng rác 30 ngày — hiện có thể bấm nút thủ công tại `/admin/trash`
4. Kiểm tra Lighthouse mobile sau deploy (mục tiêu ≥90)
