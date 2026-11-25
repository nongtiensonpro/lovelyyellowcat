# Kế hoạch bảo vệ LovelyYellowCat trước các quy định pháp luật mới

**Ngày lập:** 16/11/2026  
**Phạm vi:** Khảo sát và lập lộ trình tuân thủ cho website LovelyYellowCat; tài liệu này chỉ là kế hoạch hướng dẫn, **không sửa code và không đưa mã nguồn**.  
**Cơ sở tham khảo:** Dự án `mhfed/vn-law-check` (dùng cách phân loại/triage và danh mục kiểm tra làm đầu vào), mã nguồn LovelyYellowCat tại `D:\lovelyyellowcat`, cùng văn bản pháp luật chính thức cần được đối chiếu.

> **Lưu ý quan trọng:** Đây không phải ý kiến tư vấn pháp lý. `vn-law-check` là công cụ/danh mục kiểm tra, không thay thế văn bản pháp luật, luật sư hoặc cơ quan có thẩm quyền. Không biến nhãn “có thể áp dụng” của công cụ thành kết luận rằng LovelyYellowCat chắc chắn thuộc diện phải đăng ký, xin phép, lập hồ sơ hay chịu một thời hạn cụ thể.

## 1. Mục tiêu và nguyên tắc

1. Xác định đúng chủ thể vận hành, chức năng đang hoạt động, dữ liệu, người dùng, nhà cung cấp và nơi xử lý dữ liệu của website.
2. Phân loại từng quy định thành **áp dụng**, **có khả năng áp dụng cần xác minh**, **chỉ áp dụng khi có điều kiện**, hoặc **không áp dụng có căn cứ**.
3. Ưu tiên giảm rủi ro cao: thông báo quyền riêng tư không đầy đủ/không khớp thực tế; tuyên bố pháp lý tuyệt đối nhưng chưa được chứng minh; lưu trữ dữ liệu không thời hạn; nội dung AI và nội dung do người dùng đăng; quy trình xử lý yêu cầu/xóa dữ liệu và sự cố.
4. Sau khi có kết luận về nghĩa vụ, lập backlog triển khai code riêng. Mỗi thay đổi phải gắn với yêu cầu pháp lý đã xác minh, người phụ trách, bằng chứng và bài kiểm tra.
5. Chỉ dùng nguồn chính thức (Công báo, Cơ sở dữ liệu quốc gia về văn bản pháp luật, Cổng văn bản Chính phủ/cơ quan ban hành) để chốt hiệu lực, nội dung, điều khoản chuyển tiếp và văn bản sửa đổi. Lưu ngày kiểm tra và bản/đường dẫn nguồn trong hồ sơ tuân thủ nội bộ.

## 2. Bối cảnh LovelyYellowCat đã quan sát được trong repo

Kiến trúc và tính năng trong mã nguồn hiện có cho thấy đây không chỉ là trang tĩnh: Astro SSR chạy trên Cloudflare Workers; Supabase Auth/Postgres/Realtime; Cloudinary lưu ảnh; đăng nhập Google; Google reCAPTCHA tại luồng gửi tranh; AI chat gửi nội dung tới Gemini/endpoint AI được cấu hình; thông báo email qua Gmail SMTP. Website có hồ sơ, bài viết, ảnh cộng đồng, bình luận, reaction, yêu thích/lưu bài, thông báo, điểm/huy hiệu, trang quản trị và telemetry Web Vitals.

Các điểm cần coi là **phát hiện sơ bộ cần kiểm tra lại trên môi trường production**:

