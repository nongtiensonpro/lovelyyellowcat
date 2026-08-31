# ADR-0001: Design Token Pipeline là nguồn chân lý duy nhất cho màu/kích thước

- **Trạng thái:** Accepted (2026-08-22)
- **Ngữ cảnh:** Baseline đo được 873 hex literal và 1.603 arbitrary value trong `src/`. README tuyên bố "cấm hex trong component" nhưng không có cơ chế cưỡng chế; 15/67 primitive CSS không được dùng.
- **Quyết định:**
  1. Token khai báo trong `src/ui/tokens/primitives.json` (giá trị thô) và `src/ui/tokens/semantic.json` (role theo theme/mode).
  2. `scripts/build-tokens.mjs` validate (tên, contrast AA) và sinh `src/styles/tokens.css` + `src/ui/tokens/tokens.gen.ts`.
  3. File gen được commit để build không phụ thuộc bước sinh riêng; CI chạy `build-tokens --check` để phát hiện lệch.
  4. Ngoại lệ migration khai báo trong `src/ui/tokens/token-allowlist.json` (file + owner + hạn), `check-ui-policy` fail khi hex/arbitrary nằm ngoài allowlist.
- **Hệ quả:** component không viết hex/arbitrary mới; refactor màu là sửa token; contrast được kiểm chứng tự động; thêm 1 bước sinh token vào prebuild.
