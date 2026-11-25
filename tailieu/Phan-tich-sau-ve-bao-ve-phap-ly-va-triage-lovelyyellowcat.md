# Phân tích sâu: bảo vệ LovelyYellowCat trước quy định mới — Triage theo vn-law-check

**Ngày lập:** 17/11/2026 22:10 (giờ VN)
**Mục đích:** bổ sung cho `Ke-hoach-bao-ve-phap-ly-lovelyyellowcat-2026.md`. Tài liệu này **chỉ phân tích & hướng dẫn — KHÔNG chứa mã nguồn, không sửa code**.
**Phương pháp:** tải trực tiếp các `references/*.md` từ repo `mhfed/vn-law-check` nhánh `main` (xác thực bằng GitHub API tree, 18 file), sau đó đối chiếu từng tiêu chí với mã nguồn thật trong `D:\lovelyyellowcat` (trích `file:dòng`). Giữ nguyên thang đánh giá của công cụ: 🔴 cao / 🟡 trung bình / 🟢 thấp / ⚪ không áp dụng. Nhãn là **giả thuyết cần kiểm chứng**, không phải kết luận pháp lý; cần đối chiếu văn bản gốc và ý kiến chuyên gia trước khi hành động.

---

## 0. Nhận định nền tảng (đọc kỹ trước khi xem bảng)

- `vn-law-check` **không phải luật**: nó là skill/trợ lý tra cứu, cảnh báo mức độ rủi ro dựa trên từ khóa, có `DISCLAIMER.md` nhấn mạnh "không thay thế luật sư". Dùng nó để **soát sót**, không để **kết luận**. Đây là điểm mấu chốt: nếu dùng máy móc, rất dễ gán nhãn sai cho một dự án nghệ thuật phi thương mại.
- Bản chất LovelyYellowCat theo README/footer/`terms.astro`: **tạp chí nghệ thuật số phi thương mại**, mã nguồn mở MIT, không bán hàng/P2P, không dùng cookie analytics, doanh nghiệp/tổ chức không rõ (chỉ có email `nongtiensonpro@gmail.com` và repo GitHub cá nhân). Vì vậy **luồng TMĐT và Luật Bảo vệ người tiêu dùng phần lớn là ⚪/🟢**, trừ khi có thay đổi mô hình.
- Tuy nhiên có **ba cụm thực sự nhạy cảm** đã được xác nhận bằng code: (1) dữ liệu cá nhân qua Google OAuth + hồ sơ + Cloudinary, (2) AI Gemini với dữ liệu lưu "vĩnh viễn" và khả năng gửi key trực tiếp từ trình duyệt, (3) reCAPTCHA và telemetry gửi dữ liệu tới bên thứ ba mà chưa có cơ chế đồng ý rõ ràng.

---

## 0.5 Phân loại mức độ theo vn-law-check (bắt buộc làm đầu tiên)

Repo yêu cầu chạy `00-triage.md` **trước khi mở checklist**. Tự quét thực tế cho thấy LovelyYellowCat có: form thu thập (đăng nhập Google, gửi tranh, bình luận, hồ sơ), tài khoản người dùng, chatbot AI gửi tin nhắn tới Gemini/bên thứ ba, và reCAPTCHA/telemetry — nhưng **không có** giỏ hàng/thanh toán, **không có** analytics quảng cáo (không thấy `gtag`/`fbq`). Theo bảng phân loại:

- **Mức 1 (thu thập nhẹ) + mức 3 (nền tảng có tài khoản) → áp dụng checklist 01 đầy đủ + 03 + 07.** Cụ thể: có tài khoản + AI gửi dữ liệu ra bên thứ ba → tối thiểu mức 1 và thêm AI; quy mô người dùng hiện tại chưa rõ nên dùng mức 3 một cách thận trọng.
- **Checklist 02 (TMĐT), 04 (tiêu dùng), 05 (quảng cáo), 06 (giao dịch điện tử): ⚪**, trừ khi mô hình đổi.
- **Checklist 07 (AI): luôn áp dụng** vì có chatbot, bất kể phi thương mại.
- Lưu ý repo: site cá nhân có thu dữ liệu vẫn thuộc diện điều chỉnh (điểm a khoản 2 Điều 1 Luật 91/2025); miễn một phần cho hộ kinh doanh/doanh nghiệp siêu nhỏ theo Điều 38 **không** miễn nghĩa vụ hồ sơ chuyển dữ liệu xuyên biên giới (khoản 2 Điều 20). Đây là lý do mục 1.1 đánh giá 🔴 dù dự án phi thương mại.