- Đã thấy `/terms` và `/ai-security`; chưa thấy trang quyền riêng tư độc lập trong danh sách route được kiểm tra.
- Điều khoản hiện có một số tuyên bố rộng: mặc định đồng ý chỉ vì truy cập; không chuyển dữ liệu cho bên thứ ba; website phi thương mại nên không có nghĩa vụ đăng ký/thuế; “fair use” bao quát; cam kết gỡ trong 72 giờ; và lưu dữ liệu hội thoại AI “vĩnh viễn”. Cần rà soát từng câu theo luật và thực tế, không chỉ thay số hiệu văn bản.
- Tài liệu AI mô tả E2EE/zero-knowledge. Cần phân biệt mã hóa dữ liệu **khi lưu** với việc nội dung hội thoại được gửi tới nhà cung cấp mô hình để tạo câu trả lời; xác minh chính xác dữ liệu nào nhà cung cấp nhận, giữ lại và sử dụng.
- ADR telemetry ghi “opt-in upload”, trong khi bootstrap hiện cấu hình endpoint `/api/ui-telemetry`. Cần xác minh hành vi chạy thật, dữ liệu gửi đi, IP/log phía hạ tầng và mức độ tương ứng với thông báo “không PII”.
- Chưa xác nhận được quy trình tự phục vụ xóa tài khoản, xóa dữ liệu liên quan khỏi mọi dịch vụ/backup, cũng như thời hạn lưu giữ của từng loại dữ liệu.
- Không suy ra rằng dự án được miễn nghĩa vụ chỉ vì repo mô tả hoạt động phi lợi nhuận/không quảng cáo. Cần xác minh người vận hành, đối tượng người dùng, quy mô, doanh thu/tài trợ, các luồng giao dịch và phạm vi cung cấp dịch vụ thực tế.

## 3. Danh mục văn bản cần đưa vào sổ theo dõi

Đây là **danh sách sàng lọc ban đầu**, không phải kết luận áp dụng. Tra cứu từng văn bản chính thức, bản hợp nhất/sửa đổi và điều khoản chuyển tiếp trước khi quyết định.

| Nhóm | Văn bản cần xác minh | Vì sao liên quan / câu hỏi phải trả lời |
|---|---|---|
| Dữ liệu cá nhân | Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15; Nghị định 356/2025/NĐ-CP; Nghị định 330/2026/NĐ-CP về xử phạt | Đăng nhập Google, hồ sơ, nội dung, định danh, dữ liệu kỹ thuật, telemetry, AI và nhà cung cấp nước ngoài. Xác minh vai trò của người vận hành, căn cứ xử lý, nghĩa vụ thông báo/đồng ý, quyền của chủ thể, hồ sơ đánh giá và chuyển dữ liệu xuyên biên giới; không tự đặt thời hạn hay miễn trừ khi chưa đọc điều khoản chính thức. |
| Dữ liệu nói chung | Luật Dữ liệu 60/2024/QH15 và Nghị định 363/2026/NĐ-CP | Sàng lọc nghĩa vụ theo phạm vi dịch vụ và loại dữ liệu; tách biệt với Luật Bảo vệ dữ liệu cá nhân. Nghị định 363 có hiệu lực 11/11/2026 nên cần kiểm tra tình hình áp dụng sau ngày hiệu lực. |
| Trí tuệ nhân tạo | Luật Trí tuệ nhân tạo 134/2025/QH15; Nghị định 142/2026/NĐ-CP | Đánh giá vai trò của dự án đối với AI, phân loại/rủi ro, minh bạch với người dùng, nhãn nội dung AI khi thuộc trường hợp luật yêu cầu, quản trị dữ liệu và trách nhiệm với nhà cung cấp mô hình. Xác minh điều khoản chuyển tiếp dựa trên ngày cung cấp dịch vụ thực tế. |
| Thương mại điện tử | Luật Thương mại điện tử 122/2025/QH15; Nghị định 248/2026/NĐ-CP | Xác minh chức năng gallery/bài viết/người dùng có bị phân loại là nền tảng, dịch vụ trung gian hoặc hoạt động TMĐT hay không. Repo hiện nói không có thanh toán/thu phí; vẫn phải kiểm tra production và không đồng nhất “có UGC” với “chắc chắn là sàn TMĐT”. |
| An ninh mạng | Luật An ninh mạng 116/2025/QH15; Nghị định 333/2026/NĐ-CP | Luật và nghị định có thể đặt nghĩa vụ theo loại chủ thể/dịch vụ, quy mô hoặc yêu cầu cụ thể. Luật sư cần xác định phạm vi áp dụng, nghĩa vụ bảo vệ/ứng phó, dữ liệu và yêu cầu của cơ quan có thẩm quyền; không tự giả định dự án thuộc hoặc được miễn. |
| Internet, mạng xã hội và nội dung | Nghị định 147/2024/NĐ-CP cùng văn bản sửa đổi/thay thế nếu có; quy định hiện hành về bản quyền, gồm Luật Sở hữu trí tuệ và Nghị định 17/2023/NĐ-CP trong phạm vi còn hiệu lực | LovelyYellowCat cho phép gửi ảnh, bình luận và tương tác cộng đồng. Xác định việc phân loại dịch vụ, điều kiện/đăng ký/thông báo (nếu có), nội dung cấm, tiếp nhận khiếu nại, bảo quản bằng chứng, gỡ/khôi phục và kháng nghị. Kiểm tra lại mọi trích dẫn “safe harbor”, Điều 113 và thời hạn 72 giờ trong `/terms`. |
| Người tiêu dùng | Luật Bảo vệ quyền lợi người tiêu dùng 19/2023/QH15; Nghị định 55/2024/NĐ-CP và quy định mới liên quan | Xác định tư cách người dùng, tính chất dịch vụ, nghĩa vụ cung cấp thông tin/tiếp nhận phản ánh và phạm vi áp dụng kể cả khi không thu phí. |
| Quảng cáo | Luật Quảng cáo 75/2025/QH15; Nghị định 342/2025/NĐ-CP | Hiện chưa xác nhận có quảng cáo. Ghi nhận trạng thái thực tế; nếu có quảng cáo, tài trợ, affiliate, bài được tài trợ hoặc nội dung quảng bá về sau, mở nhánh rà soát riêng trước khi phát hành. |

