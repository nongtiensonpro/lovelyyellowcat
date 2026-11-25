# Sổ đăng ký hoạt động xử lý dữ liệu cá nhân (Nội bộ)

**Đơn vị:** Dự án Tạp chí nghệ thuật số LovelyYellowCat  
**Người phụ trách:** `nongtiensonpro` (Chủ dự án)  
**Liên hệ:** `nongtiensonpro@gmail.com`  
**Căn cứ pháp lý:** Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và Nghị định số 356/2025/NĐ-CP.

---

## 1. Thông tin chung
- **Tên tổ chức/cá nhân kiểm soát dữ liệu:** Cá nhân `nongtiensonpro` (Dự án phi thương mại LovelyYellowCat).
- **Mục tiêu:** Lưu trữ nội bộ để phục vụ quản trị rủi ro dữ liệu cá nhân, sẵn sàng xuất trình khi có yêu cầu thanh tra, kiểm tra của Cục An ninh mạng và phòng, chống tội phạm sử dụng công nghệ cao (A05) - Bộ Công an.

---

## 2. Nhật ký các hoạt động xử lý dữ liệu cá nhân

### Hoạt động 1: Quản lý thành viên & Xác thực người dùng (Auth & Membership)
- **Mã hoạt động:** `ACT-01`
- **Mục đích:** Cung cấp tài khoản cá nhân để người dùng lưu tranh yêu thích, gửi tác phẩm tham gia triển lãm và sử dụng trợ lý nghệ thuật AI.
- **Nhóm chủ thể dữ liệu:** Người dùng đã đăng ký tài khoản (Việt Nam & quốc tế).
- **Loại dữ liệu:** Tên, địa chỉ email, ảnh đại diện Google, ngày tạo tài khoản.
- **Căn cứ pháp lý:** Sự đồng ý của chủ thể dữ liệu (thông qua luồng OAuth consent & điều khoản dịch vụ).
- **Bên nhận dữ liệu / Xử lý thay mặt:** Supabase Inc., Google LLC.
- **Thời hạn lưu trữ:** Đến khi chủ thể dữ liệu thực hiện quyền xóa tài khoản.
- **Biện pháp an toàn áp dụng:** Mã hóa đường truyền HTTPS/TLS 1.3, phân quyền cơ sở dữ liệu qua Row Level Security (RLS) của Supabase Postgres.

### Hoạt động 2: Triển lãm nghệ thuật do người dùng đóng góp (UGC Art Gallery)
- **Mã hoạt động:** `ACT-02`
- **Mục đích:** Tiếp nhận, hiển thị và phân phối tác phẩm tranh nghệ thuật số của cộng đồng.
- **Nhóm chủ thể dữ liệu:** Tác giả / Nghệ sĩ gửi tranh.
- **Loại dữ liệu:** Tệp hình ảnh tác phẩm, tên tác phẩm, phong cách, phần giới thiệu tác phẩm.
- **Căn cứ pháp lý:** Sự đồng ý của tác giả (tích chọn cam kết quyền tác giả và cấp quyền hiển thị phi thương mại).
- **Bên nhận dữ liệu:** Cloudinary Ltd. (mạng phân phối nội dung ảnh CDN), Supabase Inc.
- **Thời hạn lưu trữ:** Đến khi tác giả chủ động gỡ tác phẩm hoặc xóa tài khoản.
- **Biện pháp an toàn:** Kểm tra định dạng và kích thước tệp tải lên, lưu trữ trên hạ tầng đám mây đạt chuẩn SOC2/ISO27001.

### Hoạt động 3: Trạm tương tác Trí tuệ nhân tạo (CAT_AI Station)
- **Mã hoạt động:** `ACT-03`
- **Mục đích:** Cung cấp trải nghiệm trò chuyện, trợ lý ý tưởng sáng tác phong cách Vaporwave/Cyberpunk.
- **Nhóm chủ thể dữ liệu:** Người dùng có tài khoản sử dụng tính năng AI.
- **Loại dữ liệu:** Lời nhắc nghệ thuật (prompt), lịch sử trò chuyện, API key cá nhân (nếu dùng chế độ BYOK).
- **Căn cứ pháp lý:** Sự đồng ý rõ ràng trước khi bắt đầu phiên AI (AI Disclosure & Consent).
- **Bên nhận dữ liệu:** Google LLC (Google Gemini API).
- **Thời hạn lưu trữ:** **Tối đa 6 tháng** trên Supabase, sau đó tự động xóa; đối với key BYOK: chỉ lưu trên RAM/session trình duyệt, không lưu trữ trên máy chủ.
- **Biện pháp an toàn:**
  - Mã hóa đầu-cuối (E2EE) cấp client bằng thuật toán **AES-GCM 256-bit** với khóa dẫn xuất qua **PBKDF2 (250.000 vòng SHA-256)** trước khi lưu vào cơ sở dữ liệu.
  - Quản trị viên và bên thứ ba không có khóa giải mã.
  - Chính sách giới hạn tần suất (Rate Limit 30 yêu cầu/phút).

### Hoạt động 4: Giám sát an ninh và chống hành vi phá hoại (Anti-Bot & Security)
- **Mã hoạt động:** `ACT-04`
- **Mục đích:** Phát hiện bot tự động, phòng chống thư rác (spam submission), bảo đảm tính sẵn sàng của website.
- **Nhóm chủ thể dữ liệu:** Người dùng truy cập biểu mẫu gửi tranh.
- **Loại dữ liệu:** Địa chỉ IP, hành vi tương tác trên trình duyệt, thông số phần cứng/phần mềm thiết bị.
- **Căn cứ pháp lý:** Sự đồng ý của người dùng thông qua Consent Banner trước khi script reCAPTCHA được kích hoạt.
- **Bên nhận dữ liệu:** Google LLC (reCAPTCHA v2/v3).
- **Thời hạn lưu trữ:** Tự động theo chu kỳ đánh giá của Google.
- **Biện pháp an toàn:** Script chỉ được tải khi người dùng đã chấp thuận; có cơ chế dự phòng honeypot cho người dùng từ chối.

---

## 3. Kế hoạch rà soát và đánh giá định kỳ
- **Tần suất rà soát sổ:** 06 tháng/lần hoặc khi tích hợp thêm tính năng mới thu thập dữ liệu cá nhân.
- **Lần rà soát tiếp theo:** Tháng 05/2027.