## 1. Kết quả triage theo từng văn bản (đối chiếu trực tiếp với code)

### 1.1 Luật 91/2025 + NĐ 356/2025 (dữ liệu cá nhân) — mức 🔴 cần xử lý

> **Hiệu đính quan trọng:** `sources/legal-references.md` của repo ghi rõ **NĐ 13/2023 đã hết hiệu lực từ 01/01/2026**, bị thay bởi **Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15** và **NĐ 356/2025/NĐ-CP** (cả hai hiệu lực 01/01/2026). Mọi tài liệu/dòng code còn dẫn NĐ 13 cần cập nhật. NĐ 330/2026 (19/08/2026) là văn bản xử phạt; NĐ 363/2026 (11/11/2026) xử phạt lĩnh vực dữ liệu theo Luật Dữ liệu 60/2024.

| Tiêu chí của vn-law-check | Kết quả | Bằng chứng trong LovelyYellowCat |
|---|---|---|
| Có chính sách bảo vệ DLCN riêng (`privacy policy`) | 🔴 **chưa có** | Tài liệu pháp lý duy nhất là `src/pages/terms.astro` (Điều khoản). Footer `src/layouts/BaseLayout.astro:275–277` chỉ link `/terms`, **không có link `/privacy` hay `/cookie`**. Không có file `privacy.astro` nào trong repo. |
| Có cơ chế xin ý kiến/đồng ý trước khi thu thập | 🔴 **chưa có rõ** | Đăng nhập Google OAuth (`src/pages/api/auth/signin.ts:14–18`) và form gửi tranh (`src/pages/submit.astro`) không có bước "tôi đồng ý cho xử lý dữ liệu cá nhân" riêng. `terms.astro:341` chỉ nói dữ liệu lưu vĩnh viễn, không phải sự đồng ý theo Điều 11. |
| Mục đích thu thập cụ thể | 🟢 phần lớn ok | `terms.astro:144–170`, `ai-security.astro` nêu mục đích (đăng tranh, lịch sử chat, chống bot). Cần gom lại thành bảng mục đích → dữ liệu → bên nhận. |
| Quyền của chủ thể (xem/sửa/xóa/xuất/rút đồng ý) | 🔴 **một phần** | Sửa hồ sơ có `src/components/ProfileEditor.tsx:139–141`. Xem có `/favorites`. **Không tìm thấy** endpoint xóa tài khoản hay xuất dữ liệu (đã grep toàn `src` + `supabase_sql`: chỉ có `ai-security.astro:42` nói "chỉ xóa tài khoản mới xóa cascade" nhưng không có tính năng xóa). |
| Chuyển dữ liệu ra nước ngoài | 🔴 cần mô tả | Dùng Supabase, Cloudinary, Google (`www.google.com/recaptcha/...` ở `BaseLayout.astro:113–121`), SMTP Gmail (`emailNotification.ts:44–46`), Gemini (`src/pages/api/ai/chat.ts:33–40`). Đều là bên thứ ba, khả năng lưu ngoài VN cao. Cần rà soát vị trí lưu trữ thực tế. |
| Thông báo vi phạm 72 giờ | 🟡 | `terms.astro:397–398` có cam kết "gỡ bỏ trong 72 giờ làm việc" — **đây là SLA gỡ nội dung, KHÔNG PHẢI** nghĩa vụ thông báo vi phạm dữ liệu theo Luật 91/2025 / NĐ 356/2025. Không được hiểu nhầm. |