**Cách dùng `vn-law-check`:** dùng checklist để không bỏ sót chủ đề và ghi nhận “evidence/unknown”; không chạy hoặc cài script vào repo sản phẩm trong giai đoạn lập kế hoạch, không chép nguyên kết luận/phạt tiền của công cụ. Snapshot tham khảo của repo cần được kiểm tra lại vì danh mục pháp lý có ngày rà soát riêng và văn bản có thể vừa có hiệu lực.

## 4. Lộ trình thực hiện theo giai đoạn

### Giai đoạn 0 — Chốt phạm vi và dữ kiện (trước mọi thay đổi chính sách)

**Việc cần làm**
- Xác định cá nhân/tổ chức đứng tên vận hành, địa chỉ/liên hệ, nơi đặt máy chủ/dịch vụ, người có quyền quyết định mục đích xử lý dữ liệu và người xử lý thay mặt.
- Lập bảng sự thật production: quốc gia người dùng, tuổi/nhóm tuổi dự kiến, ngày website bắt đầu cung cấp, lượng tài khoản/ngày truy cập, tính năng đang bật, quảng cáo/tài trợ/đóng góp, giao dịch, đăng ký hoặc hồ sơ đã nộp.
- Đối chiếu mã nguồn với Cloudflare, Supabase, Cloudinary, Google OAuth/reCAPTCHA, Gemini/Vertex/AI Gateway, Gmail SMTP và tài nguyên ngoài (ví dụ font/ảnh). Xác minh vùng dữ liệu, hợp đồng, điều khoản xử lý, log và thời hạn lưu của mỗi bên.
- Ghi rõ điều gì là đã kiểm chứng, điều gì là giả định và người cần trả lời. Không đưa dữ liệu người dùng thật/secret vào hồ sơ kế hoạch.

**Đầu ra:** hồ sơ phạm vi 1–2 trang và sơ đồ luồng dữ liệu; danh sách câu hỏi mở cho chủ dự án/luật sư/nhà cung cấp.

### Giai đoạn 1 — Lập ma trận áp dụng pháp luật có nguồn dẫn

