# Bảng kiểm kê dữ liệu cá nhân (Data Inventory)

**Dự án:** LovelyYellowCat  
**Phiên bản:** 2.0 (Cập nhật ngày 24/11/2026)  
**Khung tham chiếu:** Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 và Nghị định 356/2025/NĐ-CP.

---

## Danh mục chi tiết các luồng dữ liệu

| Nhóm dữ liệu | Thành phần cụ thể | Phân loại | Mục đích xử lý | Căn cứ hợp pháp | Nơi lưu trữ | Bên thứ ba tiếp nhận | Thời hạn lưu giữ | Cơ chế xóa / Trích xuất |
|---|---|---|---|---|---|---|---|---|
| **Định danh & Tài khoản** | Email, Tên hiển thị, Avatar URL, Google UID | Dữ liệu cơ bản | Xác thực đăng nhập, phân quyền, hiển thị hồ sơ cá nhân | Sự đồng ý (Google OAuth Consent) | Supabase Auth (`auth.users`), `profiles` | Google Identity | Đến khi tài khoản bị xóa | Tự phục vụ xóa tài khoản (Data Export + Cascade Delete) |
| **Hồ sơ cá nhân mở rộng** | Tiểu sử (Bio), Ảnh bìa (Banner), Liên kết MXH | Dữ liệu cơ bản | Tùy biến trang cá nhân của nghệ sĩ | Sự đồng ý (Lưu trong form) | Supabase (`profiles`), Cloudinary | Cloudinary (ảnh bìa) | Đến khi người dùng sửa hoặc xóa tài khoản | Xóa trực tiếp trong ProfileEditor hoặc cascade |
| **Nội dung do người dùng đăng (UGC)** | Hình ảnh tranh vẽ, Tiêu đề, Mô tả, Phong cách nghệ thuật | Dữ liệu cơ bản | Triển lãm tranh nghệ thuật công khai | Sự đồng ý (Submit Form) | Supabase (`artworks`/`submissions`), Cloudinary | Cloudinary CDN | Đến khi tác giả xóa hoặc tài khoản bị xóa | Xóa tác phẩm trong Dashboard cá nhân |
| **Tương tác cộng đồng** | Bình luận, Lượt thích (Reactions), Danh sách yêu thích (Favorites) | Dữ liệu cơ bản | Giao lưu, kết nối người yêu nghệ thuật | Sự đồng ý | Supabase | Không | Đến khi người dùng xóa hoặc tài khoản bị xóa | Soft-delete 30 ngày -> Hard delete khi xóa tài khoản |
| **Hội thoại Trợ lý AI** | Lời nhắc (prompts), Phản hồi của Mèo Vàng AI, Tiêu đề phiên | Có thể chứa thông tin nhạy cảm | Hỗ trợ sáng tạo nghệ thuật số, gợi ý phong cách | Sự đồng ý rõ ràng (Opt-in trước phiên) | Supabase (`ai_sessions`, `ai_messages`) - Mã hóa AES-GCM 256 | Google Gemini API (khi gọi sinh câu trả lời) | **Tối đa 6 tháng** kể từ ngày tạo hoặc đến khi xóa tài khoản | Xóa từng phiên, xóa toàn bộ trong Trạm AI, hoặc xóa cascade |
| **Khóa API cá nhân (BYOK)** | Google Gemini API Key của người dùng | Thông tin bí mật / nhạy cảm | Cho phép người dùng dùng hạn mức riêng khi chat AI | Sự đồng ý (Chủ động nhập key) | Trình duyệt người dùng (Session Memory, không lưu DB) | Google Gemini API trực tiếp từ trình duyệt | Chỉ lưu trong phiên duyệt web hiện tại | Tự xóa khi đóng tab, đóng trình duyệt hoặc bấm nút "Xóa key" |
| **Chống bot & An ninh** | Địa chỉ IP, Token phản hồi, Hành vi chuột | Dữ liệu kỹ thuật | Ngăn chặn spam tự động, bảo vệ form gửi tranh | Sự đồng ý qua Consent Banner | Google reCAPTCHA servers | Google LLC | Theo chính sách lưu giữ của Google | Tự động hết hạn theo token reCAPTCHA |
| **Đo lường kỹ thuật (Telemetry)** | Web Vitals (CLS, LCP, FID), Tốc độ tải, Loại thiết bị | Dữ liệu kỹ thuật (Không PII) | Tối ưu hóa hiệu năng và độ ổn định hệ thống | Sự đồng ý qua Consent Banner | Supabase (`ui_telemetry`) | Không | 6 tháng (tổng hợp thống kê rồi xóa raw log) | Tự động luân chuyển (log rotation) |
| **Nhật ký máy chủ (Observability)** | IP truy cập, HTTP Method, Path, Status Code | Dữ liệu kỹ thuật | Vận hành máy chủ, giám sát an ninh mạng | Lợi ích hợp pháp của bên kiểm soát | Cloudflare Workers Logs | Cloudflare | Tối đa 72 giờ theo cấu hình Cloudflare edge | Tự động ghi đè |
