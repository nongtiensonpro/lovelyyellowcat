# Walkthrough: Nâng Cấp Toàn Diện Website Vaporwave Art Journal

Chúng tôi đã hoàn thành việc nâng cấp toàn diện website **Vaporwave Art Journal**, kết hợp hoàn hảo bản sắc hoài niệm **Vaporwave Design System** với cấu trúc kiến trúc doanh nghiệp chuẩn mực từ **`DESIGN-dell-1996.md`**.

---

## 1. Hệ Thống Token & CSS Toàn Cục ([`global.css`](file:///d:/lovelyyellowcat/src/styles/global.css))

- **Đầy đủ 4 Nhóm Màu Tokens:**
  - **Neon Signature:** `--color-vapor-pink`, `--color-vapor-blue`, `--color-vapor-purple`, `--color-vapor-green`, `--color-vapor-yellow`, `--color-vapor-orange`.
  - **Dark Space Palette:** `--color-cosmic-black`, `--color-cosmic-deep`, `--color-cosmic-mid`, `--color-cosmic-surface`.
  - **Windows 95 Chrome:** `--color-win-gray`, `--color-win-light`, `--color-win-dark`, `--color-win-darkest`, `--color-win-titlebar`.
  - **Ribbon Tint Family (từ `DESIGN-dell-1996`):** Sage (`#b3bd95`), Salmon (`#d77a7a`), Peach (`#e6915d`), Lime (`#c0d4a7`), Sky (`#9ab6c8`), Steel (`#a5b8c0`), Periwinkle (`#8c9ae0`), Olive (`#8e8a25`).
- **Typography Phân Tầng Fluid Scaling:** Tự động điều chỉnh kích thước chữ qua `clamp()` giữa màn hình di động 320px đến màn hình máy tính 4K.
- **3D Elevation & Hiệu Ứng Hoài Cổ:** Viền nổi 3D kép (`win95-raised`, `win95-sunken`, `win95-flat`), Neon Glow, CRT scanlines, mặt trời kẻ sọc (`vapor-sun`), lưới không gian phối cảnh 3D (`vapor-grid-bg`), con trỏ chuột pixel retro, thanh cuộn Windows 95 tùy biến.

---

## 2. Thư Viện Thành Phần UI Mới & Nâng Cấp

