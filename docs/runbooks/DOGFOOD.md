# DOGFOOD CHECKLIST — v5 launch

Chạy THỦ CÔNG trên https://lovelyyellowcat.nongtiensonpro.workers.dev sau mỗi lần deploy phase mới.
Tick ✔ + ngày. Phát hiện lỗi → dán log vào chat, fix trước khi tiếp tục.

## Guest (chưa đăng nhập)
- [ ] Trang chủ render, hero video KHÔNG tự chạy trên mobile/reduced-motion/save-data
- [ ] Ctrl+K mở Command Palette; gõ "gallery" → Enter điều hướng đúng
- [ ] /gallery: grid hiện, lọc/sort không lỗi; click 1 ảnh → lightbox zoom/pan/rotate hoạt động
- [ ] /articles/<slug>: WordPad zoom 70–150%, progress bar chạy khi cuộn, comment depth ≤ 3
- [ ] /about /artists /submit /terms render đủ, không console error
- [ ] /admin khi chưa login → ACCESS DENIED (middleware chặn)
- [ ] /slug-không-tồn-tai → redirect trang chủ (behavior thiết kế), /abc-xyz → 404

## Auth (đăng nhập thường)
- [ ] Sign in Supabase OK; avatar/menu cập nhật
- [ ] Favorite + Bookmark toggle lưu; ReactionBar chọn cảm xúc → aria-live không crash
- [ ] Comment realtime (2 tab) debounce không spam
- [ ] /profile/edit lưu avatar/username
- [ ] Submit wizard 3 bước upload Cloudinary

## AI
- [ ] /ai: chọn persona, gửi tin nhắn → stream chữ dần; dừng giữa dòng không kẹt
- [ ] Tin nhắn user hiện rõ trong bubble gradient tím-hồng (fix @theme)
- [ ] Markdown bold/code hiển thị; nội dung <script> bị escape (không chạy)
- [ ] BYOK: key tự do không lộ trong localStorage/network

## Admin
- [ ] /admin dashboard 10 module
- [ ] comments/users/articles: pagination + search + sort; nút XÓA → dialog Win95 (không confirm() native)
- [ ] Bulk actions chọn nhiều → xóa/duyệt hàng loạt OK
- [ ] Trash → restore OK

## Kỹ thuật (mỗi lần deploy)
- [ ] Tab System: /admin → chạy SQL `ui_events` nếu chưa (supabase_sql/ui_telemetry.sql)
- [ ] Network: không request nào 4xx/5xx ngoài lỗi cố ý (401 khi chưa login, 429 rate-limit)
- [ ] Telemetry: sau 1 lượt duyệt, SELECT * FROM ui_events có rows (nếu đã migrate)
- [ ] Console: 0 error đỏ; 1 warning attribution-reporting của bên thứ 3 = chấp nhận
- [ ] /dev/kernel: mọi demo section render; nút NÉM LỖI → BSOD-mini → THỬ LẠI sống lại