**Hành động ưu tiên:** soạn `privacy.astro` riêng; thêm liên kết trong footer; lập "sổ đăng ký hoạt động xử lý DLCN" theo Luật 91/2025 / NĐ 356/2025 (bên nội bộ: chủ thể, mục đích, loại dữ liệu, bên thứ ba, thời gian lưu, biện pháp bảo mật). Xem xét nút "Xuất dữ liệu / Xóa tài khoản" trong `ProfileEditor`.

### 1.2 Luật An ninh mạng 116/2025 + NĐ 333/2026 — mức 🟡

> Luật 116/2025/QH15 và NĐ 333/2026/NĐ-CP đều hiệu lực 01/07 / 19/08/2026, hợp nhất Luật ANM 2018 và Luật An toàn thông tin mạng 2015. **NĐ 53/2022 chỉ còn áp dụng cho hồ sơ tiếp nhận trước 19/08/2026** (Điều 31 NĐ 333).

| Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|
| Lưu trữ dữ liệu tại VN (Điều 26) | 🟡/🔴 cần xác minh | Toàn bộ hạ tầng là Supabase/Cloudinary/Google/Gemini; chưa thấy cấu hình vùng lưu trữ VN. Cần hỏi nhà cung cấp về data residency. |
| Bảo mật thông tin, logging | 🟢 phần lớn | Có RLS chặt trên bảng AI (`supabase_sql/supabase_ai_encrypted.sql:86–100`), mã hóa đầu cuối phía client (`aiCrypto.ts`), rate limit (`supabase_ai_encrypted.sql:158–167`). Tuy `wrangler.jsonc` bật `observability.logs.persist = true` — cần rà soát nhật ký có chứa DLCN không. |
| Chính sách nội bộ về an ninh thông tin | 🟡 | Có `src/pages/ai-security.astro` (mô tả kỹ thuật cho người dùng) nhưng chưa thấy văn bản nội bộ/quy trình ứng phó sự cố. |
| Cung cấp thông tin cho cơ quan chức năng | ⚪/🟡 | Không có yêu cầu thực tế; chỉ cần chuẩn bị quy trình khi có yêu cầu (không code). |

### 1.3 Luật Trí tuệ nhân tạo 134/2025 + NĐ 142/2026 — mức 🔴 (mới, dễ sót nhất)

> Luật 134/2025/QH15 hiệu lực **01/03/2026**, NĐ 142/2026 hướng dẫn (hiệu lực 01/05/2026, cách thông báo & gắn nhãn tại Điều 18). **Lộ trình chuyển tiếp:** hệ thống đã vận hành trước 01/03/2026 có 12 tháng (đến ~01/03/2027) để tuân thủ; hệ thống đưa vào sau đó áp dụng ngay. LovelyYellowCat cần xác định mình là **nhà cung cấp** hay **bên triển khai** — repo nghiêng về "bên triển khai" (nhúng API Gemini), nhưng mục đích phi thương mại có thể rơi vào trường hợp không thuộc diện điều chỉnh; đây là câu hỏi cần hỏi người làm luật.

| Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|
| Gắn nhãn nội dung do AI tạo | 🔴 **chưa có nhãn hệ thống** | AI persona được định nghĩa ở `src/pages/api/ai/chat.ts:236–250`, hiển thị qua `src/pages/ai.astro:61` (`<AiChatStation client:idle />`). Giao diện có tên "Mèo Vàng Cybernetic / CAT_AI.EXE", nhưng **không có thông báo kiểu "Bạn đang tương tác với hệ thống AI"** ở mức thông báo rõ ràng đầu phiên. `src/pages/terms.astro` có nhắc AI nhưng không phải nhãn tại điểm tương tác. |
| Thông tin về mô hình, dữ liệu huấn luyện, giới hạn | 🟡 | `ai-security.astro` giải thích mã hóa/lưu trữ; `chat.ts:230–234` có danh sách model (Gemini 3.x). Cần gom thành "Thông tin hệ thống AI" công khai. |
| Cơ chế người dùng kiểm soát đầu ra / khiếu nại | 🟡 | Có "xóa phiên" trong `AiChatStation.tsx` (xem `STORAGE_KEY`, API `/api/ai/sessions`). Chưa có nút "Báo cáo nội dung AI sai lệch" riêng. |
| Rủi ro đặc thù: **BYOK gửi key từ trình duyệt** | 🔴 **đáng chú ý** | `AiChatStation.tsx:154–158`: `fetch(..., { headers: { "x-goog-api-key": apiKey.trim() } })` — người dùng tự nhập Gemini API key và trình duyệt gọi trực tiếp Google. Dù key là của người dùng, luồng này khiến **LovelyYellowCat không kiểm soát được nội dung prompt/response đi qua bên thứ ba**, và có thể bị hiểu là cung cấp dịch vụ AI trung gian. Cần quyết định giữ hay bỏ BYOK, và nếu giữ thì ghi rõ trách nhiệm người dùng. |

