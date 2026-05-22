# **KẾ HOẠCH PHÁT TRIỂN TÍNH NĂNG NÂNG CAO**
# **WEBSITE TẠP CHÍ NGHỆ THUẬT VAPORWAVE**

> **Tiền đề:** Tài liệu này tiếp nối trực tiếp từ *"Kế hoạch chi tiết xây dựng website tạp chí nghệ thuật Vaporwave"* — tại thời điểm viết tài liệu này, hệ thống đã hoàn thiện và ổn định các tính năng cốt lõi: **Supabase Database + RLS, Google OAuth SSR, Cloudinary Unsigned Upload, Realtime Comments WebSocket, giao diện Vaporwave/Win95 và CI/CD Cloudflare Pages.**
>
> Tất cả tính năng nâng cao dưới đây được thiết kế để **không phá vỡ kiến trúc Jamstack hiện tại**, duy trì hạn mức **0 USD** và tương thích với môi trường runtime Cloudflare Pages (Edge).

---

## **TỔNG QUAN LỘ TRÌNH PHÁT TRIỂN NÂNG CAO**

```
Giai đoạn A  →  Hệ thống Nội dung & CMS trong trình duyệt
Giai đoạn B  →  Tương tác Xã hội & Gamification
Giai đoạn C  →  Tìm kiếm, Khám phá & SEO
Giai đoạn D  →  Phòng Triển lãm Cộng đồng  ← TRỌNG TÂM
─────────────────────────────────────────────────────────
Lộ trình tương lai (khi có lượng người dùng đáng kể):
  Phase X  →  Hệ thống Thông báo & Realtime Nâng cao
  Phase Y  →  Hiệu năng, Caching & Bảo mật Nâng cao
  Phase Z  →  PWA & Trải nghiệm Offline
```

---

## **GIAI ĐOẠN A: HỆ THỐNG NỘI DUNG & CMS TRONG TRÌNH DUYỆT**

### **A1. Bảng điều khiển Admin (Admin Dashboard)**

**Mục tiêu:** Xây dựng trang quản trị nội bộ dành cho biên tập viên — đăng bài, kiểm duyệt, quản lý người dùng — không cần dịch vụ CMS bên ngoài.

**Cách tiếp cận kiến trúc:**

Tạo route `/admin` trên Astro được bảo vệ bởi middleware. Middleware kiểm tra `profile.role` trong Supabase (thêm cột `role` vào bảng `public.profiles` với giá trị mặc định `'reader'`, chỉ admin mới có `'admin'` hoặc `'editor'`). Toàn bộ trang `/admin/*` render SSR, không có phiên bản static.

**Cấu trúc CSDL bổ sung cần thêm:**

Thêm cột `role` vào bảng `public.profiles`:
```sql
alter table public.profiles
  add column role text not null default 'reader'
  check (role in ('reader', 'editor', 'admin'));
```

Tạo bảng `public.articles` đầy đủ để lưu bài viết do admin tạo trực tiếp trên web:
```sql
create table public.articles (
  id           uuid    default gen_random_uuid() primary key,
  slug         text    unique not null,
  title        text    not null,
  excerpt      text,
  body_md      text    not null,
  cover_url    text,
  author_id    uuid    references public.profiles(id),
  status       text    not null default 'draft'
               check (status in ('draft', 'published', 'archived')),
  tags         text[]  default '{}',
  view_count   integer default 0,
  created_at   timestamptz default now(),
  published_at timestamptz
);

alter table public.articles enable row level security;

-- Công khai có thể đọc bài đã xuất bản
create policy "Đọc bài đã xuất bản" on public.articles
  for select using (status = 'published');

-- Chỉ editor/admin mới được ghi
create policy "Editor/Admin ghi bài" on public.articles
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('editor', 'admin')
    )
  );
```

**Middleware bảo vệ route `/admin`:**

Tạo file `src/middleware.ts`. Trong hàm `onRequest`, lấy session từ Supabase Server Client, truy vấn `profile.role`. Nếu role không phải `admin` hoặc `editor`, redirect về trang chủ kèm query param `?error=unauthorized`. Sử dụng Astro `sequence()` để kết hợp nhiều middleware layer.

**Các trang admin cần xây dựng:**

- `/admin/index.astro` — Dashboard tổng quan: số bài viết, lượt xem 7 ngày qua, bình luận chờ duyệt
- `/admin/articles/new.astro` — Trình soạn thảo Markdown với live preview hai cột
- `/admin/articles/[id]/edit.astro` — Chỉnh sửa bài đã có
- `/admin/comments.astro` — Danh sách bình luận với nút duyệt/xóa
- `/admin/users.astro` — Quản lý quyền người dùng

**Trình soạn thảo Markdown:**

