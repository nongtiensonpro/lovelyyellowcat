# Kế hoạch xây dựng lại Gallery Exhibition OS

## Bối cảnh

Sau đợt nâng cấp ESLint v5.2, gallery vẫn lỗi: click card mở URL `?view=<id>` nhưng
giao diện không phản hồi nhất quán; báo cáo kiểm thử Chromium còn ghi nhận click rơi
vào `FavoriteButton` lồng trong card (favorite 0 -> 1, không mở viewer). Bản vá
trước (anchor card) không xử lý triệt để theo đánh giá của người sở hữu. Quyết
định: **xoá và xây dựng lại toàn bộ feature Gallery** theo đặc tả
`tailieu/Ke_hoach_tinh_nang_nang_cao_Vaporwave_Magazine.md` (mục D1-D8) và
Phase 4 của `Ke_hoach_nang_cap_Giao_dien_v5_ULTIMATE_OVERENGINEER.md`.

## Phạm vi xóa và dựng lại

| File                                                                    | Hành động                                                       |
| ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| `src/components/GalleryGrid.tsx` (25 KB)                                | XOÁ - viết lại từ đầu                                           |
| `src/components/GalleryLightbox.tsx` (47 KB)                            | XOÁ - viết lại từ đầu                                           |
| `tests/unit/galleryCardInteraction.test.tsx`                            | XOÁ - viết lại cho kiến trúc mới                                |
| `tests/unit/galleryDeepLink.test.tsx`                                   | XOÁ - viết lại cho kiến trúc mới                                |
| `src/pages/gallery/index.astro`, `src/pages/favorites.astro`            | GIỮ - interface island giữ nguyên props                         |
| `src/components/FavoriteButton.tsx`, `ReactionBar.tsx`, `LazyImage.tsx` | GIỮ - tái sử dụng nguyên trạng                                  |
| `src/components/gallery/*.ts` (query/transform/navigation/filters)      | GIỮ - pure modules đã có test, dùng lại làm nguồn chân lý logic |

## Kiến trúc mới

Tách nhỏ thay vì một file 47 KB:

- `gallery/useGalleryUrl.ts` - nguồn chân lý URL `?view=`: `readViewFromUrl`,
  `pushView`, `replaceView`, `clearView`, hook `useGalleryViewParam` lắng nghe
  popstate. SSR-safe.
- `gallery/GalleryCard.tsx` - card masonry. Cấu trúc flat, KHÔNG interactive
  lồng nhau: `<article>` bọc `<a href="?view=<id>">` (toàn card là link),
  nút favorite là **sibling** absolute overlay ngoài `<a>`. Click trái +
  không modifier -> `preventDefault` + `onOpen(id)`; modifier/middle -> browser
  hành vi mặc định. Bỏ `role="button"`.
- `gallery/GalleryToolbar.tsx` - search + tag filter + sort, không own state.
- `gallery/useGalleryReactions.ts` - fetch + realtime đếm reaction, debounce
  `shouldRefetch`.
- `GalleryGrid.tsx` - orchestration: state filter/sort/search/viewId, effect
  URL sync một chiều (URL -> state), render toolbar + card list + lightbox.
  Không tự ghi URL khi click (URL chỉ đổi qua `onOpen` -> `pushView`).
- `GalleryLightbox.tsx` - portal dialog: resolve index theo `activeId` (không
  giữ index cũ), `useFocusTrap`, keyboard Arrow/Esc/F/Space/L/0..9, swipe,
  zoom/rotate/flip/pan, filter chain từ `galleryFilters`, filmstrip, slideshow
  - progress, preload neighbor, share/copy/download, `handleClose` xóa param
    bằng `replaceState` (không push rác vào history).

## Nguyên tắc chống lại lỗi cũ

1. Mọi interactive element duy nhất trên card là `<a>`; favorite nằm ngoài.
2. URL là nguồn chân lý duy nhất của viewId; state chỉ mirror URL.
3. Index luôn resolve từ `activeId` mỗi render; không cache index giữa các lần mở.
4. Pure logic nằm trong `gallery/*.ts` đã có unit test.
5. Mỗi module mới <= ~350 dòng, có JSDoc, không `any`, tuân thủ `exhaustive-deps`.

## Bước thực hiện

1. Backup nội dung cũ vào `tailieu/gallery_legacy_snapshot.md` (chỉ tham khảo, không build).
2. Xoá `GalleryGrid.tsx`, `GalleryLightbox.tsx`, 2 test cũ; viết module mới.
3. Viết unit test mới: URL hook, card link isolation, lightbox resolve theo id,
   deep-link SSR.
4. Chạy gates: `npm run test`, `lint`, `typecheck`, `stylelint`, `policy:ui`,
   `budget:ui`, `build`, prettier check file mới.
5. Smoke runtime headless local build: click card -> URL + dialog; deep-link trực tiếp
   -> dialog; đóng -> URL sạch; console không exception.
6. Cập nhật kết luận thực tế vào kế hoạch này.

## Tiêu chí hoàn thành

- Full test suite xanh; ESLint 0 message.
- Click từng card mở đúng artwork; deep-link mở đúng; đóng trả URL không `?view=`.
- Không interactive lồng nhau trong card; favorite hoạt động độc lập.
- `deploy.yml` và API routes không bị đụng.

## Kết quả thực tế (hoàn tất 19:25 01/09/2026)

### Verification gates — TẤT CẢ XANH

- `npm run test`: **27 files / 244 tests pass** (galleryRebuild 4 test mới)
- `npm run lint`: pass — ESLint debt 0/0, 0 error 0 warning file mới
- `npm run typecheck`: pass
- `npm run stylelint`: pass
- `npm run policy:ui`: pass (135/142, giảm 1 hex)
- `npm run budget:ui`: pass (js 652.949/660.000 — GalleryLightbox cũ 47KB giờ chỉ ~22KB)
- `npm run build`: pass
- Prettier: tất cả file mới format chuẩn

### Smoke test runtime (Chrome headless trên local build)

- Click card #2 chuột thật: URL `?view=57ef4a70...` + dialog đúng `Halong_Digital_Nostalgia` + `SUBMISSION 2 / 2` ✅
- Click card #1: đúng `Cyber_Pyramid_Oasis` `SUBMISSION 1 / 2` ✅
- Deep-link `?view=<id>` tải trực tiếp: mở đúng artwork ✅
- Nút ✕: xóa `?view`, dialog đóng ✅
- Phím → trong lightbox: wrap sang ảnh kế, URL update ✅
- Console: 0 exception ✅ (đã fix hydration #418)

### Bug gốc đã được xử lý bằng kiến trúc

1. Card cũ = div[role=button] onClick chứa lồng FavoriteButton — click mapping có
   thể rơi nút tim. Mới: 1 link duy nhất, favorite là sibling.
2. Lightbox cũ state index + nhiều nơi tự ghi URL — Mới: index resolve từ URL
   (activeId), mọi thay đổi qua useGalleryUrl.
3. `toLocaleDateString("vi-VN")` gây hydration mismatch #418 SSR (worklord ICU
   khác Chrome) — Mới: format UTC deterministic.
4. z-index dùng token chuẩn `--z-index-modal` thay `--z-lightbox` không tồn tại.

### Cấu trúc mới

- `GalleryLightbox.tsx`: 1070 dòng -> ~550 dòng
- `GalleryGrid.tsx`: chỉ orchestration (~250 dòng)
- Tách: useGalleryUrl, useGalleryReactions, GalleryCard, GalleryToolbar
- Logic pure (gallery/*.ts) giữ nguyên + vẫn có unit test riêng
