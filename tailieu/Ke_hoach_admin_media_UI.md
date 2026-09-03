# Kế hoạch: Admin Thư viện Ảnh — quick-filter + sửa nút đè (MEDIA.UI v2)

> Trạng thái: HOÀN THÀNH (M1→M4) — 7 gates xanh

## 1. Chẩn đoán
- Filter "Mồ côi/Đang dùng" ĐÃ CÓ nhưng ẩn trong form lọc (select f-usage) → không nổi bật.
- Nút đè thật (bug layout):
  a) Card: checkbox + nút ℹ️ absolute đè lên ảnh (mt-5=20px < 28px cần); badge usage absolute đè đáy ảnh.
  b) Modal chi tiết: 4 nút copy text dài grid-cols-2 → mobile tràn chữ; dialog không có max-height → tràn màn hình nhỏ.

## 2. Giải pháp
- M1 Quick-filter chips đầu trang: 🌐 TẤT CẢ / 🟢 ĐANG DÙNG / 🔴 MỒ CÔI — link giữ nguyên bộ lọc khác (q/folder/minkb/from/sort/size), active state theo usageFilter hiện tại.
- M2 Card không đè: header row riêng (checkbox trái + ℹ️ phải, in-flow), ảnh bên dưới bỏ mt-5; badge usage chuyển vào footer cạnh tên thư mục.
- M3 Modal: grid-cols-1 sm:grid-cols-2 + nhãn ngắn + dialog max-h-[90vh] overflow-y-auto.
- M4 Gates + CHANGELOG + tick plan.