Sử dụng thư viện `@uiw/react-md-editor` (hỗ trợ preview realtime). Kết hợp component `CloudinaryUpload.tsx` đã có để nhúng ảnh trực tiếp vào Markdown — khi upload xong, tự động chèn cú pháp `![alt](secure_url)` vào vị trí con trỏ. Gửi nội dung qua API route `/api/articles` (POST/PATCH) kiểm tra role phía server trước khi upsert vào Supabase.

---

### **A2. Hệ thống Tag & Phân loại Bài viết**

**Mục tiêu:** Cho phép người dùng lọc bài viết theo chủ đề, phong cách nghệ thuật.

**Cách tiếp cận:**

Bảng `public.articles` đã có cột `tags text[]`. Tạo thêm bảng `public.tag_definitions` để quản lý danh sách tag chính thức:
```sql
create table public.tag_definitions (
  slug  text primary key,
  label text not null,
  color text not null  -- mã hex màu neon Vaporwave
);
```

Trên trang chủ `index.astro`, fetch distinct tags từ `articles.tags` và render thanh lọc ngang kiểu Win95 toolbar — mỗi tag là một nút bấm nhỏ với màu neon riêng biệt. Khi click tag, cập nhật URL query param `?tag=synth-art` và Astro SSR fetch lại danh sách bài lọc theo tag bằng Supabase `@>` array operator:
```sql
select * from public.articles
where status = 'published'
  and tags @> array['synth-art']::text[];
```

Cho phép nhiều tag được chọn cùng lúc bằng cách xử lý `?tag=synth-art&tag=retro-pixel` — parse thành mảng và dùng `&&` (overlap) operator.

---

### **A3. Hệ thống Submission Tác phẩm Nghệ thuật của Cộng đồng**

**Mục tiêu:** Cho phép người dùng đã đăng nhập gửi tác phẩm nghệ thuật lên phòng triển lãm cộng đồng, chờ admin duyệt.

**Cấu trúc CSDL:**

```sql
create table public.submissions (
  id           uuid    default gen_random_uuid() primary key,
  author_id    uuid    references public.profiles(id) on delete cascade,
  title        text    not null,
  description  text,
  image_url    text    not null,   -- secure_url từ Cloudinary
  image_pid    text    not null,   -- public_id Cloudinary (để xóa nếu từ chối)
  status       text    not null default 'pending'
               check (status in ('pending', 'approved', 'rejected')),
  tags         text[]  default '{}',  -- tag phong cách nghệ thuật
  reviewed_by  uuid    references public.profiles(id),
  reviewed_at  timestamptz,
  created_at   timestamptz default now()
);

alter table public.submissions enable row level security;

-- Tác giả xem được submission của chính mình
create policy "Xem submission bản thân" on public.submissions
  for select to authenticated using (auth.uid() = author_id);

-- Công khai xem submission đã được duyệt
create policy "Công khai xem tranh đã duyệt" on public.submissions
  for select using (status = 'approved');

-- Tác giả gửi submission
create policy "Gửi submission mới" on public.submissions
  for insert to authenticated with check (auth.uid() = author_id);

-- Admin quản lý tất cả
create policy "Admin quản lý tất cả submission" on public.submissions
  for all to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
```

**Luồng hoạt động:**

Trang `/submit.astro` render form hai bước kiểu Win95 wizard: Bước 1 — Upload ảnh qua `CloudinaryUpload.tsx` lấy `secure_url` và `public_id`. Bước 2 — Điền tiêu đề, mô tả, tag phong cách rồi submit lên `/api/submissions` (POST). API route kiểm tra session, insert vào `public.submissions`. Admin vào `/admin/submissions.astro` duyệt: click "Phê duyệt" gọi PATCH đổi `status = 'approved'`; click "Từ chối" đổi `status = 'rejected'` (xóa ảnh Cloudinary xử lý thủ công hoặc để dọn theo lịch).

---

## **GIAI ĐOẠN B: TƯƠNG TÁC XÃ HỘI & GAMIFICATION**

### **B1. Hệ thống Reaction Tác phẩm**

**Mục tiêu:** Người dùng có thể bày tỏ cảm xúc với tác phẩm bằng hệ thống reaction emoji phong cách Vaporwave.

**Cấu trúc CSDL:**

```sql
create table public.reactions (
  id            uuid    default gen_random_uuid() primary key,
  submission_id uuid    references public.submissions(id) on delete cascade,
  profile_id    uuid    references public.profiles(id) on delete cascade,
  emoji         text    not null
                check (emoji in ('💾', '📼', '🌊', '🎮', '🌸')),
  created_at    timestamptz default now(),
  unique (submission_id, profile_id, emoji)  -- mỗi người chỉ react 1 lần/emoji/tranh
);

alter table public.reactions enable row level security;

create policy "Xem tất cả reactions" on public.reactions
  for select using (true);

create policy "Người dùng đã đăng nhập react" on public.reactions
  for insert to authenticated with check (auth.uid() = profile_id);

create policy "Xóa reaction của bản thân" on public.reactions
  for delete to authenticated using (auth.uid() = profile_id);
```

