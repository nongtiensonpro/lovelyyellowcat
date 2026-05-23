# 📼 LOVELYYELLOWCAT: VAPORWAVE ART MAGAZINE 📼
> **A Cybernetic Oasis of Retro-Futurism & Aesthetic Artistry**

---

```
  █████╗ ███████╗███████╗████████╗██╗  ██╗███████╗████████╗██╗ ██████╗ 
 ██╔══██╗██╔════╝██╔════╝╚══██╔══╝██║  ██║██╔════╝╚══██╔══╝██║██╔════╝ 
 ███████║█████╗  ███████╗   ██║   ███████║█████╗     ██║   ██║██║      
 ██╔══██║██╔══╝  ╚════██║   ██║   ██╔══██║██╔══╝     ██║   ██║██║      
 ██║  ██║███████╗███████║   ██║   ██║  ██║███████╗   ██║   ██║╚██████╗ 
 ╚═╝  ╚═╝╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝ ╚═════╝ 
             [ 💾 SYSTEM RUNNING AT EDGE // BUDGET: $0 ]
```

Chào mừng bạn đến với **LovelyYellowCat** (Tạp chí Nghệ thuật Vaporwave & Triển lãm Cộng đồng) – một ứng dụng web kết xuất phía máy chủ biên (SSR Edge Runtime) sở hữu giao diện hoài cổ Windows 95, hiệu ứng CRT độc đáo và hệ thống tương tác thời gian thực cao cấp.

Dự án được xây dựng nhằm mục đích cung cấp một sân chơi nghệ thuật hoài cổ đậm chất nghệ thuật số thế kỷ trước, tối ưu hóa toàn diện về chi phí vận hành (0 USD) trên nền tảng đám mây biên Cloudflare Workers và hệ sinh thái serverless của Supabase & Cloudinary.

