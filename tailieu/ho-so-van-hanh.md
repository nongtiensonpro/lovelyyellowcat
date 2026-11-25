# Hồ sơ vận hành & Phạm vi pháp lý LovelyYellowCat

**Ngày lập:** 24/11/2026  
**Trạng thái:** Bản chính thức nội bộ  
**Phục vụ:** Tuân thủ Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15, Nghị định 356/2025/NĐ-CP, Luật Trí tuệ nhân tạo 134/2025/QH15.

---

## 1. Định danh chủ thể vận hành

| Tiêu chí | Thông tin xác thực |
|---|---|
| **Chủ thể sở hữu / Vận hành** | Cá nhân: `nongtiensonpro` (Chủ dự án độc lập) |
| **Email đầu mối duy nhất** | `nongtiensonpro@gmail.com` |
| **Mã nguồn công khai** | [https://github.com/nongtiensonpro/lovelyyellowcat](https://github.com/nongtiensonpro/lovelyyellowcat) |
| **Giấy phép phần mềm** | MIT License (Mã nguồn mở) |
| **Tư cách pháp lý** | Dự án cá nhân phi thương mại, không phải doanh nghiệp / hộ kinh doanh |

---

## 2. Bản chất và phạm vi hoạt động

- **Loại hình:** Tạp chí nghệ thuật số phong cách hoài cổ (Vaporwave / Win95), triển lãm tranh cộng đồng (UGC Art Gallery) và trạm trợ lý sáng tạo nghệ thuật AI.
- **Mô hình tài chính:**
  - **Hoàn toàn phi thương mại:** Không có giỏ hàng, không có thanh toán, không bán gói thành viên (membership), không nhận quyên góp (donation), không chạy quảng cáo hiển thị (AdSense), không gắn link tiếp thị liên kết (affiliate).
  - Không thuộc diện điều chỉnh của các quy định về sàn giao dịch thương mại điện tử hoặc website thương mại điện tử bán hàng theo Luật TMĐT số 122/2025/QH15.
- **Đối tượng người dùng:**
  - Nghệ sĩ, người yêu nghệ thuật số tại Việt Nam và quốc tế.
  - Dự án hướng tới đối tượng người dùng đại chúng từ 16 tuổi trở lên; không chủ đích hướng tới hoặc thu thập dữ liệu trẻ em (dưới 16 tuổi theo Luật Trẻ em Việt Nam).

---

## 3. Kiến trúc hệ thống và luồng dữ liệu chính

1. **Giao diện & Ứng dụng:** Astro SSR chạy trên Cloudflare Workers.
2. **Cơ sở dữ liệu & Xác thực:** Supabase (Auth, Postgres, Realtime, Vault).
3. **Lưu trữ đa phương tiện:** Cloudinary (CDN ảnh nghệ thuật & avatar).
4. **Trí tuệ nhân tạo (AI):** Google Gemini API (thông qua Gateway hệ thống hoặc người dùng tự nhập BYOK từ trình duyệt).
5. **Chống thư rác & Bot:** Google reCAPTCHA (v2/v3).
6. **Thông báo hệ thống:** Gmail SMTP.
7. **Đo lường hiệu năng kỹ thuật:** Web Vitals Telemetry gửi về endpoint nội bộ `/api/ui-telemetry`.

---

## 4. Quyết định pháp lý - kỹ thuật đã chốt (24/11/2026)

1. **BYOK (Bring Your Own Key):**
   - Giữ tính năng để người dùng nhập Gemini API key từ trình duyệt.
   - Key không lưu trữ trên máy chủ, chỉ lưu ở phiên trình duyệt.
   - Thêm modal cảnh báo người dùng tự bảo vệ key, tự chịu chi phí phát sinh, và khuyến nghị sử dụng key miễn phí (free tier).
2. **Consent Banner:**
   - Triển khai banner xin chấp thuận trước khi tải Google reCAPTCHA và Web Vitals Telemetry nhằm đáp ứng yêu cầu đồng ý rõ ràng (opt-in) của Luật 91/2025.
3. **Cơ chế xóa tài khoản:**
   - Xây dựng quy trình xóa tài khoản đầy đủ: Tự động trích xuất dữ liệu (Data Export JSON) -> Soft-delete 30 ngày -> Cascade hard-delete toàn bộ dữ liệu Supabase, Cloudinary, AI sessions -> Email thông báo.
4. **Thời hạn lưu giữ (Retention) AI:**
   - Thiết lập thời hạn lưu trữ phiên AI tối đa 6 tháng rồi tự động xóa định kỳ, thay thế cho chính sách "vĩnh viễn" trước đây.