**Tạo Supabase View tổng hợp count:**

```sql
create view public.submission_reaction_counts as
  select
    submission_id,
    emoji,
    count(*) as total
  from public.reactions
  group by submission_id, emoji;
```

**Cách triển khai component:**

Tạo `src/components/ReactionBar.tsx` (client:load). Component fetch ban đầu reaction count từ view trên. Người dùng click emoji: gọi Supabase `upsert` hoặc `delete` tùy trạng thái hiện tại. Đăng ký Supabase Realtime channel trên bảng `reactions` với filter `submission_id=eq.{submissionId}` để cập nhật số đếm realtime cho tất cả người xem — không cần reload trang. Hiệu ứng: khi click, emoji phóng to 150% với keyframe CSS rồi thu về, kèm particle nhỏ bắn ra 4 hướng bằng `transform: translate` random.

---

### **B2. Trang Hồ sơ Công khai Nghệ sĩ**

**Mục tiêu:** Mỗi người dùng có trang profile riêng trưng bày tác phẩm đã được duyệt và thông tin nghệ sĩ.

**Route:** `/profile/[userId].astro`

**Cấu trúc CSDL bổ sung:**

```sql
alter table public.profiles
  add column bio          text,
  add column banner_url   text,    -- ảnh bìa profile từ Cloudinary
  add column social_links jsonb default '{}';
  -- ví dụ: {"instagram": "...", "twitter": "...", "artstation": "..."}
```

**Trang profile cần hiển thị:**

- Banner ảnh toàn chiều ngang với hiệu ứng parallax cuộn nhẹ (CSS `background-attachment: fixed` fallback)
- Avatar, tên, bio trong khung Win95 với viền inset shadow
- Tab điều hướng Win95 style: **[Tác Phẩm] [Bình Luận] [Thông tin]**
- Gallery masonry toàn bộ tranh đã được duyệt của nghệ sĩ này
- Thống kê nhỏ: tổng tác phẩm, tổng reactions nhận được, ngày tham gia

**Trang chỉnh sửa profile:** `/profile/edit.astro` — bảo vệ bằng kiểm tra `auth.uid() === userId`, form cập nhật bio + banner (CloudinaryUpload) + social links. Gọi PATCH `/api/profile` → Supabase update.

---

### **B3. Hệ thống Điểm Đóng góp & Badge**

**Mục tiêu:** Tạo động lực đóng góp nội dung bằng hệ thống điểm kinh nghiệm và huy hiệu phong cách game cổ điển.

**Cấu trúc CSDL:**

```sql
create table public.user_points (
  profile_id  uuid references public.profiles(id) on delete cascade primary key,
  total_xp    integer default 0,
  level       integer default 1,
  updated_at  timestamptz default now()
);

create table public.badges (
  id          serial primary key,
  slug        text unique not null,
  label       text not null,
  description text,
  icon_emoji  text,
  xp_required integer default 0
);

create table public.user_badges (
  profile_id uuid references public.profiles(id) on delete cascade,
  badge_id   integer references public.badges(id),
  earned_at  timestamptz default now(),
  primary key (profile_id, badge_id)
);
```

**Logic trao điểm qua Supabase Database Function:**

Tạo PostgreSQL function `public.award_xp(p_profile_id uuid, p_action text)` sử dụng `CASE` để quy đổi hành động → điểm (ví dụ: gửi tranh được duyệt = 50 XP, bình luận = 5 XP, nhận reaction = 2 XP). Function này được gọi từ các Database Trigger sau khi update `status = 'approved'` trên `submissions`, insert vào `comments`, insert vào `reactions`. Sau khi cộng XP, trigger kiểm tra các ngưỡng badge và insert vào `user_badges` nếu đủ điều kiện. **Ưu điểm:** logic chạy hoàn toàn trong PostgreSQL, không cần server thêm.

Hiển thị level và badge bằng CSS thuần: badge render dạng huy hiệu 8-bit pixel art vẽ bằng `box-shadow` nhiều lớp (kỹ thuật CSS pixel art), không cần ảnh.

---

## **GIAI ĐOẠN C: TÌM KIẾM, KHÁM PHÁ & SEO**

### **C1. Full-Text Search Tiếng Việt**

**Mục tiêu:** Thanh tìm kiếm real-time tìm tác phẩm theo tiêu đề, mô tả, tag.

**Cách tiếp cận với Supabase:**