*   **🌐 URL Trực Tuyến:** [lovelyyellowcat.nongtiensonpro.workers.dev](https://lovelyyellowcat.nongtiensonpro.workers.dev)
*   **✉️ Email Hỗ Trợ:** [nongtiensonpro@gmail.com](mailto:nongtiensonpro@gmail.com)

---

## 🗺️ Bản Đồ Mục Lục
1. [🛠️ Công Nghệ & Tối Ưu Chi Phí](#%EF%B8%8F-c%C3%B4ng-ngh%E1%BB%87--t%E1%BB%91i-%C6%B0u-chi-ph%C3%AD)
2. [📐 Kiến Trúc Hệ Thống](#-ki%E1%BA%BFn-tr%C3%BAc-h%E1%BB%87-th%E1%BB%91ng)
3. [🎨 Thẩm Mỹ Vaporwave & CRT Overlay](#-th%E1%BA%A9m-m%E1%BB%B9-vaporwave--crt-overlay)
4. [⚡ Tính Năng Nổi Bật](#-t%C3%ADnh-n%C4%83ng-n%E1%BB%95i-b%E1%BA%ADt)
5. [🗄️ Thiết Kế Cơ Sở Dữ Liệu (Supabase)](#%EF%B8%8F-thi%E1%BA%BFt-k%E1%BA%BF-c%C6%A1-s%E1%BB%9F-d%E1%BB%AF-li%E1%BB%87u-supabase)
6. [🔐 Cơ Chế Xác Thực & Phân Quyền (Astro Middleware)](#-c%C6%A1-ch%E1%BA%BF-x%C3%A1c-th%E1%BB%B1c--ph%C3%A2n-quy%E1%BB%81n-astro-middleware)
7. [📡 Kênh Thời Gian Thực & Cơ Chế Phục Hồi Tự Động](#-k%C3%AAnh-th%E1%BB%9Di-gian-th%E1%BB%B1c--c%C6%A1-ch%E1%BA%BF-ph%E1%BB%A5c-h%E1%BB%93i-t%E1%BB%B1-%C4%91%E1%BB%99ng)
8. [📈 Wrangler Config & Ghi Nhật Ký Observability](#-wrangler-config--ghi-nh%E1%BA%ADt-k%C3%BD-observability)
9. [📁 Cấu Trúc Thư Mục Dự Án](#-c%E1%BA%A5u-tr%C3%BAc-th%C6%B0-m%E1%BB%A5c-d%E1%BB%B1-%C3%A1n)
10. [⚙️ Biến Môi Trường (Environment Variables)](#%EF%B8%8F-bi%E1%BA%BFn-m%C3%B4i-tr%C6%B0%E1%BB%9Dng-environment-variables)
11. [🚀 Hướng Dẫn Cài Đặt và Chạy Local](#-h%C6%B0% fraudsters-d%E1%BA%ABn-c%C3%A0i-%C4%91%E1%BA%B7t-v%C3%A0-ch%E1%BA%A1y-local)
12. [🔮 Quy Trình Deploy Lên Cloudflare Workers](#-quy-tr%C3%ACnh-deploy-l%C3%AAn-cloudflare-workers)

---

## 🛠️ Công Nghệ & Tối Ưu Chi Phí

Ứng dụng tận dụng tối đa các hạn mức miễn phí (Free Tier) tốt nhất hiện nay để mang lại một hệ thống ổn định cao nhưng không tốn bất kỳ chi phí vận hành nào:

| Công Nghệ | Vai Trò Trong Dự Án | Lý Do Lựa Chọn | Hạn Mức Miễn Phí Áp Dụng |
| :--- | :--- | :--- | :--- |
| **Astro v6 (SSR)** | Hạt nhân điều hướng, kết xuất trang hybrid và quản lý SSR tại Edge. | SEO vượt trội, khả năng tách biệt logic SSR và tạo tĩnh, cơ chế "Astro Islands" giảm tải JS cho client. | Mã nguồn mở, miễn phí. |
| **React v19** | Quản lý trạng thái và các thành phần tương tác cao phía client. | Linh hoạt cao khi xây dựng các widget mô phỏng Windows 95, các form đa bước phức tạp. | Mã nguồn mở, miễn phí. |
| **Tailwind CSS v4** | Định hình toàn bộ hệ thống giao diện, màu sắc và keyframes hoài cổ. | Khai báo biến CSS trực tiếp thông qua `@theme`, tối ưu hóa kích thước file CSS nhờ compiler thế hệ mới. | Mã nguồn mở, miễn phí. |
| **Supabase** | Hệ quản trị cơ sở dữ liệu PostgreSQL, Xác thực Google OAuth, Kênh Realtime WebSocket. | Cung cấp RLS (Row Level Security) mạnh mẽ bảo mật cấp dòng, đồng bộ thời gian thực, triggers tự động. | 500MB Database, 50.000 MAU (Monthly Active Users). |
| **Cloudflare Workers** | Hạ tầng Edge Serverless Hosting và CDN phân phối ứng dụng toàn cầu. | Chuyển đổi Astro thành Edge Workers siêu nhẹ, giảm thiểu tối đa độ trễ phản hồi (latency), miễn phí băng thông. | 100.000 requests động miễn phí mỗi ngày. |
| **Cloudinary** | Lưu trữ hình ảnh và tự động xử lý/nén (Dynamic CDN transformations). | Tránh rò rỉ API secret bằng unsigned uploads từ client, tự động tạo OG Image động. | 25GB dung lượng và băng thông hàng tháng. |

---

## 📐 Kiến Trúc Hệ Thống

Sự kết hợp hoàn hảo giữa các hạ tầng Serverless biên (Edge Computing) và dịch vụ đám mây chuyên biệt tạo nên một quy trình khép kín, an toàn và tối ưu:

```
                      +-----------------------------------+  
                      |        Cloudflare Workers         |  
                      |  (Astro SSR Edge Runtime / CDN)   |  
                      +-----+-----------------+-----------+  
                            |                 |  
             Yêu cầu trang  |                 | Xác thực Google OAuth  
                            v                 v  
                      +-----+---+         +---+-------+  
                      |  Astro  |         | Supabase  |  
                      | Islands | <-----> |   Auth    |  
                      +----+----+         +-----------+  
                           |  
         Hydration (React) |  
                           v  
             +-------------+-------------+  
             |                           |  
             v                           v  
      +------+------+             +------+------+  
      | Cloudinary  |             |  Supabase   |  
      | Image Store |             |  Database   |  
      +-------------+             +-------------+
```

---

## 🎨 Thẩm Mỹ Vaporwave & CRT Overlay

Hệ thống được thiết kế tỉ mỉ nhằm tái hiện lại không gian hoài niệm những năm 90 và văn hóa mạng thời sơ khai:

*   **Hệ Màu Neon & Xám Win95:** Sử dụng sắc hồng rực rỡ `--color-vapor-pink` (#ff71ce), màu xanh lam điện tử `--color-vapor-blue` (#01cdfe), tím ảo ảnh `--color-vapor-purple` (#b967ff) kết hợp với màu xám cổ điển của hệ điều hành Windows 95 `--color-win-gray` (#c0c0c0).
*   **Hiệu Ứng Lưới CRT & Dòng Quét Màn Hình:** Một lớp phủ giả lập CRT (`crt-overlay` và `crt-scanline`) được áp dụng lên toàn bộ màn hình kết hợp hoạt ảnh nhấp nháy tần số quét thực tế, đem lại cảm giác đang ngắm tranh trên một chiếc màn hình lồi bóng đèn hình cổ xưa.
*   **Cửa Sổ Hệ Điều Hành Hoài Cổ:** Mọi khung chứa nội dung, form bình luận, thanh điều hướng đều được bao bọc bởi lớp CSS giả lập viền nổi 3D Windows 95 (`win95-container`), nút đóng mở `[X]`, cùng tiêu đề dải gradient xanh đậm huyền thoại (`win95-header`).

---

## ⚡ Tính Năng Nổi Bật

### 📰 1. Hệ Thống Tạp Chí Bài Viết (Aesthetic Articles)
*   **Trình soạn thảo chuyên sâu:** `/admin/articles/new` tích hợp live preview hai cột với trình soạn thảo Markdown, hỗ trợ nhúng ảnh trực tiếp từ Cloudinary bằng cơ chế kéo thả hoặc click chọn.
*   **Bộ lọc danh mục đa dạng:** Lọc bài viết bằng nhãn dán neon (tags) chuẩn hóa thông qua toán tử mảng `@>` của PostgreSQL.
*   **Bài viết liên quan thông minh:** Tự động gợi ý 3 bài viết có độ trùng khớp nhãn dán cao nhất nhờ hàm RPC đệ quy `get_related_articles` trong database.

### 🖼️ 2. Phòng Triển Lãm Cộng Đồng (Masonry Gallery & Lightbox Viewer)
*   **Layout Masonry CSS thuần:** Bố trí tranh đa kích thước mượt mà không dùng thư viện JS nặng, tự động co giãn 3 cột → 2 cột → 1 cột theo màn hình.
*   **Phân trang vô hạn (Infinite Scroll):** Sử dụng Web API `IntersectionObserver` theo dõi chân trang và tự động truy vấn 12 tranh tiếp theo không cần reload.
*   **Custom Lightbox nâng cao:**
    *   Xem ảnh toàn màn hình với hiệu ứng mờ nhấp nháy CRT.
    *   Lắng nghe cử chỉ vuốt chạm (touch) trên mobile và điều hướng phím mũi tên `←` `→` trên desktop.
    *   Preload ảnh liền kề trong nền (`n+1` và `n-1`) tăng tốc phản hồi khi chuyển ảnh.
    *   Chia sẻ nhanh liên kết chi tiết tranh qua Facebook, X/Twitter, hoặc sao chép clipboard.
*   **Chế độ Slideshow Tự Động:** Auto-play triển lãm tranh cộng đồng với thanh tiến trình neon đẹp mắt và thanh trượt Win95 điều tốc thời gian.

### 💬 3. Tương Tác Xã Hội Thời Gian Thực (Realtime Interactions)
*   **Bình luận lồng nhau đệ quy (Nested Comments):** Hỗ trợ bình luận 3 cấp độ lồng nhau cực kỳ rõ ràng, truy vấn tối ưu qua đệ quy Recursive CTE của PostgreSQL (`get_comment_tree`).
*   **Thả biểu cảm Neon (Vaporwave Reactions):** Người dùng có thể thả các biểu cảm 💾, 📼, 🌊, 🎮, 🌸 lên tranh hoặc bài viết với hiệu ứng hạt bay nổ tung 4 hướng và đồng bộ tức thời số lượng cảm xúc cho toàn bộ người xem mà không cần tải lại trang.
*   **Lưu tranh yêu thích (Favorites):** Bộ sưu tập cá nhân lưu trữ các tác phẩm ưng ý trong tài khoản cá nhân thông qua trang `/favorites`.
*   **Thông báo in-app (Bell Notification):** Phát âm thanh retro 8-bit sống động khi nhận được phản hồi bình luận hoặc tranh được admin phê duyệt.

### 🏆 4. Gamification: Điểm Đóng Góp & Huy Hiệu (XP & Badge System)
*   **PostgreSQL Auto XP Trigger:** Điểm kinh nghiệm được tính toán và trao tặng tự động hoàn toàn trong database khi người dùng bình luận (+10 XP) hoặc nhận reaction (+2 XP) hoặc gửi tranh (+50 XP).
*   **Nâng Level Hoài Cổ:** Level tăng cấp dựa trên công thức cấp số nhân: $level = \lfloor\sqrt{XP / 100}\rfloor + 1$.
*   **Huy chương 8-bit:** Tự động mở khóa các danh hiệu đặc trưng như Bronze Creator 💾, Silver Creator 📼, Gold Creator 👑 hiển thị trên profile cá nhân.

---

## 🗄️ Thiết Kế Cơ Sở Dữ Liệu (Supabase)

Để thiết lập cấu trúc cơ sở dữ liệu trên Supabase SQL Editor, hãy tham khảo các file SQL tại thư mục gốc dự án theo trình tự dưới đây:

### 1️⃣ [supabase_setup.sql](file:///d:/lovelyyellowcat/supabase_setup.sql)
Khởi tạo cấu trúc ban đầu:
*   Bảng `public.profiles` chứa hồ sơ người dùng liên kết với `auth.users` qua UUID.
*   Trigger `on_auth_user_created_google` tự động sao chép email, tên hiển thị, và ảnh đại diện từ payload Google OAuth sang bảng hồ sơ công khai ngay khi người dùng đăng nhập lần đầu.
*   Bảng `public.comments` cơ bản.
*   Thiết lập chính sách bảo mật cấp dòng (RLS).

### 2️⃣ [supabase_advanced_setup.sql](file:///d:/lovelyyellowcat/supabase_advanced_setup.sql)
Nâng cấp toàn bộ hệ thống tính năng nâng cao:
*   Mở rộng bảng `profiles` (vai trò `role`, `bio`, `banner_url`, `social_links`).
*   Bảng `public.tag_definitions` và bảng bài viết `public.articles` chính thức.
*   Bảng gửi tác phẩm `public.submissions` cộng đồng.
*   Bảng bày tỏ cảm xúc `public.reactions` giới hạn unique `(article_id, profile_id, emoji)` giúp người dùng chỉ thả tối đa 1 icon cùng loại trên mỗi bài viết/tranh.
*   Bảng lưu trữ tích lũy điểm `user_points`, danh mục huy chương `badges`, danh sách đạt huy chương `user_badges` kèm database function `award_xp()` tính level tự động.
*   Hàm đệ quy `get_comment_tree(p_article_id)` lấy cây bình luận lồng nhau tới độ sâu 3 cấp.
*   Đăng ký tất cả các bảng vào cổng Realtime Replication (`supabase_realtime`) để phát sóng qua WebSockets.

### 3️⃣ [supabase_stage_c.sql](file:///d:/lovelyyellowcat/supabase_stage_c.sql)
Cài đặt hàm tìm kiếm thông minh:
*   Hàm RPC `get_related_articles(p_slug, p_limit)` tận dụng toán tử `&&` và `ANY` của PostgreSQL để tìm kiếm các bài viết liên quan có trùng nhãn dán, xếp thứ tự ưu tiên theo số lượng tag chung giảm dần.

### 4️⃣ [supabase_stage_d.sql](file:///d:/lovelyyellowcat/supabase_stage_d.sql)
Bổ sung cho phần Triển lãm và Nghệ sĩ:
*   Bảng dấu trang yêu thích `public.favorites` liên kết chặt chẽ.
*   View thống kê nghệ sĩ hoạt động `public.artist_stats` tổng hợp tổng số tranh được duyệt và tổng số reactions nhận được từ khán giả, chỉ hiện những người đã đóng góp ít nhất 1 tác phẩm.

### 5️⃣ [supabase_admin_moderation_fixes.sql](file:///d:/lovelyyellowcat/supabase_admin_moderation_fixes.sql)
Fix toàn bộ lỗi phân quyền RLS:
*   Đảm bảo editor/admin có đầy đủ quyền hạn sửa đổi bài viết, xóa bình luận sai phạm, dọn dẹp các bản ghi liên đới (Reactions, Favorites) thông qua các hành động RLS mở rộng.

---

## 🔐 Cơ Chế Xác Thực & Phân Quyền (Astro Middleware)

Việc truy cập và thao tác trên phân hệ quản trị được bảo mật nghiêm ngặt nhờ lớp xử lý trung gian tại [src/middleware.ts](file:///d:/lovelyyellowcat/src/middleware.ts):

*   **Tất cả các route thuộc `/admin/*`** sẽ tự động được lọc qua middleware.
*   Middleware khởi tạo Supabase Server Client từ request cookies, lấy session thông tin thông qua phương thức bảo mật `supabase.auth.getUser()`.
*   Truy vấn trực tiếp vai trò người dùng tại bảng `public.profiles`. Nếu vai trò không phải `'admin'` hoặc `'editor'`, hệ thống sẽ từ chối xử lý và ngay lập tức redirect người dùng về trang chủ kèm theo cờ thông báo lỗi: `/?error=unauthorized`.
*   Tương ứng phía database, các chính sách RLS `with check` cũng kiểm tra vai trò này trước khi cho phép ghi dữ liệu, tạo nên lớp bảo mật 2 tầng cực kỳ chắc chắn.

---

## 📡 Kênh Thời Gian Thực & Cơ Chế Phục Hồi Tự Động

Để duy trì kết nối WebSocket thời gian thực luôn ổn định trên mọi thiết bị di động (nơi thường xuyên xảy ra tình trạng rớt mạng hoặc chuyển vùng Wi-Fi/4G), component [RealtimeComments.tsx](file:///d:/lovelyyellowcat/src/components/RealtimeComments.tsx) và [GalleryGrid.tsx](file:///d:/lovelyyellowcat/src/components/GalleryGrid.tsx) được tích hợp thuật toán **Exponential Backoff**:

Khi nhận được mã cảnh báo ngắt kết nối (`CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`), hệ thống sẽ tự động kích hoạt tiến trình phục hồi liên kết với độ trễ giãn cách luỹ tiến theo hàm số mũ:

$$Delay = \min(MaxDelay, BaseDelay \times 1.5^{RetryCount})$$

*   `BaseDelay` = 1500 mili-giây (thử lại sau 1.5 giây đầu tiên).
*   Hệ số giãn cách lũy tiến = 1.5.
*   `MaxDelay` = 300.000 mili-giây (giới hạn tối đa 5 phút để tránh tràn bộ đệm hoặc gây quá tải hệ thống).
*   Khi kết nối lại thành công, biến `RetryCount` lập tức reset về `0`.

> [!TIP]
> **Supabase Singleton Browser Client:** Để ngăn chặn lỗi sinh ra nhiều client trùng lặp dẫn tới cảnh báo `Multiple GoTrueClient instances detected` trên console, toàn bộ ứng dụng sử dụng mẫu thiết kế Singleton thông qua file [src/lib/supabaseBrowser.ts](file:///d:/lovelyyellowcat/src/lib/supabaseBrowser.ts). Tất cả các React Component sẽ dùng chung duy nhất một instance.

---

## 📈 Wrangler Config & Ghi Nhật Ký Observability

Để tạo điều kiện thuận lợi cho việc vận hành và gỡ lỗi (debugging) từ xa trong môi trường sản phẩm thực tế, tệp [wrangler.jsonc](file:///d:/lovelyyellowcat/wrangler.jsonc) đã được định cấu hình tích hợp sẵn dịch vụ giám sát **Cloudflare Workers Logs & Observability**:

```json
{
  "name": "lovelyyellowcat",
  "compatibility_date": "2026-05-20",
  "compatibility_flags": [
    "nodejs_compat"
  ],
  "observability": {
    "enabled": false,
    "head_sampling_rate": 1,
    "logs": {
      "enabled": true,
      "head_sampling_rate": 1,
      "persist": true,
      "invocation_logs": true
    },
    "traces": {
      "enabled": true,
      "persist": true,
      "head_sampling_rate": 1
    }
  }
}
```

*   **Logs Persistence:** Cho phép lưu trữ và duy trì vết nhật ký gọi hàm.
*   **Invocation Logs:** Ghi lại mọi hành vi định tuyến từ Middleware, bao gồm IP người dùng, thông tin cookie, các truy vấn Supabase, hỗ trợ khoanh vùng sự cố nhanh chóng mà không cần phỏng đoán.

---

## 📁 Cấu Trúc Thư Mục Dự Án

Cơ cấu thư mục được quy hoạch khoa học, phân rõ ranh giới giữa mã nguồn giao diện Astro tĩnh/động, các logic React, thư viện kết nối dịch vụ, và luồng dữ liệu API:

```text
/ (Thư mục gốc)
├── .github/
│   └── workflows/
│       └── deploy.yml              # CI/CD tự động build & deploy lên Cloudflare Workers
├── public/                         # Các tài nguyên tĩnh (fonts, nhạc nền, favicon)
├── src/
│   ├── components/                 # Các component React động (Astro Islands) & Astro tĩnh
│   │   ├── ArticleEditor.tsx       # Trình viết bài viết CMS markdown & Cloudinary Upload
│   │   ├── CloudinaryUpload.tsx    # Widget tải ảnh Win95 lên Cloudinary
│   │   ├── FavoriteButton.tsx      # Nút tim neon yêu thích tích hợp heartbeat animation
│   │   ├── GalleryGrid.tsx         # Lưới triển lãm masonry cuộn vô tận
│   │   ├── GalleryLightbox.tsx     # Bộ xem ảnh phóng to, vuốt touch, slideshow auto
│   │   ├── HeaderNav.astro         # Thanh điều hướng Win95 responsive
│   │   ├── NotificationBell.tsx    # Chuông thông báo in-app realtime phát nhạc retro
│   │   ├── ProfileEditor.tsx       # Form sửa bio, banner và social links
│   │   ├── ReactionBar.tsx         # Hệ thống thả emoji nổ hạt bụi neon
│   │   ├── RealtimeComments.tsx    # Bình luận lồng nhau đệ quy và WebSocket tự phục hồi
│   │   ├── SearchModal.tsx         # Tìm kiếm Full-Text Search gõ phím nóng Ctrl+K
│   │   ├── SubmissionWizard.tsx    # Wizard đăng tranh Win95 từng bước
│   │   └── Win95Window.tsx         # Khung cửa sổ Windows 95 tái sử dụng
│   ├── layouts/
│   │   └── BaseLayout.astro        # Layout gốc tích hợp meta SEO, OpenGraph và CRT filter
│   ├── lib/                        # Thư viện xử lý logic kết nối
│   │   ├── adminModeration.ts      # Logic nghiệp vụ dọn dẹp và phê duyệt của admin
│   │   ├── cloudinary.ts           # Cấu hình API Cloudinary (CRUD ảnh phía máy chủ)
│   │   ├── markdown.ts             # Thư viện chuyển đổi Markdown sang HTML an toàn
│   │   ├── supabase.ts             # Bộ khởi tạo Supabase Server (cookie-based SSR)
│   │   └── supabaseBrowser.ts      # Browser-side Singleton Client tránh đè token
│   ├── middleware.ts               # Bộ lọc phân quyền bảo vệ route /admin
│   ├── styles/
│   │   └── global.css              # File CSS chứa cấu hình hệ màu, font chữ, CRT animation
│   └── pages/                      # Hệ thống trang định tuyến Astro (SSR Routes)
│       ├── admin/
│       │   ├── articles/
│       │   ├── comments.astro      # Quản lý & xóa bình luận sai phạm
│       │   ├── index.astro         # Thống kê tổng số lượng bài viết, lượt xem, bình luận
│       │   └── submissions.astro   # Kiểm duyệt duyệt/từ chối tranh cộng đồng
│       ├── api/                    # Hệ thống API Endpoints xử lý CRUD dữ liệu
│       ├── articles/               # Trang hiển thị danh sách bài viết
│       ├── gallery/
│       │   ├── [id].astro          # Trang chi tiết tranh tối ưu SEO, hỗ trợ share link
│       │   └── index.astro         # Sảnh ngắm tranh cộng đồng
│       ├── profile/
│       │   ├── [userId].astro      # Trang cá nhân nghệ sĩ ( Masonry cá nhân, XP, Badge )
│       │   └── edit.astro          # Chỉnh sửa trang cá nhân
│       ├── artists.astro           # Bảng xếp hạng các nghệ sĩ tích cực
│       ├── favorites.astro         # Trang lưu trữ tác phẩm yêu thích của cá nhân
│       ├── index.astro             # Trang chủ tạp chí
│       ├── submit.astro            # Giao diện gửi tranh cộng đồng
│       ├── sitemap.xml.ts          # Sitemap XML động cho công cụ tìm kiếm Google
│       └── robots.txt.ts           # Robots file chỉ dẫn sitemap
├── wrangler.jsonc                  # File cấu hình Workers của Cloudflare
└── package.json                    # Khai báo các gói phụ thuộc dự án
```

---

## ⚙️ Biến Môi Trường (Environment Variables)

Hãy tạo một file `.env` nằm tại thư mục gốc để cấu hình môi trường phát triển local:

```bash
# === Cấu hình Supabase (Cần thiết cho cả local và build-time) ===
PUBLIC_SUPABASE_URL="https://kqccgsoxmpbdisoaiqzd.supabase.co"
PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"

# === Cấu hình tải ảnh Cloudinary Unsigned Upload (Client-side) ===
PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
PUBLIC_CLOUDINARY_UPLOAD_PRESET="your-unsigned-preset"

# === Cấu hình khóa nâng cao Cloudinary (Chỉ cấu hình trên Cloudflare Dashboard hoặc local) ===
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

> [!IMPORTANT]
> Toàn bộ các biến bắt đầu bằng chữ `PUBLIC_` bắt buộc phải được khai báo tại **GitHub Secrets** của repository để hệ thống GitHub Actions có thể nhúng vào quá trình đóng gói và biên dịch code tĩnh.
>
> Các biến bảo mật phía máy chủ biên (`CLOUDINARY_API_KEY` và `CLOUDINARY_API_SECRET`) tuyệt đối không được nhúng lúc build, thay vào đó hãy khai báo trực tiếp chúng tại mục **Environment Variables** trong bảng quản trị **Cloudflare Workers Dashboard**.

---

## 🚀 Hướng Dẫn Cài Đặt và Chạy Local

Bạn có thể chạy thử nghiệm toàn bộ hệ thống ngay tại máy tính cá nhân của mình bằng vài bước đơn giản:

### Bước 1: Clone mã nguồn dự án và truy cập thư mục
```bash
git clone https://github.com/nongtiensonpro/lovelyyellowcat.git
cd lovelyyellowcat
```

### Bước 2: Cài đặt các gói phụ thuộc
```bash
npm install
```

### Bước 3: Thiết lập các biến môi trường
Tạo file `.env` tại thư mục gốc và điền đầy đủ các thông tin kết nối Supabase và Cloudinary của bạn như hướng dẫn tại mục [Biến Môi Trường](#%EF%B8%8F-bi%E1%BA%BFn-m%C3%B4i-tr%C6%B0%E1%BB%9Dng-environment-variables).

### Bước 4: Chạy Local Server phát triển
```bash
npm run dev
```
Hệ thống sẽ chạy một dev-server cục bộ tại địa chỉ `http://localhost:4321`. Bạn có thể truy cập để kiểm nghiệm và chỉnh sửa trực tiếp mã nguồn.

### Bước 5: Kiểm tra biên dịch (Astro Build)
Để kiểm thử khả năng biên dịch sản phẩm trước khi đưa lên máy chủ Cloudflare:
```bash
npm run build
```

---

## 🔮 Quy Trình Deploy Lên Cloudflare Workers

Hệ thống được thiết lập chế độ bàn giao và triển khai liên tục tự động (CI/CD) chuẩn hóa công nghiệp thông qua GitHub Actions nằm tại [.github/workflows/deploy.yml](file:///d:/lovelyyellowcat/.github/workflows/deploy.yml):

1.  **Lắng Nghe Sự Kiện:** Khi nhà phát triển thực hiện thao tác push hoặc mở Pull Request nhắm vào nhánh chính `main`, quy trình sẽ tự động khởi động.
2.  **Kiểm tra Môi Trường:** Sử dụng hệ điều hành Ubuntu mới nhất, cài đặt Node.js phiên bản 24.
3.  **Cài Đặt & Đóng Gói (Astro Build):** Cài đặt sạch các node-modules bằng `npm ci`. Biên dịch toàn bộ mã nguồn sang định dạng tối ưu hóa nhờ lệnh `npm run build`, đồng thời nhúng các biến môi trường `PUBLIC_` lấy từ **GitHub Secrets**.
4.  **Đẩy Lên Máy Chủ Biên:** Tiến hành gọi Wrangler CLI phiên bản mới nhất, trích xuất cấu hình tự sinh tại `dist/server/wrangler.json` và trực tiếp đẩy tệp tin biên dịch lên máy chủ Cloudflare Workers nhờ khóa `CLOUDFLARE_API_TOKEN` và `CLOUDFLARE_ACCOUNT_ID`.

> [!NOTE]
> Mọi thay đổi trong cấu hình Cloudflare hoặc database sẽ lập tức được cập nhật và có hiệu lực trực tiếp trong vòng 1-2 phút kể từ khi tiến trình CI/CD hoàn tất thành công.
