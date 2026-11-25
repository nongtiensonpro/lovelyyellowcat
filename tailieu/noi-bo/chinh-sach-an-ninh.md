# Chính sách An ninh Thông tin Nội bộ (Security Policy)

**Dự án:** LovelyYellowCat  
**Phiên bản:** 2.0 (Cập nhật tháng 11/2026)  
**Phạm vi:** Áp dụng cho toàn bộ kiến trúc hạ tầng, mã nguồn và quy trình vận hành website.  
**Căn cứ pháp lý:** Luật An ninh mạng số 116/2025/QH15, Nghị định số 333/2026/NĐ-CP, Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15.

---

## 1. Nguyên tắc an ninh nền tảng

1. **Phòng vệ theo chiều sâu (Defense-in-Depth):** Bảo vệ ở nhiều lớp độc lập: Cloudflare Edge WAF -> Cloudflare Workers SSR -> Supabase Row Level Security -> Mã hóa dữ liệu Client-side.
2. **Nguyên tắc đặc quyền tối thiểu (Principle of Least Privilege):** Mỗi dịch vụ, tài khoản và hàm chỉ được cấp quyền tối thiểu cần thiết để thực hiện chức năng được giao.
3. **Mô hình Zero-Trust:** Không tin cậy dữ liệu đầu vào từ client; mọi tham số và token xác thực đều phải được kiểm tra lại ở cấp cơ sở dữ liệu.
4. **Không thu thập dữ liệu dư thừa (Data Minimization):** Chỉ thu thập các trường dữ liệu tối thiểu phục vụ trực tiếp cho chức năng ứng dụng.

---

## 2. Quản lý quyền truy cập & Phân quyền (Access Control)

* **Tài khoản người dùng thông thường (`user`):**
  - Đăng nhập qua Google OAuth tiêu chuẩn.
  - Chỉ có quyền đọc, tạo, sửa, xóa dữ liệu thuộc quyền sở hữu của chính mình (`auth.uid() = user_id`).
* **Tài khoản quản trị (`admin`):**
  - Phân quyền chặt chẽ thông qua bảng `profiles.role = 'admin'`.
  - Mọi thao tác duyệt tranh, gỡ bài hoặc khóa tài khoản đều phải được ghi lại trong `admin_audit_log` kèm mốc thời gian, IP và lý do thực hiện.
  - Không được phép can thiệp hoặc giải mã lịch sử hội thoại AI của người dùng (bị chặn ở cấp DB bởi RLS và mã hóa E2EE).

---

## 3. Chính sách Cơ sở dữ liệu & Row Level Security (RLS)

1. **Bắt buộc bật RLS:** Toàn bộ bảng trong cơ sở dữ liệu Supabase PostgreSQL thuộc schema `public` **bắt buộc phải bật RLS (`ENABLE ROW LEVEL SECURITY`)**.
2. **Kiểm soát anon role:**
   - Role ẩn danh (`anon`) chỉ được phép thực hiện `SELECT` đối với các nội dung công khai (bài viết tạp chí, tranh đã duyệt triển lãm, danh mục thẻ tags).
   - Nghiêm cấm cấp quyền `INSERT`, `UPDATE`, `DELETE` cho role `anon` trên mọi bảng người dùng.
3. **Chính sách đối với khóa `service_role`:**
   - Khóa `service_role` có quyền vượt qua RLS; tuyệt đối **KHÔNG BAO GIỜ** được gửi xuống trình duyệt client hoặc để lộ trong tệp bundle JS.
   - Hạn chế tối đa việc sử dụng `service_role` trên server; ưu tiên sử dụng `createSupabaseServerClient` gắn với session của người dùng để RLS tự động thực thi.

---

## 4. Quản lý Khóa bí mật & Biến môi trường (Secrets Management)

* **Quy tắc Git:** Tuyệt đối không commit bất kỳ file `.env`, API key, Service Key, App Password vào kho lưu trữ GitHub (được chặn bởi `.gitignore`).
* **Hạ tầng lưu trữ khóa:**
  - Khóa hệ thống Cloudflare Workers được lưu trên Cloudflare Dashboard Environment Secrets.
  - Khóa API nội bộ được bảo vệ trong Supabase Vault (`vault.secrets`).
  - Khóa Google Gemini hệ thống chỉ được dùng trên môi trường máy chủ.
* **Xoay vòng khóa (Rotation):** Kiểm tra và xoay vòng toàn bộ khóa bí mật định kỳ 12 tháng/lần hoặc ngay lập tức khi nghi ngờ có sự cố an ninh.

---

## 5. Tiêu chuẩn Mã hóa Dữ liệu (Encryption Standards)

* **Mã hóa khi truyền tải (Data in Transit):**
  - 100% kết nối bắt buộc sử dụng giao thức **HTTPS / TLS 1.3**.
  - Bật tính năng HSTS (HTTP Strict Transport Security) và tự động chuyển hướng HTTP -> HTTPS tại tầng Cloudflare.
* **Mã hóa khi lưu trữ (Data at Rest):**
  - Cơ sở dữ liệu và tệp lưu trữ được mã hóa tự động tại cấp đĩa cứng (AES-256) trên hạ tầng AWS/Cloudflare/Supabase.
  - **Dữ liệu hội thoại AI:** Áp dụng mã hóa đầu-cuối (E2EE) cấp ứng dụng:
    - Thuật toán mã hóa đối xứng: **AES-GCM 256-bit**.
    - Dẫn xuất khóa: **PBKDF2 với 250.000 vòng lặp SHA-256** và salt 16-byte ngẫu nhiên.
    - Khởi tạo vector ngẫu nhiên: **IV 12-byte mới hoàn toàn cho mỗi lần mã hóa** (tuyệt đối không tái sử dụng IV).

---

## 6. Chính sách Quản lý Nhật ký & Đo lường (Logging & Observability)

1. **Không log dữ liệu cá nhân (No-PII Policy):**
   - Không in địa chỉ email, họ tên, mật khẩu, API key, token JWT hoặc nội dung hội thoại vào `console.log` trên Workers.
   - Đo lường hiệu năng Web Vitals chỉ gửi các thông số kỹ thuật (LCP, CLS, FID, mã phiên hash ngẫu nhiên) và chỉ nạp khi có sự đồng ý của người dùng.
2. **Thời hạn lưu trữ nhật ký:**
   - Cloudflare Workers Observability Logs: Tự động ghi đè theo chu kỳ mặc định của gói dịch vụ Cloudflare (không lưu trữ vĩnh viễn).
   - Audit Log quản trị: Lưu trữ trong cơ sở dữ liệu tối đa 12 tháng phục vụ giám sát và giải trình sự cố.

---

## 7. Quy trình Kiểm thử An ninh & Vá lỗi

* **Kiểm thử tự động:** Mọi bản phát hành mã nguồn mới đều phải vượt qua:
  - `npm run typecheck`: Kiểm tra tính toàn vẹn của kiểu dữ liệu.
  - `npm test`: Bộ kiểm thử đơn vị hồi quy (Unit Test Suite).
* **Rà soát định kỳ:** Kiểm tra lại toàn bộ chính sách an ninh thông tin mỗi **06 tháng/lần**.