- Với từng văn bản ở mục 3, ghi: số hiệu/tên; ngày ban hành, hiệu lực; văn bản sửa đổi/hướng dẫn; điều khoản liên quan; tiêu chí áp dụng; kết luận tạm thời; bằng chứng; người xác nhận; ngày rà soát tiếp theo.
- Dùng bốn trạng thái: **áp dụng đã xác nhận**, **có khả năng áp dụng—cần luật sư xác nhận**, **chỉ phát sinh nếu có điều kiện**, **không áp dụng—lưu lý do**.
- Đánh dấu riêng các mốc chuyển tiếp cho dịch vụ đã hoạt động trước ngày luật có hiệu lực; xác định ngày vận hành từ bằng chứng triển khai, không dùng ngày “EST.” hay ngày tạo repo.
- Luật sư Việt Nam rà soát các điểm có hệ quả đăng ký/giấy phép, xử phạt, chuyển dữ liệu xuyên biên giới, mạng xã hội/TMĐT, nội dung người dùng và thời hạn xử lý khiếu nại.

**Đầu ra:** sổ văn bản và ma trận yêu cầu–bằng chứng–owner. Không tiến hành thủ tục với cơ quan nhà nước chỉ dựa trên kết quả scanner.

### Giai đoạn 2 — Kiểm kê dữ liệu và nhà cung cấp

Tạo một dòng cho mỗi nhóm: tài khoản/định danh Google; email/ảnh đại diện; bio/banner/liên kết xã hội; ảnh, tiêu đề, mô tả tác phẩm; bình luận/reaction; favorites/bookmarks/notifications/XP; báo cáo và audit log quản trị; phiên/tin nhắn AI và khóa BYOK đã mã hóa; telemetry; cookie/phiên đăng nhập; dữ liệu chống bot; log hạ tầng.

Với mỗi dòng, ghi mục đích, dữ liệu tối thiểu, nguồn thu, căn cứ xử lý cần xác nhận, ai xem được, hệ thống lưu, bên nhận, vị trí xử lý, thời hạn, cách xóa/sửa/xuất, backup và ngoại lệ lưu giữ. Xác minh thực tế dữ liệu truyền qua OAuth, CAPTCHA, AI, email, CDN và công cụ analytics/log; không coi “không bán dữ liệu” là thay thế cho thông báo chia sẻ với nhà cung cấp xử lý.

**Đầu ra:** data inventory, bản đồ luồng dữ liệu và bảng xử lý xuyên biên giới; hồ sơ/đánh giá hoặc thủ tục chỉ được lập khi nghĩa vụ và phạm vi đã được xác minh chính thức.

### Giai đoạn 3 — Sửa thông báo, điều khoản và lựa chọn người dùng

- Soạn chính sách quyền riêng tư độc lập bằng tiếng Việt, dễ tìm, có ngày hiệu lực/lịch sử cập nhật: ai vận hành; dữ liệu nào; mục đích; căn cứ; bên nhận; chuyển ra nước ngoài; thời hạn; quyền/yêu cầu; kênh liên hệ; xử lý trẻ em; bảo mật/sự cố; thay đổi chính sách.
- Đặt thông báo ngắn đúng ngữ cảnh tại đăng nhập, gửi tranh, bình luận/hồ sơ nếu cần, và trước khi gửi nội dung tới AI. Tách chức năng thiết yếu khỏi xử lý tùy chọn; chỉ xin consent theo cơ chế và hình thức mà luật sư xác nhận. Không coi tiếp tục truy cập hoặc im lặng là sự đồng ý chung cho mọi mục đích.
- Viết lại `/terms` để phân biệt: nội dung do LovelyYellowCat biên tập, UGC, quyền sử dụng tối thiểu để hiển thị/phân phối, trách nhiệm khiếu nại, giới hạn dịch vụ và kênh xử lý. Loại bỏ khẳng định miễn trừ, miễn thuế/đăng ký, “fair use” bao quát hoặc SLA pháp lý nếu chưa có căn cứ đã rà soát.
- Đối chiếu `/ai-security` và `/ai` với luồng AI thật: mã hóa khi lưu, ai có thể truy cập, nội dung gửi tới Gemini/nhà cung cấp khác, dữ liệu lưu/log, lựa chọn model/key và cách xóa. Không tuyên bố “admin không thể đọc”, “không dùng để huấn luyện” hoặc “zero-knowledge” vượt quá bằng chứng kỹ thuật/hợp đồng.
- Tạo quy trình xử lý yêu cầu chủ thể dữ liệu: nhận yêu cầu, xác minh danh tính tương xứng, định tuyến, thời hạn pháp lý đã xác nhận, phản hồi, lưu bằng chứng tối thiểu và khiếu nại. Không ghi cứng thời hạn trước khi kiểm tra luật.

