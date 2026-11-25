# Kế hoạch tạo USB FreeDOS chạy Ghost cho Samsung RV409

**Ngày:** 08/11/2026  
**Mục tiêu:** Tạo lại Kingston DataTraveler 3.0 61.9 GB thành USB khởi động Legacy/BIOS bằng FreeDOS, phù hợp máy Samsung RV409 yếu; người dùng tự chép `GHOST.EXE` và `ghost-win-XP.GHO` sau.

## Hiện trạng đã kiểm tra
- Đúng thiết bị: Kingston DataTraveler 3.0, Disk 1, MBR, một phân vùng NTFS, ký tự E:, 61.9 GB.
- USB hiện có Hiren’s BootCD PE x64 và `GHOST\ghost-win-XP.GHO` (~2.02 GB). Người dùng xác nhận đã sao lưu file GHO ở ổ D và cho phép xóa USB.
- Không tìm thấy `GHOST.EXE`; do đó USB DOS chỉ cung cấp môi trường boot, cần người dùng tự bổ sung chương trình Ghost tương thích.
- Samsung RV409 là máy đời Legacy BIOS; FreeDOS chính thức yêu cầu BIOS/UEFI Legacy và có gói FullUSB dành cho phần cứng thật.

## Các bước
1. Tải ảnh FreeDOS 1.4 FullUSB từ trang chính thức; kiểm tra file tải xuống và kích thước/hash nếu có.
2. Ghi ảnh lên đúng Kingston Disk 1 bằng công cụ ghi ảnh an toàn, xác thực lại model/dung lượng ngay trước khi ghi. Thao tác xóa toàn bộ đã được người dùng đồng ý.
3. Không tự tải hoặc phân phối Ghost.EXE (phần mềm độc quyền); để người dùng thêm `GHOST.EXE` và file `.GHO` sau khi tạo xong.
4. Kiểm tra lại phân vùng/boot files trên Windows, dung lượng khả dụng và khả năng hiển thị phân vùng.
5. Hướng dẫn thử trên RV409: bật Legacy boot, thử USB qua menu boot BIOS, rồi kiểm tra FreeDOS prompt. Việc boot trên laptop vật lý cần người dùng trực tiếp thử.

## Tiêu chí hoàn tất
- USB đã ghi thành công lên đúng Kingston; có phân vùng boot FreeDOS và đọc được trên Windows.
- Ghi rõ giới hạn: chưa chạy Ghost restore nếu chưa có `GHOST.EXE`; file GHO được người dùng tự chép.
- Không tuyên bố boot thật trên RV409 đã được xác minh nếu chưa thử máy đó.

## Rủi ro
- Ghi ảnh sẽ xóa nội dung USB; dữ liệu đã được người dùng xác nhận có bản sao lưu.
- Một số BIOS cũ không khởi động được phương thức USB hiện đại; cần thử chế độ Legacy/USB boot trong BIOS.
- Tương thích Ghost phụ thuộc phiên bản executable, kích thước ảnh và filesystem; FreeDOS không thay thế Ghost.