PostgreSQL hỗ trợ full-text search nhưng tiếng Việt cần cấu hình riêng. Giải pháp thực tế nhất trong giới hạn free tier: tạo cột `search_vector` sử dụng `tsvector` với `simple` dictionary (không stemming, phù hợp tiếng Việt vì không cần normalize):

```sql
alter table public.submissions
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(tags, ' ')), 'C')
  ) stored;

create index submissions_search_idx on public.submissions using gin(search_vector)
  where status = 'approved';  -- chỉ index tranh đã duyệt
```

**API route `/api/search?q=`:**

Route nhận query string, sanitize (loại bỏ ký tự đặc biệt), split thành mảng từ, join bằng ` & ` thành tsquery expression. Truy vấn:
```sql
select id, title, description, image_url, ts_rank(search_vector, query) as rank
from public.submissions, to_tsquery('simple', $1) query
where status = 'approved'
  and search_vector @@ query
order by rank desc
limit 12;
```

**Component tìm kiếm `SearchModal.tsx`:**

Hiển thị như cửa sổ Win95 popup trung tâm màn hình. Input gõ trigger debounce 300ms rồi fetch `/api/search`. Kết quả hiện dưới dạng grid thumbnail nhỏ 3 cột với highlight từ khóa khớp (wrap từ khóa trong `<mark>` styled màu neon). Phím tắt `Ctrl+K` / `Cmd+K` toggle modal. Nhấn ESC đóng.

---

### **C2. Tối ưu SEO & Open Graph**

**Mục tiêu:** Mỗi trang article có meta tags đầy đủ, OG image động, structured data JSON-LD.

**Open Graph Image Động:**

Cloudinary có thể tạo OG image tự động từ URL transformation. Dùng URL pattern:
```
https://res.cloudinary.com/{cloud_name}/image/upload/
  l_text:Arial_48_bold:{TITLE},co_white,g_south_west,x_60,y_80/
  l_text:Arial_24:{AUTHOR},co_rgb:ff71ce,g_south_west,x_60,y_40/
  b_rgb:0b001a,w_1200,h_630,c_fill/
  {cover_image_public_id}
```
Nếu bài không có ảnh bìa, dùng ảnh mặc định nền Vaporwave gradient với text overlay. Build URL này trong `[slug].astro` frontmatter và nhét vào `<meta property="og:image">`.

**Structured Data JSON-LD:**

Trong `[slug].astro`, render thẻ `<script type="application/ld+json">` với schema `Article` đầy đủ: `headline`, `author` (type Person), `datePublished`, `image`, `publisher`. Schema này giúp Google hiển thị rich snippet trong kết quả tìm kiếm.

**Sitemap tự động:**

Tạo `src/pages/sitemap.xml.ts` — API route trả về `Content-Type: application/xml`. Fetch tất cả bài `status = 'published'` từ Supabase, render XML sitemap chuẩn với `<lastmod>` từ `published_at`. Đăng ký URL sitemap trong `robots.txt` (`src/pages/robots.txt.ts`).

---

### **C3. Bài viết Liên quan (Related Articles)**

**Mục tiêu:** Dưới mỗi bài, hiển thị 3 bài liên quan thông minh dựa trên tag chung.

**Cách tiếp cận PostgreSQL:**

Tạo Supabase RPC function `get_related_articles(p_slug text, p_limit int)`:
```sql
create or replace function public.get_related_articles(p_slug text, p_limit int default 3)
returns setof public.articles as $$
  select a.*
  from public.articles a
  cross join public.articles source
  where source.slug = p_slug
    and a.slug != p_slug
    and a.status = 'published'
    and a.tags && source.tags   -- overlap operator: có ít nhất 1 tag chung
  order by array_length(array(
    select unnest(a.tags)
    intersect
    select unnest(source.tags)
  ), 1) desc,
  a.published_at desc
  limit p_limit;
$$ language sql stable;
```

Gọi RPC này trong `[slug].astro` song song với query bài viết chính bằng `Promise.all()` để không tăng latency trang.

---

## **GIAI ĐOẠN D: PHÒNG TRIỂN LÃM CỘNG ĐỒNG**

> Đây là trọng tâm của giai đoạn này — xây dựng không gian ngắm tranh cộng đồng đẹp mắt, mượt mà và thẩm mỹ nhất có thể. Mọi quyết định kỹ thuật đều phục vụ mục tiêu: **người dùng chìm đắm vào tranh, không bị phân tâm.**

---

### **D1. Trang Gallery Chính (`/gallery`)**

**Mục tiêu:** Trang triển lãm ảnh toàn bộ tác phẩm cộng đồng đã được duyệt — layout đẹp, tải nhanh, cuộn mượt.

**Layout Masonry Thuần CSS:**

