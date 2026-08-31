# ADR-0003: Progressive enhancement — nội dung trước, FX sau

- **Trạng thái:** Accepted (2026-08-22)
- **Ngữ cảnh:** CRT overlay/scanline/video hero là bản sắc, nhưng baseline có 14 `client:load`, video 6.2MB, 51 `<img>` không có `srcset`. Máy yếu/mạng yếu phải vẫn đọc được tạp chí.
- **Quyết định:**
  1. Ba chế độ người dùng: CATALOG (mặc định) / CRT / ACCESS (reduced-motion + high-contrast). Preference lưu tập trung (localStorage versioned + BroadcastChannel), không rải `localStorage` trực tiếp.
  2. FXBudget: `off/low/medium/high` — hạ theo `prefers-reduced-motion`, `Save-Data`, FPS thấp; video hero chỉ chạy khi budget ≥ medium, có poster.
  3. Hình ảnh qua `RetroImage` (Cloudinary transform, `srcset` width descriptors, `decoding=async`, lỗi hiển thị error art) — `<img>` mới không có policy bị chặn.
  4. Hydration: mặc định `client:visible`/`client:idle`; `client:load` chỉ cho shell/chat tối đa 4.
  5. Mọi nội dung văn bản phải render đúng khi JS tắt.
- **Hệ quả:** LCP/CLS cải thiện trên mobile; chi phí: codemod ảnh + đổi hydration directive theo đợt.
