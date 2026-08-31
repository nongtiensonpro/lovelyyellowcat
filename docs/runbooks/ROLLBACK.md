# RUNBOOK — Rollback giao diện v5

## Khi nào rollback?
Island crash lan rộng mà ErrorBoundary không giữ được, WM/CommandPalette phá UX nghiêm trọng,
telemetry/report lỗi hàng loạt, hoặc bất kỳ regression nào không fix nóng được trong 30 phút.

## Cách 1 — Revert commit (an toàn, khuyến nghị)
```bash
git log --oneline -10                      # tìm commit phase lỗi
git revert <commit> -m 1                   # tạo commit đảo ngược
git push origin main                       # CI deploy lại tự động
```
Lưu ý: revert tuần tự theo phase ngược (9 → 0). Phase 0-3 là nền — revert cả khối nếu lỗi nằm sâu kernel.

## Cách 2 — Deploy lại version cũ qua Wrangler (khẩn, không đụng git)
```bash
npx wrangler rollback lovelyyellowcat      # quay lại deployment trước đó ngay lập tức
# hoặc chọn version:
npx wrangler deployments list --name lovelyyellowcat
npx wrangler versions deploy --name lovelyyellowcat
```
Xem thêm: wrangler versions rollback (Cloudflare Workers — tức thời, không build).

## Cách 3 — Feature-level (không rollback cả trang)
Các tính năng v5 đều tách module — có thể tắt chọn lọc:
- CRT/FX: user tự đổi qua UI mode (CATALOG/ACCESS) — `preferenceStore` độc lập.
- CommandPalette/WM: gỡ `<WMHost />` + `<script import keyboardManager>` trong `src/ui/shell/AppShell.astro`.
- Telemetry: bỏ `<script import telemetryBootstrap>` trong AppShell (endpoint trả 204 silent nếu bảng chưa migrate).
- ErrorBoundary: gỡ wrap trong `AiChatStation.tsx`/`GalleryGrid.tsx` (export trực tiếp Inner).
- Token @theme: revert `scripts/build-tokens.mjs` + khôi phục khối `@theme` thủ công trong `global.css`.

## Sau rollback
1. Ghi waiver vào `docs/runbooks/WAIVERS.md` (lỗi, thời gian, owner, hạn fix).
2. Chạy full gates trên bản rollback để xác nhận xanh.
3. Nhân bản lỗi bằng `/dev/kernel` demo + tests trước khi deploy lại.