Không dùng thư viện JavaScript nặng. Sử dụng CSS `columns` property:
```css
.gallery-masonry {
  columns: 3 260px;   /* tự động co về 2 cột → 1 cột trên mobile */
  column-gap: 1rem;
}
.gallery-item {
  break-inside: avoid;
  margin-bottom: 1rem;
  display: block;
}
```
Mỗi card ảnh có viền kiểu Win95 inset với glow neon `box-shadow` khi hover, transition `transform: scale(1.02)` mượt mà.

**Phân trang vô hạn (Infinite Scroll):**

Thay vì pagination truyền thống (làm gián đoạn trải nghiệm ngắm), dùng `IntersectionObserver` theo dõi phần tử "sentinel" ẩn ở cuối danh sách. Khi sentinel vào viewport, fetch thêm 12 ảnh tiếp theo từ Supabase với `range(offset, offset + 11)` và append vào DOM. Không reload trang, không mất vị trí cuộn. Hiển thị loading skeleton Win95 style (ô xám nhấp nháy) khi đang fetch.

**Lọc và Sắp xếp:**

Thanh công cụ ngang cố định (sticky) phía trên gallery với các nút Win95 toolbar:
- **Lọc theo Tag:** Hiển thị danh sách tag từ `tag_definitions` dưới dạng nút toggle nhiều lựa chọn
- **Sắp xếp:** `[Mới nhất] [Nhiều reaction nhất] [Ngẫu nhiên]`
- Sắp xếp "Ngẫu nhiên" dùng PostgreSQL `ORDER BY random()` — mỗi lần refresh ra thứ tự khác, tạo cảm giác khám phá

Khi thay đổi filter/sort, URL cập nhật (`?tag=synth&sort=reactions`) và gallery reset về đầu — đảm bảo link có thể share được.

**Lazy Loading Ảnh Thông minh:**

Mỗi `<img>` dùng thuộc tính `loading="lazy"` của trình duyệt kết hợp Cloudinary URL transformation:
- **Placeholder blur** (tải trước): `w_20,e_blur:1000,q_10` — ảnh 20px cực nhỏ, tải gần tức thì
- **Thumbnail gallery**: `w_600,q_auto,f_auto,c_fill,ar_1:1` — ảnh vuông đồng đều trong grid
- **Ảnh full lightbox**: `w_1400,q_auto,f_auto` — chất lượng cao khi mở xem

Kỹ thuật: đặt placeholder blur làm `src` ban đầu, khi `IntersectionObserver` phát hiện ảnh gần vào viewport thì swap `src` sang URL thumbnail thật. Tạo hiệu ứng "reveal" từ mờ sang nét, đặc trưng của các gallery nghệ thuật cao cấp.

---

### **D2. Lightbox Xem Ảnh Full**

**Mục tiêu:** Khi click vào bất kỳ ảnh nào trong gallery, mở chế độ xem toàn màn hình không phân tâm, có thể điều hướng qua lại.

**Không dùng thư viện nặng** — tự xây component `src/components/GalleryLightbox.tsx`.

**Cấu trúc giao diện lightbox:**

```
┌─────────────────────────────────────────────┐
│  ← Prev    [X] ĐÓNG    Next →               │  ← Win95 titlebar
├─────────────────────────────────────────────┤
│                                             │
│              [ ẢNH FULL ]                   │  ← ảnh chiếm 80vh
│                                             │
├─────────────────────────────────────────────┤
│  Tiêu đề tác phẩm                           │
│  👤 Tên nghệ sĩ  ·  📅 Ngày đăng            │
│  💾 12  📼 8  🌊 5  🎮 3  🌸 20  [REACT]    │  ← ReactionBar nhúng vào
│  📝 Mô tả tác phẩm...                       │
└─────────────────────────────────────────────┘
```

**Kỹ thuật triển khai:**

Lightbox là một React component render ra ngoài DOM chính bằng `ReactDOM.createPortal` vào `document.body` — đảm bảo luôn nằm trên cùng (z-index) bất kể bố cục trang. State quản lý bởi custom hook `useLightbox` nhận vào toàn bộ mảng ảnh hiện tại và index đang xem.

**Điều hướng:**
- Click nút `← Prev` / `Next →` chuyển ảnh
- Phím `←` `→` trên bàn phím
- Vuốt trái/phải trên mobile (touch event: lưu `touchstart.clientX`, so sánh với `touchend.clientX`, nếu delta > 50px thì chuyển ảnh)
- Click vùng tối bên ngoài ảnh hoặc phím `ESC` để đóng
- Phím `F` toggle fullscreen API của trình duyệt

**Hiệu ứng chuyển ảnh:**

Không dùng slide (tốn layout reflow). Dùng CSS `opacity` + `transform: scale`:
- Ảnh hiện tại fade out + scale nhẹ xuống 0.96
- Ảnh mới fade in + scale từ 1.04 về 1
- Duration 200ms, easing `ease-out`
- Trong khi chuyển, hiển thị skeleton placeholder để không bị "giật"

