# Kế hoạch sửa deep-link Community Gallery

## Bối cảnh

Khi người dùng click một card trong `/gallery`, URL có thể chuyển thành
`/gallery?view=<submission-id>` nhưng giao diện phải mở lightbox tương ứng với
ID đó. SSR deep-link trực tiếp đã được kiểm tra: submission
`4411e057-d039-4acb-82b4-3c6cd03733fa` là `[VAPOR_EXPEDITION] :: Cyber_Pyramid_Oasis.raw`
và mở đúng khi tải trực tiếp. Vì vậy phạm vi điều tra tập trung vào luồng
click/hydration/state của island `GalleryGrid`.

## Phạm vi kiểm tra

1. Đọc đầy đủ `GalleryGrid`, `GalleryLightbox`, module navigation, route gallery
   và các test liên quan; truy nguyên từ handler của card tới state và render.
2. Tái hiện bằng browser production/headless với hai luồng: tải trực tiếp URL
   query và click card từ grid; ghi nhận URL, title, counter, overlay và console.
3. Tạo regression test nhỏ, có thể đỏ khi `?view=` được cập nhật nhưng
   lightbox không mở hoặc mở sai submission.
4. Sửa đúng nguyên nhân gốc với thay đổi tối thiểu; không thay đổi API/dữ liệu
   ngoài phạm vi gallery.
5. Chạy test regression, test suite, lint, typecheck, build; kiểm tra diff/status
   và bảo đảm file CI ổn định không bị sửa.

## Tiêu chí hoàn thành

- Click từng card cập nhật URL và mở đúng artwork/counter.
- Tải trực tiếp `/gallery?view=<id>` vẫn mở đúng artwork.
- URL không hợp lệ vẫn giữ fallback hiện hành, không crash.
- Regression test bắt được lỗi trước sửa và pass sau sửa.
- Các verification gates của dự án pass; kế hoạch này được cập nhật kết luận
  và kết quả thực tế sau khi hoàn tất.

## Kết quả điều tra ban đầu

- Browser headless production đã tái hiện được click card 1 và card 2: cả URL,
  lightbox và counter đều đúng trong profile sạch.
- Chưa được phép kết luận lỗi đã biến mất đối với profile/browser người dùng;
  cần tiếp tục kiểm tra lifecycle khi island đã mount, navigation/back-forward,
  và bất kỳ cơ chế cập nhật URL nào không remount component.
- Không patch mã production trước khi có regression test đỏ hoặc bằng chứng
  runtime cô lập được nguyên nhân.

## Bằng chứng bàn giao bổ sung

Báo cáo kiểm thử Chromium ngày 01/09/2026 cho thấy đường click qua mapping tương tác
có thể kích hoạt `FavoriteButton` lồng trong card (`favorite 0 → 1`), trong khi
`img.click()` và deep-link trực tiếp đều mở đúng viewer. Vì vậy nguyên nhân được
xác định là cấu trúc interactive lồng nhau/hitbox, không phải parser query hay
logic resolve `activeId`.

## Thay đổi đã thực hiện

- Card masonry mặc định dùng một thẻ `<a>` có `href="?view=<id>"`, accessible name
  rõ ràng và vẫn intercept click trái để mở lightbox bằng SPA `pushState`.
- Nút favorite được đưa ra làm sibling overlay của link, loại bỏ nested interactive
  control và giữ nguyên hành vi favorite riêng.
- Click có modifier (Ctrl/Cmd/Shift/Alt) không bị chặn, nên vẫn mở link theo hành vi
  trình duyệt chuẩn.
- Thêm regression test cho anchor/card, viewer, URL và xác nhận favorite không nằm
  trong interactive card.

## Verification cuối

- Regression gallery: 2 file / 3 test pass; full suite: **28 test files / 243 tests pass**.
- `npm run lint`: pass, ESLint debt `0 / 0`.
- `npm run typecheck`: pass.
- `npm run stylelint`: pass.
- `npm run policy:ui`: pass, `136 / 142`.
- `npm run budget:ui`: pass.
- `npm run build`: pass, Astro Cloudflare server build hoàn tất.
- Prettier check các file mới: pass.
- Browser local build với Chrome mobile pointer: center image hit vào `IMG`, click thật mở dialog và cập nhật URL `?view=4411e057-d039-4acb-82b4-3c6cd03733fa`; console không có exception.
- `deploy.yml` không bị thay đổi; probe tạm và state Wrangler đã được dọn.