**Đầu ra:** bộ chính sách thống nhất với sản phẩm, bảng câu chữ cũ→mới có căn cứ và quy trình nội bộ.

### Giai đoạn 4 — Quyền dữ liệu, lưu giữ và xóa

- Định nghĩa thời hạn riêng theo loại dữ liệu: tài khoản không hoạt động, nội dung công khai, bình luận, telemetry, audit/security logs, email, AI sessions, soft-delete/thùng rác và backup. Thời hạn phải cân bằng nghĩa vụ pháp lý, an toàn, mục đích và khả năng vận hành; không mặc định “vĩnh viễn”.
- Vẽ luồng xóa theo tài khoản và theo từng tính năng: Supabase, Cloudinary, cache/CDN, AI provider, email, logs/backups; ghi rõ phần không thể xóa ngay và căn cứ giữ lại nếu có.
- Kiểm tra RLS, trigger, soft-delete 30 ngày, cascade, sao lưu/khôi phục và danh tính admin; lập thiết kế xóa tài khoản hoặc quy trình yêu cầu xóa khả thi, không để xóa hồ sơ nhưng sót ảnh, bình luận, log hoặc dữ liệu bên thứ ba.
- Xác minh quyền xuất/sửa/xóa được nêu trong điều khoản hiện có thực sự hoạt động và người dùng có hướng dẫn sử dụng được.

**Đầu ra:** retention schedule, ma trận xóa/xuất, quy trình lưu giữ ngoại lệ và bộ ca kiểm thử chấp nhận.

### Giai đoạn 5 — AI, nội dung tổng hợp và quản trị rủi ro

- Xác định vai trò của LovelyYellowCat trong cung cấp/tích hợp AI; lập danh sách model, mục đích, đầu vào/đầu ra, người dùng, nhà cung cấp, loại dữ liệu nhạy cảm có thể nhập và nơi xử lý.
- Đánh giá minh bạch: người dùng có nhận biết đang nói chuyện với AI không; cảnh báo AI có thể sai; giới hạn tư vấn; cách báo cáo nội dung; người chịu trách nhiệm xử lý. Xác định riêng nội dung ảnh/video AI do người dùng đăng và trường hợp cần nhãn/provenance theo văn bản chính thức.
- Đánh giá prompt injection, lộ secret, dữ liệu cá nhân trong prompt, log/telemetry prompt, retention của nhà cung cấp và cấu hình BYOK. Không gửi hội thoại vào telemetry lỗi hoặc log không cần thiết.
- Lập quy tắc xử lý deepfake/nội dung gây nhầm lẫn, nội dung nguy hại và escalation; chỉ gắn nhãn hoặc chặn theo yêu cầu đã xác minh và tiêu chuẩn cộng đồng công bố.

**Đầu ra:** AI system card nội bộ, thông báo AI, đánh giá rủi ro, quy trình báo cáo/escalation và bằng chứng cấu hình nhà cung cấp.

### Giai đoạn 6 — UGC, quyền tác giả và quản trị cộng đồng

- Luật sư xác định phân loại chức năng gallery, profile, comments và submissions theo quy định Internet/mạng xã hội, TMĐT và IP; ghi rõ các tính năng/điều kiện làm kết luận thay đổi.
- Thiết kế form báo cáo cho chủ thể quyền/nội dung; yêu cầu thông tin tối thiểu, xác nhận tiếp nhận, bảo toàn URL/timestamp/hash/bản ghi kiểm duyệt, quyết định gỡ/hạn chế/khôi phục, thông báo các bên và cơ chế phản hồi/kháng nghị.
- Thay câu “người dùng chịu toàn bộ trách nhiệm nên website miễn trừ” bằng quy trình và điều khoản cụ thể đã được luật sư duyệt. Lập SLA nội bộ theo từng loại khiếu nại; chỉ công bố deadline là deadline luật định khi nguồn chính thức xác nhận.
- Làm rõ giấy phép UGC người dùng cấp cho website: phạm vi hiển thị, resize/cache, thời hạn, attribution, rút nội dung; không nhận quyền rộng hơn cần thiết. Xác định quyền với hình ảnh trên trang, hình minh họa, font, nhạc/video, game và tài nguyên bên thứ ba.