### 1.4 Luật Thương mại điện tử 122/2025 + NĐ 248/2026 — mức 🟢→⚪ (với điều kiện)

> Cả hai hiệu lực 01/07/2026; website đã đăng ký theo khung cũ được hoạt động đến 30/06/2027 (Điều 41 Luật 122). NĐ 52/2013 và NĐ 85/2021 hết hiệu lực cùng ngày.

| Tiêu chí | Kết quả | Giải thích |
|---|---|---|
| Thông tin nhận dạng thương nhân, địa chỉ, mã số thuế | 🟡→🔴 nếu có giao dịch | Footer chỉ có email. Nếu vẫn "phi thương mại" thì ⚪; nếu sau này có bất kỳ bán hàng/quảng cáo trả phí thì chuyển 🔴 ngay. |
| Hợp đồng điện tử, thanh toán, giao hàng, đổi trả | ⚪ | Không có giỏ hàng/thanh toán/`checkout` nào trong repo. |
| Cookie/analytics tracking | 🟢→🔴 | Không có Google Analytics/Facebook Pixel. **Nhưng** reCAPTCHA (`BaseLayout.astro:113–121`) và telemetry (`src/ui/services/telemetry.ts:89`, `src/pages/api/ui-telemetry.ts`) gửi dữ liệu tới Google/Supabase. Nếu pháp luật coi đây là "theo dõi", cần xin đồng ý. |

### 1.5 Luật Bảo vệ quyền lợi người tiêu dùng 19/2023 — ⚪ (hiện tại)

Không có quan hệ mua bán hàng hóa/dịch vụ tiêu dùng. Giữ nguyên trạng thái theo dõi; chỉ rà soát lại nếu mô hình đổi.

### 1.6 Luật Sở hữu trí tuệ — 🟡 (đã có nền tốt, cần hoàn thiện)

| Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|
| Quy trình notice-and-takedown | 🟢 | `terms.astro:144–170`, email head `terms.astro:381–399`, cam kết 72 giờ. Đây là điểm mạnh nhất của dự án. |
| Tuyên bố "nội dung do người dùng chịu trách nhiệm" | 🟢 | Có trong `terms.astro`. Cần đảm bảo người gửi tranh xác nhận họ có quyền đăng tác phẩm (checkbox "tôi là tác giả / có quyền"). |
| Gắn nhãn AI theo mục 1.3 | 🔴 | Xem lại phần AI. |

---

## 2. Bảng phát hiện xếp theo mức ưu tiên (tổng hợp)

