-- ============================================================
-- ANNOUNCE.FX v2 — WinPopup Station: accent màu chữ + icon + hiệu ứng
-- 3 cột nullable; NULL = hành vi mặc định cũ (backward compatible).
-- Giá trị hợp lệ validate ở app-layer (announcementUtils.normalize*)
-- để migration nhẹ — giá trị lạ render fallback, không lỗi DB.
--
-- accent: 'pink'|'blue'|'purple'|'green'|'yellow'|'orange' | NULL (mặc định)
-- icon:   value từ ANNOUNCE_ICONS ('megaphone','star',...) | 'auto' | NULL
-- fx:     'none'|'neon'|'chromatic'|'rainbow'|'blink' | NULL
-- ============================================================

ALTER TABLE public.site_announcements ADD COLUMN IF NOT EXISTS accent TEXT;
ALTER TABLE public.site_announcements ADD COLUMN IF NOT EXISTS icon   TEXT;
ALTER TABLE public.site_announcements ADD COLUMN IF NOT EXISTS fx     TEXT;

-- Ghi chú cho admin (không bắt buộc chạy, COMMENT an toàn idempotent):
COMMENT ON COLUMN public.site_announcements.accent IS 'ANNOUNCE.FX: màu nhấn token vapor-* (pink/blue/purple/green/yellow/orange), NULL = mặc định theo kênh';
COMMENT ON COLUMN public.site_announcements.icon IS 'ANNOUNCE.FX: key icon (ANNOUNCE_ICONS), NULL/auto = icon mặc định theo type';
COMMENT ON COLUMN public.site_announcements.fx IS 'ANNOUNCE.FX: hiệu ứng chữ (none/neon/chromatic/rainbow/blink), NULL = none';