| Thành Phần | File | Mô Tả & Tính Năng |
| :--- | :--- | :--- |
| **Thanh Tin Tức Retro** | [`MarqueeTicker.astro`](file:///d:/lovelyyellowcat/src/components/MarqueeTicker.astro) | Chạy chữ vô tận kiểu Netscape Navigator 3.0 với đèn tín hiệu xanh nhấp nháy. |
| **Máy Phát Nhạc Băng Cassette** | [`CassettePlayer.astro`](file:///d:/lovelyyellowcat/src/components/CassettePlayer.astro) | Phát hợp âm Lo-Fi Synthwave bằng Web Audio API, hiệu ứng bánh xe quay và điều khiển Win95. |
| **Thẻ Danh Mục Ribbon Card** | [`RibbonCard.astro`](file:///d:/lovelyyellowcat/src/components/RibbonCard.astro) | Thân card đổi màu theo catalog tint, thanh tiêu đề trắng viền đen tương phản, gắn kèm nhãn dán sticker. |
| **Nhãn Dán GIF 90s** | [`RetroSticker.astro`](file:///d:/lovelyyellowcat/src/components/RetroSticker.astro) | Các mẫu nhãn dán `NEW!`, `VERIFIED`, `HOT`, `CYBER CITIZEN`. |
| **Khung Màn Hình CRT TV** | [`CrtMonitorFrame.astro`](file:///d:/lovelyyellowcat/src/components/CrtMonitorFrame.astro) | Mô phỏng màn hình CRT Sony Trinitron với đèn LED nguồn, nút điều khiển và hiệu ứng quét quét. |
| **Cửa Sổ Win95 Đa Năng** | [`Win95Window.tsx`](file:///d:/lovelyyellowcat/src/components/Win95Window.tsx) | Hỗ trợ thanh menu (`File`, `Edit`, `View`), statusbar phân ô, nút thu nhỏ/phóng to/đóng, 2 theme Classic và Neon. |

---

## 3. Khung Trang & Thanh Điều Hướng

- **[`BaseLayout.astro`](file:///d:/lovelyyellowcat/src/layouts/BaseLayout.astro):** Bọc toàn bộ nội dung trong khung trang biên đen (`page-frame`), tích hợp `MarqueeTicker`, công tắc bật/tắt CRT scanlines lưu trạng thái trong `localStorage`, và widget `CassettePlayer` tiện lợi ở góc phải.
- **[`HeaderNav.astro`](file:///d:/lovelyyellowcat/src/components/HeaderNav.astro):** Phong cách Windows 95 Taskbar & Start Menu với đồng hồ số thời gian thực, khay hệ thống (System Tray), các nút chuyển tab có trạng thái chìm (sunken) khi active, và ngăn kéo menu di động chuẩn touch target $\ge 44\text{px}$.

---

## 4. Các Trang Nội Dung Đã Nâng Cấp

### 4.1. Trang Chủ ([`src/pages/index.astro`](file:///d:/lovelyyellowcat/src/pages/index.astro))
- Mặt trời Vaporwave kẻ sọc (`vapor-sun`) kết hợp lưới không gian 3D (`vapor-grid-bg`) và tiêu đề Glitch.
- Bố cục 2 cột Catalog Magazine: Cột trái chứa Trạng thái hệ thống, Danh mục nhanh, Hotline Callout Panel màu đỏ Dell 1996; Cột phải chứa dòng bài viết Ribbon Cards và khu vực Spotlight Artworks trong khung CRT TV.

### 4.2. Phòng Triển Lãm ([`src/pages/gallery/index.astro`](file:///d:/lovelyyellowcat/src/pages/gallery/index.astro) & [`GalleryGrid.tsx`](file:///d:/lovelyyellowcat/src/components/GalleryGrid.tsx))
- Thanh công cụ Windows Explorer với thanh địa chỉ tìm kiếm trực tiếp.
- Chuyển đổi linh hoạt giữa 3 chế độ xem: **Lưới Icon Win95**, **Danh Sách Chi Tiết Explorer**, và **Khung TV CRT**.
- Lọc theo nhãn dán thể loại, sắp xếp theo thời gian/lượt thích/ngẫu nhiên, infinite scroll mượt mà và Lightbox đầy đủ tính năng.

### 4.3. Chi Tiết Bài Viết ([`src/pages/articles/[slug].astro`](file:///d:/lovelyyellowcat/src/pages/articles/%5Bslug%5D.astro))
- Giao diện trình đọc **WordPad / Win95 Help Viewer** với thanh tiến trình đọc neon ở đỉnh trang.
- Trình bày Markdown sắc nét, trích dẫn viền neon, khối mã console, nút in bài viết/chia sẻ và luồng bình luận thời gian thực lồng nhau.

### 4.4. Danh Sách Nghệ Sĩ ([`src/pages/artists.astro`](file:///d:/lovelyyellowcat/src/pages/artists.astro))
- Danh bạ **Windows 95 Network Neighborhood** với các thẻ căn cước số **Cyber ID Badges** cho từng tác giả.

### 4.5. Tủ Tranh Yêu Thích ([`src/pages/favorites.astro`](file:///d:/lovelyyellowcat/src/pages/favorites.astro))
- Giao diện **Kệ Đĩa Mềm 3.5 Inch (Drive A:\)** riêng tư và hộp thoại cảnh báo bảo mật Windows 95 khi chưa đăng nhập.

### 4.6. Trình Đăng Tranh ([`src/components/SubmissionWizard.tsx`](file:///d:/lovelyyellowcat/src/components/SubmissionWizard.tsx))
- Phong cách **InstallShield Setup Wizard** từng bước (Chọn tệp ảnh Cloudinary, Điền thông tin & Thẻ thể loại, Hoàn tất & Gửi duyệt).

---

## 5. Kết Quả Kiểm Tra (Verification)

- `npx astro sync`: **Thành công 100% (0 errors)**, toàn bộ kiểu dữ liệu TypeScript và cú pháp component Astro/React đều đồng bộ hoàn hảo.
- Đảm bảo tính tương thích đa thiết bị: Touch target $\ge 44\text{px}$, responsive mượt mà từ màn hình nhỏ 320px đến 4K, hỗ trợ `prefers-reduced-motion` và bảo vệ tài nguyên pin.
