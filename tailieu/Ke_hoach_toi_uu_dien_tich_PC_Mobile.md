# Kế hoạch: TỐI ƯU DIỆN TÍCH HIỂN THỊ TRANG CHỦ (PC + Mobile) — "VIEWPORT.SYS"

> Trạng thái: HOÀN THÀNH (S1→S4) — 7 gates xanh, 304/304 tests; index 21564→13794 chars (-7.8KB)
> Yêu cầu: tối ưu diện tích hiển thị trang chủ trên Web PC và Mobile.
> Lưu ý phiên trước (DECLUTTER) chưa kịp commit đã mất — làm lại + mở rộng.

## 1. Chẩn đoán diện tích lãng phí

### PC
- FEATURED STRIP nhân bản journal+spotlight (~450px cao vô ích).
- Left rail 33% (4/12) chỉ để widget trạng thái + link trùng navbar + github trùng footer.
- Hero py-8 + 3 sticker trang trí; spacing mb-8/space-y-8 nhiều.
- CTA đỏ có hotline giả "1-800-VAPORWAVE" (nội dung không thật).

### Mobile
- Thứ tự DOM: aside (ServerStatus 3-tab dài + CTA + link + github) nằm TRƯỚC main
  → người dùng mobile phải cuộn qua cả đống phụ mới tới bài viết.
- ARCADE card art 92px + text = mỗi card ~180px cao ×2.
- Hero padding lớn trên màn nhỏ.

## 2. Giải pháp

### PC
1. Bỏ FEATURED STRIP + DANH MỤC + GitHub box + 3 sticker (declutter lại).
2. Left rail 4/12 → giữ lg, xl 3/12 (main 9/12) — content rộng hơn trên màn lớn.
3. Hero py-8 → py-5 sm:py-6; mb-8 → mb-6; space-y-8 → space-y-6.
4. CTA đỏ: bỏ hotline giả, p-4 → p-3, text gọn.
5. Bỏ 2 query Supabase (featuredArticles, featuredArtworks) — bớt 2 round-trip.
6. Navbar tray gọn (bỏ badge SYS_V2.0, nút Gửi Tranh, nút Người Dùng; brand 1 dòng).

### Mobile
1. ĐẢO THỨ TỰ: main (content) order-1, aside (status+CTA) order-2 — chỉ lg:order-1.
2. ARCADE compact mobile: art 92px → 56px, card ngang gọn (CSS media query).
3. Hero py-5 (đã gồm ở PC item 3).

## 3. Batch
| Bước | Việc | Verify |
|---|---|---|
| S1 | index.astro: declutter + spacing + order + grid xl | eslint + build |
| S2 | HeaderNav tray gọn | eslint |
| S3 | arcade CSS compact mobile | stylelint |
| S4 | 7 gates + CHANGELOG + tick plan + commit message | full |