| Mức | Phát hiện | Vị trí bằng chứng | Việc cần làm (chỉ hướng dẫn) |
|---|---|---|---|
| 🔴 | Chưa có Chính sách quyền riêng tư riêng, footer chỉ link `/terms` | `BaseLayout.astro:275–277`, không có `privacy.astro` | Soạn trang riêng + link footer + sổ xử lý DLCN |
| 🔴 | Chưa có cơ chế xóa tài khoản / xuất dữ liệu | grep toàn `src` không thấy endpoint; `ai-security.astro:42` chỉ nói lý thuyết | Thiết kế luồng (yêu cầu → xác thực → xóa cascade → xác nhận) ở giai đoạn code |
| 🔴 | AI chưa có nhãn "đang tương tác với AI" rõ tại điểm dùng | `ai.astro:61`, `chat.ts:236–250` | Thêm thông báo đầu phiên + trang "Thông tin hệ thống AI" |
| 🔴 | BYOK gửi API key trực tiếp từ trình duyệt | `AiChatStation.tsx:154–158` | Quyết định giữ/bỏ; nếu giữ, soạn điều khoản rõ về trách nhiệm & rủi ro |
| 🔴 | Chuyển DLCN ra bên thứ ba chưa được mô tả đầy đủ | `signin.ts:14`, `BaseLayout.astro:117`, `emailNotification.ts:44–46`, `chat.ts:33–40` | Lập bảng "bên nhận dữ liệu" + kiểm tra data residency |
| 🟡 | reCAPTCHA/telemetry là tracking tiềm ẩn, chưa có consent | `BaseLayout.astro:113–121`, `telemetry.ts:89`, `ui-telemetry.ts` | Quyết định có cần banner đồng ý không; nếu có, thiết kế trước khi code |
| 🟡 | `observability.logs.persist = true` — rà soát log có chứa DLCN | `wrangler.jsonc` | Chuẩn hóa log: tách ID kỹ thuật vs dữ liệu cá nhân |
| 🟡 | Chính sách nội bộ an ninh/chính sách ứng phó sự cố chưa thành văn bản | chỉ có `ai-security.astro` (hướng dẫn người dùng) | Soạn quy trình nội bộ 1 trang |
| 🟢 | RLS + mã hóa AI rất tốt; nên giữ và ghi nhận | `supabase_ai_encrypted.sql:86–100`, `aiCrypto.ts` | Không thay đổi; dùng làm bằng chứng tuân thủ |
| 🟢 | Mốc 72h bị nhầm với SLA gỡ nội dung | `terms.astro:397–398` | Tách bạch hai khái niệm trong tài liệu nội bộ |
| ⚪ | TMĐT / tiêu dùng / thanh toán | không có `checkout`/giỏ hàng | Theo dõi, chỉ kích hoạt nếu đổi mô hình |

---

## 3. Đánh giá lại "mức độ bảo vệ hiện tại" (so với kế hoạch tháng 11)

| Trụ cột | Điểm mạnh đã có | Điểm chưa có |
|---|---|---|
| Pháp lý nền tảng | Terms, MIT, notice-and-takedown 72h | Privacy policy, cookie notice, AI disclosure |
| Kỹ thuật bảo mật | RLS owner-only, mã hóa đầu cuối, rate limit, reCAPTCHA | Data residency chưa rõ, log chưa phân loại |
| Quyền người dùng | Sửa hồ sơ, xóa phiên chat | Xuất dữ liệu, xóa tài khoản, rút đồng ý |
| Quản trị nội bộ | — | Sổ xử lý DLCN, quy trình ứng phó sự cố, đầu mối rõ ràng |

**Kết luận ngắn:** LovelyYellowCat có nền bảo mật kỹ thuật tốt hơn mặt trận pháp lý. Khoảng cách lớn nhất nằm ở **giấy tờ/minh bạch hóa** chứ không phải mã hóa hay RLS. Đây là tin tốt: phần lớn công việc ở giai đoạn tới là soạn tài liệu + một vài luồng giao diện, không phải viết lại hạ tầng.

---

## 4. Lộ trình thực hiện đề xuất (chỉ hướng dẫn — code làm sau)

**Giai đoạn A — Khung giấy tờ (1–2 ngày, không code)**
1. Chốt định danh chủ thể vận hành (cá nhân hay tổ chức; tên hiển thị; email đầu mối — hiện mới có Gmail).
2. Soạn `privacy.astro`, `cookie.astro` (nếu cần), `ai-disclosure.astro`; cập nhật liên kết footer (`BaseLayout.astro`).
3. Lập "Sổ đăng ký hoạt động xử lý DLCN" (theo Luật 91/2025 / NĐ 356/2025) và bảng bên thứ ba (Supabase / Cloudinary / Google / Gemini / Gmail SMTP) kèm mục đích & thời gian lưu.
4. Tách riêng khái niệm "SLA gỡ nội dung 72h" và "thông báo vi phạm dữ liệu 72h".

