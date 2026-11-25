# Sơ đồ luồng dữ liệu (Data Flow Diagram) — LovelyYellowCat

**Dự án:** LovelyYellowCat  
**Cập nhật:** 24/11/2026

```mermaid
flowchart TD
    subgraph Client ["Client Browser (Trình duyệt Người dùng)"]
        UI["Astro Frontend UI\n(Vaporwave / Win95 Shell)"]
        Consent["Consent Manager\n(Chấp thuận Cookie/reCAPTCHA)"]
        E2EE["Trình mã hóa Client\n(Web Crypto API - AES-GCM 256)"]
        BYOK["Bộ nhớ RAM Phiên\n(Gemini API Key cá nhân)"]
    end

    subgraph Edge ["Mạng phân phối biên"]
        CF["Cloudflare Workers\n(SSR + Routing + Security Cache)"]
    end

    subgraph Backend ["Hạ tầng Lưu trữ & Xử lý"]
        SupaDB[("Supabase Postgres\n- Profiles\n- Artworks\n- Encrypted AI Data\n- Telemetry")]
        SupaAuth["Supabase Auth\n(Quản lý phiên & JWT)"]
        Cloudinary["Cloudinary CDN\n(Lưu trữ & Phân phối ảnh)"]
    end

    subgraph Upstream ["Nhà cung cấp Dịch vụ Trực tiếp"]
        GoogleOAuth["Google Identity\n(OAuth Sign-In)"]
        GoogleCaptcha["Google reCAPTCHA\n(Chống Bot Spam)"]
        GeminiAPI["Google Gemini AI API\n(Xử lý Prompt & Phản hồi)"]
        GmailSMTP["Gmail SMTP\n(Chuyển phát Email)"]
    end

    %% Các luồng dữ liệu
    UI -- "1. Yêu cầu tải trang (HTTPS)" --> CF
    Consent -- "2. Chấp thuận nạp script" --> GoogleCaptcha
    UI -- "3. Đăng nhập Google" --> GoogleOAuth
    GoogleOAuth -- "Token xác thực" --> SupaAuth
    SupaAuth -- "Lưu thông tin tài khoản cơ bản" --> SupaDB

    UI -- "4. Tải tranh nghệ thuật" --> Cloudinary
    UI -- "5. Lưu metadata tác phẩm" --> SupaDB

    %% Luồng AI
    UI -- "6a. Prompt chưa mã hóa" --> E2EE
    E2EE -- "Bản mã ciphertext + iv" --> SupaDB
    UI -- "6b. Gửi Prompt tạo nội dung (Server Key)" --> CF
    CF -- "Gọi mô hình AI" --> GeminiAPI
    BYOK -. "6c. Luồng BYOK: Gọi trực tiếp từ trình duyệt" .-> GeminiAPI

    %% Luồng Email
    CF -- "7. Gửi thông báo hệ thống" --> GmailSMTP
```

---

## Các điểm nút kiểm soát an toàn dữ liệu:
1. **Trước Edge:** Toàn bộ lưu lượng được bảo vệ bởi TLS 1.3 và tường lửa Cloudflare WAF.
2. **Tại Database:** Cơ chế Supabase Row Level Security (RLS) đảm bảo người dùng chỉ được đọc và sửa dữ liệu thuộc quyền sở hữu của chính họ (`auth.uid() = user_id`).
3. **Tại dữ liệu AI:** Mã hóa đầu-cuối tại trình duyệt, cơ sở dữ liệu và quản trị viên không thể đọc nội dung plaintext.
4. **Đối với khóa BYOK:** Khóa của người dùng không đi qua máy chủ LovelyYellowCat, hạn chế triệt để nguy cơ rò rỉ khóa từ phía backend.
