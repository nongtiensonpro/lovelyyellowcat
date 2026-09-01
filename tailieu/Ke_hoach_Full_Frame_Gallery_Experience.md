# Kế hoạch Full Frame Gallery Experience (v5.4)

## Mục tiêu

Nâng cấp GalleryLightbox thành trải nghiệm "tràn viền toàn khung" (full-frame
immersive) + bộ tính năng sáng tạo, dựa trên nền tảng v5.3 vừa dựng lại.
Nguyên tắc: không phá kiến trúc URL/single-source-of-truth đã ổn định; mọi
tính năng mới phải qua regression test + smoke runtime.

## Tính năng

### A. Full Frame (yêu cầu chính)

- **Zen/Full-frame mode**: ảnh chiếm trọn viewport (100dvh, không panel),
  UI tự ẩn; đưa chuột/phạm vi tương tác về góc → UI hiện lại (auto-hide).
  Phím `Z` toggle. Khác fullscreen API (F vẫn giữ).
- **Frameless presentation**: khi bật, titlebar thu thành thanh nổi mảnh
  (floating pill) thay vì khung Win95 đầy — ảnh không bị cắt bởi khung.
- Nút ⛶ trên toolbar + phím Z, announce qua toast/aria-live.

### B. Tính năng sáng tạo (chọn lọc, nhẹ)

1. **So sánh trước/sau filter (hold-to-compare)**: giữ phím `C` hoặc giữ
   chuột trên nút so sánh → ảnh về "Gốc" tạm thời, thả ra quay lại filter
   đang chọn. Không cần toggle 2 bước.
2. **Nhiếp ảnh gia mode — ẩn toàn bộ UI trừ ảnh** (giống A nhưng tách
   riêng trạng thái để người dùng hiểu). Hợp nhất A+B thành 1 mode Zen.
3. **Copy ảnh vào clipboard** (Canvas → ClipboardItem) — có rồi ở bản cũ,
   mất khi rebuild; thêm lại.
4. **Keyboard help overlay (phím ?)**: bảng phím tắt dạng Win95 help window,
   render trong dialog, Esc/ click đóng.
5. **Mini-map Filmstrip theo dõi vị trí** — filmstrip đã có; nâng cấp: thumb
   đang xem có ring + counter trên thumb.
6. **Sound toggle** đã có (S). Bổ sung **reduced-motion aware**: toast/slide
   không animation khi prefers-reduced-motion.
7. **Copy share URL deep-link trực tiếp ?view=** (thay vì /gallery/<id>),
   khớp URL thật đang mở lightbox.

### C. Chính sách kỹ thuật

- Không thêm dependency; không vượt budget JS (còn ~7KB headroom; các
  tính năng chỉ là UI states, không lib).
- Tuân thủ: exhaustive-deps, jsx-a11y (nút mới có aria-label/aria-pressed),
  token z-index, format UTC date.
- Root dialog vẫn role=dialog; nút ⛶/Z/?: aria-pressed khi là toggle.
- Test: mở rộng galleryRebuild.test.tsx với 4 test mới (zen toggle,
  compare hold, help overlay, copy-link dùng ?view=).
- Gates sau khi xong: test/lint/typecheck/stylelint/policy/budget/build + smoke.

## Phạm vi file

- src/components/GalleryLightbox.tsx (chính)
- tests/unit/galleryRebuild.test.tsx (thêm test)
- tailieu/Ke_hoach_Full_Frame_Gallery_Experience.md (kế hoạch này + kết quả)

## Không làm

- Không đổi GalleryGrid/GalleryCard (đã ổn định).
- Không đụng API routes, deploy.yml.
- Không thêm lib ngoài.

## Kết quả thực tế (hoàn tất 19:56 01/09/2026)

### Gates — TẤT CẢ XANH

- test: 27 files / 248 tests (4 test mới: zen/compare/help/help-button)
- lint: debt 0/0, 0 error 0 warning file mới
- typecheck, stylelint, policy:ui (135/142), budget:ui, build: pass
- Prettier: pass

### Smoke runtime Chrome headless — toàn bộ luồng chính

- Deep-link: lightbox mở sau hydration, KHÔNG còn React #418 ✅
- Z (Zen): UI ẩn, pill thoát hiện; Z lần 2 thoát ✅
- ? : help overlay mở cả trong zen; Esc đóng help (lightbox giữ) ✅
- Esc layering: help → zen → close — mỗi lần một lớp, đúng thứ tự ✅
- M → filter crt; giữ C → filter=none + badge GỐC; thả C → trả crt ✅
- Click card #2: URL + dialog + SUBMISSION 2/2 đúng ✅
- EXCEPTIONS: [] ✅

### 2 bug thật được phát hiện và sửa trong quá trình nâng cấp

1. **React #418 hydration mismatch trên deep-link** — useGalleryViewParam đọc URL
   trong useState initializer (khác SSR) → React vứt HTML server. Đây chính là
   gốc của bug "URL đổi nhưng UI đứng im" từ đầu! Fix: khởi tạo null, sync URL
   trong effect post-hydration.
2. **Esc đóng nhầm lightbox khi help/zen đang mở** — useFocusTrap lắng nghe
   Escape capture-phase trên document, chạy trước handler component. Fix: trao
   handleEscapeLayered cho trap thay vì onClose thẳng.

### Phím tắt mới (cập nhật D7)

Z toàn khung · C (giữ) so sánh Gốc · K copy ảnh · ? bảng phím tắt