**Giai đoạn B — Quyết định thiết kế (trước khi code)**
5. Quyết định giữ hay bỏ BYOK (điểm 🔴 ở mục 1.3/2). Đây là quyết định sản phẩm, không phải quyết định kỹ thuật.
6. Quyết định có hiển thị banner đồng ý cookie/tracking hay không (dù hiện không có analytics, reCAPTCHA + telemetry vẫn là dữ liệu gửi đi).
7. Quyết định phạm vi quyền người dùng: xuất dữ liệu, xóa tài khoản, rút đồng ý — mức tối thiểu nên làm là **xóa tài khoản** vì `ai-security.astro` đã hứa "cascade".

**Giai đoạn C — Triển khai (sau khi bạn duyệt kế hoạch)**
8. Thêm luồng xóa tài khoản + xuất dữ liệu (dùng RLS hiện có, **không** dùng service_role đọc bảng AI — đã có cảnh báo ở `supabase_ai_encrypted.sql:203–207`).
9. Thêm nhãn AI ở đầu phiên chat; cập nhật `terms.astro` cho nhất quán.
10. Chuẩn hóa log theo `wrangler.jsonc` observability.

**Giai đoạn D — Kiểm chứng & rà soát định kỳ**
11. Chạy lại checklist `vn-law-check` trên repo sau mỗi thay đổi lớn; lưu báo cáo vào `tailieu/`.
12. Rà soát mỗi 6 tháng hoặc khi Luật AI/NĐ hướng dẫn có hiệu lực mới.

---

## 5. Câu hỏi cần bạn quyết định trước khi viết code

1. **Chủ thể vận hành** là cá nhân (`nongtiensonpro`) hay tổ chức? Ảnh hưởng trực tiếp đến nội dung privacy policy và nghĩa vụ đăng ký.
2. **BYOK**: giữ cho phép người dùng nhập Gemini API key từ trình duyệt, hay chuyển hẳn sang chỉ dùng key máy chủ (`GEMINI_API_KEY`/gateway)?
3. **Cookie/consent**: có muốn thêm banner đồng ý cho reCAPTCHA/telemetry không, hay vẫn giữ mô hình "không tracking quảng cáo"?
4. **Xóa tài khoản**: làm mức tối thiểu (xóa theo cascade) hay đầy đủ (xuất dữ liệu + xóa + xác nhận email)?

Khi bạn trả lời 4 mục này, tôi sẽ cập nhật cả hai tài liệu trong `tailieu` thành bản cuối trước khi bước sang phần code.

---

## 6. Nguồn đã dùng (để bạn kiểm chứng)

- Repo `mhfed/vn-law-check` nhánh `main`, tải qua GitHub API tree (18 file) và raw.githubusercontent: `SKILL.md`, `DISCLAIMER.md`, `sources/legal-references.md`, `references/00-triage.md`, `01-personal-data-protection.md`, `02-ecommerce.md`, `03-cybersecurity.md`, `04-consumer-protection.md`, `05-advertising.md`, `06-electronic-transactions.md`, `07-ai-transparency.md`, `08-penalties-reference.md`, `10-generate-policy.md`, `examples/*`.
- Mã nguồn `D:\lovelyyellowcat`: các file đã trích dòng ở bảng trên (đọc trực tiếp bằng Python, không sửa).
- Các mốc hiệu lực đã nêu trong kế hoạch tháng 11 cần được đối chiếu lại với văn bản chính thức trước khi áp dụng; tài liệu này không tự khẳng định thời điểm hiệu lực.

> **Miễn trừ:** Đây là phân tích kỹ thuật nội bộ theo danh mục kiểm tra của `vn-law-check`, **không phải tư vấn pháp lý**. Vui lòng đối chiếu văn bản luật gốc và/hoặc luật sư trước khi đưa ra quyết định có hệ quả pháp lý.
