# Danh mục nhà cung cấp dịch vụ bên thứ ba (Vendor Inventory)

**Dự án:** LovelyYellowCat  
**Cập nhật:** 24/11/2026  
**Căn cứ:** Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15, Nghị định 356/2025/NĐ-CP (Đánh giá chuyển dữ liệu ra nước ngoài).

---

| STT | Nhà cung cấp | Dịch vụ cung ứng | Dữ liệu chia sẻ / xử lý | Khu vực máy chủ (Data Region) | Căn cứ pháp lý / Thỏa thuận | Đánh giá rủi ro |
|---|---|---|---|---|---|---|
| **1** | **Supabase Inc.** | Cơ sở dữ liệu Postgres, Xác thực Auth, Realtime WebSocket, Vault Secrets | Thông tin tài khoản, hồ sơ (bio/avatar), bài viết, bình luận, reaction, favorites, telemetry, AI sessions (mã hóa E2EE) | AWS Global / Singapore / US (tùy cấu hình project) | Supabase DPA & ToS (GDPR compliant) | 🟡 Dữ liệu lưu trữ đám mây ngoài VN. Dữ liệu AI đã được mã hóa đầu cuối AES-GCM 256. |
| **2** | **Cloudflare, Inc.** | Mạng biên CDN, Edge Compute (Cloudflare Workers), Observability Logs | IP người truy cập, URL request, HTTP headers, telemetry logs | Mạng lưới Anycast toàn cầu (bao gồm POPs tại VN) | Cloudflare DPA | 🟢 Hạ tầng bảo mật tiêu chuẩn quốc tế, log Workers cấu hình luân chuyển tự động. |
| **3** | **Cloudinary Ltd.** | Lưu trữ & tối ưu hóa hình ảnh nghệ thuật, avatar | Tệp ảnh do người dùng tải lên, metadata ảnh | AWS / Global CDN | Cloudinary Terms & DPA | 🟢 Chỉ chứa tệp đa phương tiện công khai và ảnh đại diện. Có API xóa sạch file khi xóa tài khoản. |
| **4** | **Google LLC (OAuth)** | Dịch vụ đăng nhập Google Sign-In | Email, Tên tài khoản Google, URL ảnh đại diện | Toàn cầu (Hoa Kỳ) | Google Cloud Identity ToS | 🟡 Dữ liệu xác thực tài khoản cơ bản. Chỉ lấy phạm vi quyền tối thiểu (email, profile). |
| **5** | **Google LLC (reCAPTCHA)** | Phát hiện bot & chống spam tại form gửi tranh | Địa chỉ IP, thao tác chuột, thông số trình duyệt | Toàn cầu (Hoa Kỳ) | Google Privacy Policy & ToS | 🔴 Cần xin chấp thuận (Consent) qua banner trước khi nạp script theo Luật 91/2025. |
| **6** | **Google LLC (Gemini API)** | Xử lý ngôn ngữ tự nhiên / Chatbot nghệ thuật AI | Lời nhắc (prompts), nội dung trao đổi nghệ thuật | Toàn cầu (Hoa Kỳ) | Google AI Studio Terms / Gemini API ToS | 🟡 Luồng server dùng key hệ thống; luồng BYOK dùng key cá nhân người dùng gửi trực tiếp từ trình duyệt. |
| **7** | **Google LLC (Gmail SMTP)** | Gửi email thông báo tự động (thông báo tài khoản, gỡ bài) | Địa chỉ email người nhận, tiêu đề & nội dung thông báo | Máy chủ Google | Google Workspace / Gmail ToS | 🟢 Chỉ dùng để chuyển phát email giao dịch, không lưu trữ dài hạn tại ứng dụng. |

---

## Biện pháp bảo vệ bổ sung áp dụng cho các nhà cung cấp:
- Tất cả kết nối đều bắt buộc mã hóa qua **HTTPS / TLS 1.3**.
- Dữ liệu lịch sử AI lưu tại Supabase được mã hóa đầu-cuối phía client (AES-GCM 256), Supabase và quản trị viên không thể đọc được nội dung gốc.
- Đối với reCAPTCHA: Chỉ kích hoạt tại trang `/submit` và chỉ nạp sau khi người dùng chấp thuận.
- Đối với BYOK Gemini: Khóa API người dùng không gửi lên máy chủ của LovelyYellowCat, chỉ tồn tại trong bộ nhớ phiên trình duyệt.
