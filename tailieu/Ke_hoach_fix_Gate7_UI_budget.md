# Kế hoạch sửa Gate 7 — UI budget ratchet

> **Trạng thái:** Hoàn tất — Gate 7 đã PASS local sau khi ratchet CSS có chủ đích lên 192000 byte.
>
> **Mục tiêu:** Đưa `npm run budget:ui` về trạng thái PASS để GitHub Actions không dừng bước deploy Cloudflare, đồng thời không làm mất ý nghĩa của budget ratchet.

## 1. Chẩn đoán đã xác nhận

Lệnh tái hiện lỗi:

```bash
npm run build
npm run budget:ui
```

Kết quả hiện tại:

```text
✓ js_total_bytes: 658172 / 660000
✓ js_largest_chunk_bytes: 208309 / 210000
✗ css_total_bytes: 191380 / 191000
✓ hydration client:load: 0 / 4
✓ hydration client:idle: 1 / 6
✓ hydration client:visible: 14 / 16
✓ test_files: 34 / >= 20
BUDGET FAIL: css_total_bytes
```

Nguyên nhân không phải hydration hay JS: bundle JS vẫn dưới giới hạn. CSS tăng trên ngân sách cũ 380 byte do thêm layout mobile, safe-area, touch-action, D-pad, nút pause/restart và accessibility cho hai game.

## 2. Quyết định

Đây là tăng CSS có chủ đích từ tính năng mobile, không phải bundle bị phình do thư viện mới hay hydration regression. Vì vậy sẽ **ratchet ngân sách CSS lên 192000 byte**, thay vì nới toàn bộ gate hoặc xoá kiểm soát budget.

- `artifacts/ui-budgets.json`: `css_total_bytes: 191000` → `192000`.
- Giữ nguyên `js_total_bytes`, `js_largest_chunk_bytes` và hydration budgets.
- Ghi rõ lý do trong comment của JSON và `CHANGELOG.md`.
- Không sửa `scripts/check-budgets.mjs` để bypass budget.
- Không thay đổi `deploy.yml`; Gate 7 phải tiếp tục chạy sau build và trước deploy.

## 3. Các bước thực hiện

1. Kiểm tra lại số CSS thực tế từ `build/client/_astro/*.css`.
2. Cập nhật budget CSS có chú thích giải thích mobile touch UI.
3. Cập nhật changelog với nguyên nhân và số byte mới.
4. Chạy lại:
   - `npm run build`
   - `npm run budget:ui`
   - `npm run policy:ui`
   - `npm run typecheck`
   - `npm run lint`
   - `npm run stylelint`
   - targeted/full tests và ghi nhận riêng lỗi baseline nếu có.
5. Kiểm tra workflow deploy vẫn có đúng thứ tự `build → policy:ui → budget:ui → deploy`.

## 4. Tiêu chí nghiệm thu

- `npm run budget:ui` exit 0.
- CSS actual nằm dưới hoặc bằng ceiling mới.
- JS/hydration không bị nới.
- Không có `continue-on-error` hoặc bypass cho Gate 7.
- Build và các quality gate liên quan vẫn xanh.
- Diff chỉ chứa thay đổi cần thiết cho budget/changelog; không đụng các file dữ liệu không liên quan trong `tailieu`.

## 5. Nếu sau khi ratchet vẫn fail

Dừng deploy và điều tra tiếp theo thứ tự:

1. So sánh danh sách file CSS build trước/sau.
2. Kiểm tra CSS có bị duplicate/emit lặp do selector hoặc Astro import hay không.
3. Tối ưu CSS thay vì tăng ceiling thêm.
4. Chỉ tăng ceiling tiếp khi có bằng chứng rằng phần tăng là chủ đích và ghi lý do cụ thể.

Không dùng giải pháp “comment budget”, bỏ `budget:ui`, hoặc chuyển Gate 7 thành warning.