**Preload ảnh kề:**

Khi đang xem ảnh index `n`, âm thầm tạo `new Image()` để preload ảnh `n+1` và `n-1` trong nền. Khi người dùng chuyển ảnh, ảnh đã preload hiển thị gần tức thì.

**URL sharing:** Khi mở lightbox ảnh có `id = abc`, cập nhật URL thành `/gallery?view=abc` bằng `history.pushState` (không reload trang). Khi ai đó mở link này, trang gallery load bình thường rồi tự động mở lightbox cho ảnh đó. Đóng lightbox thì `history.back()` về URL gallery.

---

### **D3. Trang Chi tiết Tác phẩm (`/gallery/[id]`)**

**Mục tiêu:** Mỗi tác phẩm có trang riêng với URL cố định, tối ưu SEO, có thể share lên mạng xã hội.

**Bố cục trang:**

Trang này render SSR để có meta tags đúng cho từng tác phẩm. Layout hai cột trên desktop, một cột trên mobile:

- **Cột trái (60%):** Ảnh lớn với hiệu ứng CRT scanline overlay nhẹ, nút mở fullscreen
- **Cột phải (40%):** Thông tin tác phẩm trong khung Win95 window, `ReactionBar`, phần bình luận

**Thông tin tác phẩm hiển thị:**
- Tiêu đề với font Vaporwave glitch animation
- Avatar + tên nghệ sĩ (link đến `/profile/[userId]`)
- Ngày đăng tải
- Tags dưới dạng badge neon có thể click (link đến `/gallery?tag=...`)
- Mô tả tác phẩm (nếu có)
- Số liệu: tổng reactions, lượt xem (tăng qua RPC `increment_view_count`)

**Điều hướng:** Dưới tác phẩm có hai nút `← Tác phẩm trước` / `Tác phẩm tiếp theo →` lấy từ RPC truy vấn tác phẩm liền kề theo `created_at`. Và phần **"Tác phẩm cùng phong cách"** — 4 ảnh gợi ý từ cùng tag, dùng `&&` operator tương tự Related Articles.

---

### **D4. Chế độ Xem Slideshow Tự động**

**Mục tiêu:** Người dùng có thể bật chế độ "auto-play" để gallery tự chạy như một buổi triển lãm nghệ thuật — ngồi thư giãn và thưởng thức.

**Nút kích hoạt:** Nút `▶ SLIDESHOW` trên thanh toolbar của trang `/gallery`. Khi click, mở lightbox và bắt đầu auto-advance.

**Cơ chế hoạt động:**

Component `SlideshowController` (React) quản lý `setInterval` với khoảng thời gian mặc định 5 giây. Người dùng có thể điều chỉnh tốc độ bằng thanh trượt Win95 style (3s / 5s / 8s / 10s). Khi hover vào ảnh hoặc rê chuột vào panel thông tin, slideshow tự động tạm dừng (`clearInterval`) và tiếp tục khi chuột rời đi (`setInterval` lại).

**Thanh tiến trình:** Dưới ảnh có thanh progress bar neon (`color: #ff71ce`) đếm ngược đến lần chuyển ảnh tiếp theo — dùng CSS `animation: linear` reset mỗi khi ảnh mới load. Tạo cảm giác "live" và giúp người dùng chủ động.

**Chế độ toàn màn hình:** Nút `⛶ FULLSCREEN` trong lightbox slideshow gọi Fullscreen API của trình duyệt, ẩn toàn bộ thanh tiêu đề của lightbox, chỉ giữ lại ảnh + progress bar mỏng + nút thoát nhỏ góc trên phải. Tối đa hóa diện tích hiển thị tác phẩm.

---

### **D5. Trang Khám phá Nghệ sĩ (`/artists`)**

**Mục tiêu:** Trang showcase các nghệ sĩ đang hoạt động tích cực trong cộng đồng, khuyến khích theo dõi nhau.

**Dữ liệu hiển thị:**

Tạo Supabase View tổng hợp thống kê nghệ sĩ:
```sql
create view public.artist_stats as
  select
    p.id,
    p.full_name,
    p.avatar_url,
    p.bio,
    count(distinct s.id)           as artwork_count,
    coalesce(sum(r.reaction_total), 0) as total_reactions,
    max(s.created_at)              as last_active
  from public.profiles p
  left join public.submissions s
    on s.author_id = p.id and s.status = 'approved'
  left join (
    select submission_id, count(*) as reaction_total
    from public.reactions group by submission_id
  ) r on r.submission_id = s.id
  group by p.id, p.full_name, p.avatar_url, p.bio
  having count(distinct s.id) > 0   -- chỉ hiện nghệ sĩ đã có ít nhất 1 tranh
  order by total_reactions desc;
```