**Đầu ra:** policy nội dung, quy trình notice–review–appeal, mẫu phản hồi và nhật ký bằng chứng không chứa dữ liệu thừa.

### Giai đoạn 7 — An ninh, ứng phó sự cố và nghĩa vụ có điều kiện

- Đánh giá quyền truy cập admin/editor, RLS/trigger, secrets, OAuth, rate limit, log, backup, khôi phục, phụ thuộc nhà cung cấp và kênh hỗ trợ; lập danh sách kiểm tra định kỳ.
- Soạn runbook sự cố: phát hiện/triage, cô lập, bảo toàn log, đánh giá dữ liệu và người bị ảnh hưởng, liên hệ nhà cung cấp, thông báo người dùng/cơ quan khi luật yêu cầu, khắc phục và hậu kiểm. Thời hạn thông báo phải lấy từ văn bản chính thức áp dụng, không sao chép từ checklist chung.
- Lập hai nhánh “nếu có”: (a) bán hàng, thanh toán, quyên góp, membership, affiliate hoặc quảng cáo; (b) dịch vụ/nền tảng đạt tiêu chí TMĐT, mạng xã hội hay dịch vụ chịu điều kiện. Khi có một thay đổi sản phẩm thuộc nhánh, dừng phát hành tính năng đó cho tới khi đánh giá bổ sung hoàn tất.

**Đầu ra:** threat/risk register, incident runbook, hồ sơ nhà cung cấp và checklist trước phát hành.

### Giai đoạn 8 — Triển khai kỹ thuật sau khi kế hoạch được duyệt

Đây là giai đoạn code **ở lần thực hiện sau**, chưa làm trong tài liệu này. Các điểm dự kiến cần xác minh/chạm tới:

- Chính sách và điều hướng: `src/pages/terms.astro`, `src/pages/ai-security.astro`, `src/pages/ai.astro`, tạo route quyền riêng tư mới, `src/layouts/BaseLayout.astro` và component footer/navigation thực tế.
- Luồng quyền dữ liệu: `src/components/ProfileEditor.tsx`, `src/components/AiChatStation.tsx`, các API xác thực/hồ sơ/AI, và các route API liên quan đến submissions/comments/favorites/bookmarks.
- Telemetry: `src/ui/services/telemetry.ts`, `src/ui/shell/telemetryBootstrap.ts`, `src/pages/api/ui-telemetry.ts`, `docs/adr/ADR-0004-ui-telemetry.md`, `supabase_sql/ui_telemetry.sql`.
- Lược đồ/migration Supabase: xác định trước migration nào thực sự là nguồn chuẩn đang triển khai; không chạy các file `*_latest.sql`/rebuild/historical trực tiếp nếu chưa đối chiếu môi trường production và kế hoạch rollback.
- Hồ sơ vận hành: bổ sung quy trình vào `docs/runbooks/`, cập nhật README/CHANGELOG nếu thông tin công khai thay đổi; không lưu secret, bản xuất dữ liệu cá nhân hay hồ sơ khiếu nại có định danh trong repo.

## 5. Thứ tự ưu tiên đề xuất

