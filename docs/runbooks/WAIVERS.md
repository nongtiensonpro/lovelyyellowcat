# WAIVERS — v5

Waiver = lỗi/biệt lệ CHẤP NHẬN có chủ đích. Mỗi mục: mô tả, lý do, owner, hạn review.

| # | Mục | Lý do chấp nhận | Owner | Hạn review |
|---|-----|-----------------|-------|-----------|
| W-1 | Console warning `Permissions-Policy: attribution-reporting` từ reCAPTCHA/Cloudflare iframe | Không phải codebase (git grep trống); vô hại | user | khi đổi Captcha |
| W-2 | Detail page không-tồn-tai redirect (200) thay vì 404 thật | UX pattern cố ý — redirect về list + error param | user | Phase SEO sau |
| W-3 | Bundle JS 650KB (supabaseBrowser 203KB + client 176KB chiếm 60%) | Đã tách chunk, lazy islands; cắt thêm phải đụng supabase-js | user | v5.1 |
| W-4 | Hex cũ còn ~142 chỗ trong markup | Ratchet policy chặn tăng; migrate dần theo từng component | user | v5.1 |
| W-5 | Fonts Google Fonts qua AppShell (chưa self-host woff2) | Không có woff2 local trong public/; self-host = phase riêng | user | v5.1 |
| W-6 | Đếm test files ≥ 20 (không đếm số test case trong budget gate) | Đếm case cần chạy vitest — tốn hơn; file count đủ chặn xóa test | user | v5.1 |
| W-7 | `.gitignore` từng chứa `artifacts/` → CI thiếu budgets file (deploy fail 2026-08-31) | Đã fix: bỏ ignore, budgets/policy files vào repo; guard message rõ trong check-budgets.mjs | user | resolved |
| W-8 | 472 ESLint warnings (no-unused-vars, jsx-a11y legacy markup, no-var...) hạ từ error → warn | Nợ tồn dư từ trước v5; dọn dần từng nhóm ở v5.1; các rule bảo vệ runtime (rules-of-hooks, alert/confirm, exhaustive-deps) vẫn ERROR — WindowFrame đã fix 10 hooks vi phạm | user | v5.1 |

## Rollback đã diễn tập
- Cách 2 (wrangler rollback) là đường khẩn TỨC THỜI — đã ghi lệnh trong ROLLBACK.md.
- Cách 1 (git revert) là đường sạch — CI tự deploy lại sau revert.