**Bố cục trang `/artists`:**

Grid card nghệ sĩ 4 cột (desktop), mỗi card gồm:
- Banner nhỏ lấy từ ảnh đầu tiên của nghệ sĩ (Cloudinary transformation `w_400,h_120,c_fill`)
- Avatar tròn đè lên banner, viền neon
- Tên nghệ sĩ, bio rút gọn (max 2 dòng, `text-overflow: ellipsis`)
- Số liệu nhỏ: `🖼 12 tác phẩm  ·  💖 348 reactions`
- Nút `XEM GALLERY` link đến `/gallery?artist={userId}`

**Lọc theo Gallery nghệ sĩ:**

Khi URL có param `?artist={userId}`, trang `/gallery` thêm điều kiện `author_id = {userId}` vào Supabase query, và hiển thị header thông tin nghệ sĩ đó phía trên gallery.

---

### **D6. Tính năng Lưu Tranh Yêu thích (Favorites)**

**Mục tiêu:** Người dùng lưu tác phẩm yêu thích để quay lại xem sau, tạo bộ sưu tập cá nhân.

**Cấu trúc CSDL:**

```sql
create table public.favorites (
  profile_id    uuid references public.profiles(id) on delete cascade,
  submission_id uuid references public.submissions(id) on delete cascade,
  saved_at      timestamptz default now(),
  primary key   (profile_id, submission_id)
);

alter table public.favorites enable row level security;

create policy "Chỉ chủ sở hữu xem favorites của mình" on public.favorites
  for all to authenticated using (auth.uid() = profile_id);
```

**Component `FavoriteButton.tsx`:**

Nút icon `🤍` / `💜` nhỏ gọn tại góc trên phải mỗi card ảnh và trong lightbox. Khi click:
- Nếu chưa đăng nhập: hiện thông báo Win95 dialog "Vui lòng đăng nhập để lưu tác phẩm"
- Nếu đã đăng nhập: toggle `upsert` / `delete` vào `public.favorites`
- Hiệu ứng: icon đổi màu từ trắng sang tím neon (`#b967ff`) với animation "heartbeat" CSS scale 1.3 → 1

**Trang `/favorites` — Bộ sưu tập cá nhân:**

Chỉ truy cập khi đã đăng nhập (middleware redirect nếu chưa). Layout hoàn toàn giống `/gallery` với masonry + lightbox. Fetch data:
```sql
select s.* from public.submissions s
join public.favorites f on f.submission_id = s.id
where f.profile_id = auth.uid()
order by f.saved_at desc;
```

Trang này có nút "XEM GALLERY CỘNG ĐỒNG" để quay lại khám phá thêm — tạo vòng lặp tự nhiên giữa khám phá và lưu trữ.

---

### **D7. Điều hướng Bàn phím Toàn cục trong Gallery**

**Mục tiêu:** Người dùng trên desktop có thể điều hướng toàn bộ gallery và lightbox bằng bàn phím — trải nghiệm như dùng app native.

**Triển khai:**

Tạo custom hook `useGalleryKeyboard` gắn `keydown` listener trên `document` (cleanup khi unmount). Map các phím:

| Phím | Hành động |
|:---|:---|
| `←` / `→` | Ảnh trước / Ảnh tiếp theo (khi lightbox mở) |
| `ESC` | Đóng lightbox |
| `F` | Toggle fullscreen |
| `Space` | Tạm dừng / Tiếp tục slideshow |
| `L` | Toggle lưu vào favorites |
| `1` → `5` | React nhanh bằng emoji tương ứng |
| `G` | Focus vào ô tìm kiếm gallery |

Tất cả phím tắt hiển thị trong panel "Phím tắt" nhỏ ở góc phải lightbox (toggle bằng phím `?`), thiết kế dạng bảng Win95 help dialog.

---

### **D8. Chia sẻ Tác phẩm Lên Mạng Xã hội**

**Mục tiêu:** Nút share đơn giản giúp người dùng lan truyền tác phẩm ra ngoài cộng đồng.

**Các nền tảng hỗ trợ:**

Nút `CHIA SẺ` trong lightbox và trang chi tiết mở một popup Win95 dialog nhỏ với 3 lựa chọn:

- **Sao chép link** — Copy URL trang chi tiết `/gallery/{id}` vào clipboard bằng `navigator.clipboard.writeText()`, hiện thông báo "ĐÃ SAO CHÉP!" thay thế nút trong 2 giây
- **Facebook** — Mở `https://www.facebook.com/sharer/sharer.php?u={encodedUrl}` trong cửa sổ popup nhỏ (800×600)
- **Twitter/X** — Mở `https://twitter.com/intent/tweet?url={encodedUrl}&text={encodedTitle}` tương tự