| Mức | Việc | Lý do |
|---|---|---|
| P0 — trước khi công bố tuyên bố mới | Chốt sự thật production; xác minh dữ liệu/nhà cung cấp; luật sư rà soát phạm vi | Không thể viết chính sách đúng nếu chưa biết website đang làm gì và dữ liệu đi đâu. |
| P1 — ưu tiên cao | Sửa tuyên bố sai lệch ở `/terms` và `/ai-security`; chính sách quyền riêng tư; kiểm tra telemetry và AI upstream; quy trình yêu cầu dữ liệu/sự cố | Đây là nơi hiện có khả năng chênh lệch giữa lời hứa và hành vi thật. |
| P2 — tiếp theo | Retention/xóa/export; nhà cung cấp/chuyển dữ liệu; moderation/IP; role/access/incident runbook | Giảm rủi ro vận hành và đảm bảo yêu cầu người dùng thực hiện được. |
| P3 — theo điều kiện | TMĐT, quảng cáo, người tiêu dùng, đăng ký/giấy phép mạng xã hội hoặc nghĩa vụ phân loại AI | Chỉ triển khai sau khi tiêu chí áp dụng được xác nhận; thiết kế cổng đánh giá trước khi thêm tính năng thương mại. |

## 6. Kiểm chứng hoàn tất (khi triển khai ở giai đoạn sau)

- Mọi kết luận pháp lý có văn bản chính thức, điều khoản, ngày truy cập và người rà soát; các mục chưa rõ được đánh dấu, không biến thành cam kết công khai.
- Mỗi loại dữ liệu trong production có mục đích, căn cứ đã xác nhận, nơi lưu/nhận, thời hạn và cách xử lý quyền; mọi vendor đều có luồng dữ liệu được kiểm tra.
- Không còn mâu thuẫn giữa UI, `/terms`, chính sách quyền riêng tư, `/ai-security`, ADR telemetry, cấu hình runtime và hành vi API.
- Kiểm thử thực tế các yêu cầu xem/sửa/xuất/xóa, xóa AI history/account, gỡ nội dung, kháng nghị và xử lý sự cố; kiểm tra dữ liệu ở Supabase, Cloudinary và các bên liên quan theo phạm vi cho phép.
- Kiểm tra quyền truy cập/RLS và không lộ nội dung riêng tư, prompt, secret hoặc dữ liệu chủ thể vào telemetry/log công khai.
- Chạy các gate sẵn có của repo sau thay đổi phù hợp: `npm test`, `npm run typecheck`, `npm run lint`, `npm run stylelint`, `npm run build`, `npm run policy:ui`, `npm run budget:ui`, `npm run format:check`; bổ sung test cho quyền dữ liệu, telemetry, AI disclosure và moderation trước khi chấp nhận.
- Luật sư/đầu mối tuân thủ duyệt nội dung chính sách cuối cùng; chủ dự án duyệt các quyết định sản phẩm/retention/vendor; ghi quyết định và ngày xem xét lại.

## 7. Câu hỏi phải trả lời trước khi chốt nghĩa vụ

1. Ai là cá nhân/tổ chức đứng tên vận hành và chịu trách nhiệm liên hệ? Website hướng tới người dùng tại Việt Nam, quốc tế hay cả hai?
2. Site đang production từ ngày nào; có bao nhiêu người dùng; có người dưới 18 tuổi dự kiến sử dụng không?
3. Có donation, sponsor, quảng cáo, affiliate, membership, bán hàng, thanh toán hoặc lợi ích trao đổi nào đang bật ngoài README không?
4. Các vùng lưu trữ, hợp đồng xử lý và retention hiện tại của Cloudflare/Supabase/Cloudinary/Google/Gemini/Gmail là gì? Có lưu hoặc dùng nội dung để cải thiện/huấn luyện dịch vụ không?
5. Người dùng có thể xóa tài khoản và toàn bộ dữ liệu của mình ngay hôm nay không; dữ liệu nào còn trong backup, log, cache hoặc email?
6. Quy trình tiếp nhận khiếu nại bản quyền/nội dung hiện ai trực, ở đâu, cách xác minh, thời gian phản hồi và cách lưu bằng chứng?

## 8. Giới hạn của lần làm này

Lần này chỉ khảo sát repo, nguồn tham khảo và tạo kế hoạch. Chưa kiểm tra hợp đồng nhà cung cấp/private dashboard/production database, chưa chạy scanner, chưa thay đổi code/chính sách, chưa xác nhận pháp lý cho tư cách người vận hành và chưa gửi hồ sơ cho cơ quan nhà nước. Cần hoàn tất các dữ kiện và rà soát chuyên môn trước khi triển khai nghĩa vụ hoặc công bố cam kết mới.