**Open Graph của trang `/gallery/[id]`:**

Vì trang này render SSR, `og:image` trỏ thẳng đến `image_url` của tác phẩm từ Cloudinary — ảnh preview đẹp khi share lên Facebook/Twitter. `og:title` là tên tác phẩm. `og:description` là bio tác giả + mô tả tác phẩm.

---

## **PHỤ LỤC: BẢNG TỔNG HỢP TÁC ĐỘNG TÀI NGUYÊN FREE TIER**

Tất cả tính năng nâng cao được thiết kế để duy trì mức chi phí 0 USD:

| Tính năng | Tài nguyên sử dụng thêm | Mức tiêu thụ ước tính | Vẫn trong Free Tier? |
|:---|:---|:---|:---:|
| Admin Dashboard | Supabase DB + CF Workers | +2,000 req/ngày | ✅ |
| Full-text Search | Supabase DB (GIN index) | +5,000 req/ngày | ✅ |
| Reaction System | Supabase Realtime channel | +1 channel/tranh | ✅ |
| Gallery Masonry + Lightbox | Cloudinary transformations | ~2 transforms/ảnh/user | ✅ |
| Slideshow Autoplay | Client-side only | 0 req thêm | ✅ |
| Favorites | Supabase DB | +1,000 req/ngày | ✅ |
| Artist Stats View | Supabase DB (materialized) | +500 req/ngày | ✅ |
| Social Share | Mở URL bên ngoài | 0 req thêm | ✅ |
| OG Image Động | Cloudinary URL transform | ~500 transforms/tháng | ✅ |

---

## **LỘ TRÌNH TƯƠNG LAI (KHI CÓ LƯỢNG NGƯỜI DÙNG ĐÁNG KỂ)**

Các tính năng dưới đây được ghi nhận nhưng **chủ động trì hoãn** — chỉ triển khai khi cộng đồng đã đủ lớn để hạ tầng phức tạp thêm thực sự tạo ra giá trị:

**Phase X — Hệ thống Thông báo & Realtime Nâng cao:**
Trung tâm thông báo in-app với chuông realtime, nested comments 3 cấp lồng nhau với Recursive CTE, notification email qua Resend.com.

**Phase Y — Hiệu năng, Caching & Bảo mật Nâng cao:**
Cloudflare KV caching cho trang chủ và gallery (TTL 5 phút), rate limiting chống spam API qua KV, Content Security Policy header qua `_headers` file, Supabase Edge Functions cho Cloudinary delete.

**Phase Z — Progressive Web App & Trải nghiệm Offline:**
Web App Manifest cài đặt như app native, Service Worker Workbox 4 tầng cache, tính năng đọc offline bài viết đã xem.

---

## **CHỈ DẪN NẠP DỮ LIỆU CHO CÔNG CỤ AI (VIBECODING)**

> [!TIP]
> **Mẫu lệnh nạp cho AI khi triển khai từng giai đoạn:**
>
> *"Bạn là một kỹ sư fullstack cao cấp đang làm việc trên website tạp chí nghệ thuật Vaporwave đã có nền tảng Astro SSR + Supabase + Cloudinary ổn định. Hãy đọc tài liệu kế hoạch tính năng nâng cao và triển khai [TÊN GIAI ĐOẠN CỤ THỂ, ví dụ: Giai đoạn D2 — Lightbox Xem Ảnh Full].
>
> Yêu cầu bắt buộc:
> - Không thay đổi cấu trúc bảng `profiles` và `comments` đã có
> - Tất cả API route phải kiểm tra session Supabase phía server trước khi xử lý
> - Giữ nguyên theme CSS Vaporwave/Win95 đã thiết lập trong `global.css`
> - Mọi component React tương tác phải dùng `client:load` hoặc `client:idle`
> - Runtime target là Cloudflare Pages Edge — không dùng Node.js-only API
> - Ưu tiên CSS thuần và Web API có sẵn thay vì thêm thư viện nặng"*

---

## **TÀI LIỆU THAM KHẢO BỔ SUNG**

1. *Supabase Full-Text Search:* https://supabase.com/docs/guides/database/full-text-search
2. *Cloudinary URL Transformations:* https://cloudinary.com/documentation/transformation_reference
3. *Intersection Observer API (MDN):* https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
4. *Fullscreen API (MDN):* https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API
5. *ReactDOM.createPortal:* https://react.dev/reference/react-dom/createPortal
6. *Touch Events (MDN):* https://developer.mozilla.org/en-US/docs/Web/API/Touch_events
7. *Web Share API (MDN):* https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API
8. *PostgreSQL Recursive CTE:* https://www.postgresql.org/docs/current/queries-with.html
