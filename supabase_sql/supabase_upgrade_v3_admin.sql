-- ══════════════════════════════════════════════════════════════
-- LOVELYYELLOWCAT — UPGRADE v3 ADMIN SUITE (GIAI ĐOẠN 4)
-- Ngày: 22/08/2026 · Tài liệu: tailieu/Ke_hoach_nang_cap_UI_v3.md
-- Chạy SAU supabase_phase0_security.sql
-- Nội dung:
--   1. Cột is_featured (Featured Curator) cho articles + submissions
--   2. Bảng site_settings (key-value) — maintenance mode, công tắc tính năng
--   3. Bảng site_announcements — thông báo toàn站 banner/marquee/popup
--   4. Cột deleted_at (Recycle Bin) cho articles + submissions
--   5. View daily_stats 30 ngày + RPC get_top_artifacts cho Analytics
-- Script IDEMPOTENT — chạy lại an toàn nhiều lần.
-- ══════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────
-- 1) FEATURED CURATOR
-- ────────────────────────────────────────────────
ALTER TABLE public.articles    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_articles_featured
  ON public.articles (published_at DESC) WHERE is_featured = true AND status = 'published';
CREATE INDEX IF NOT EXISTS idx_submissions_featured
  ON public.submissions (created_at DESC) WHERE is_featured = true AND status = 'approved';

-- ────────────────────────────────────────────────
-- 2) SITE SETTINGS (key-value)
--    Keys chuẩn: maintenance_mode {enabled:bool}, submissions_open {enabled:bool},
--                comment_min_length {value:int}
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}'::JSONB,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.site_settings (key, value) VALUES
  ('maintenance_mode', '{"enabled": false}'::JSONB),
  ('submissions_open', '{"enabled": true}'::JSONB),
  ('comment_min_length', '{"value": 2}'::JSONB)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_public_read" ON public.site_settings;
CREATE POLICY "settings_public_read"
  ON public.site_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "settings_admin_write" ON public.site_settings;
CREATE POLICY "settings_admin_write"
  ON public.site_settings FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['admin']))
  WITH CHECK (public.current_user_has_role(ARRAY['admin']));

-- ────────────────────────────────────────────────
-- 3) SITE ANNOUNCEMENTS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  type       TEXT NOT NULL DEFAULT 'marquee' CHECK (type IN ('banner','marquee','popup')),
  is_active  BOOLEAN NOT NULL DEFAULT true,
  start_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at     TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_public_read_active" ON public.site_announcements;
CREATE POLICY "announcements_public_read_active"
  ON public.site_announcements FOR SELECT
  USING (
    (is_active = true AND (end_at IS NULL OR end_at > now()))
    OR public.current_user_has_role(ARRAY['admin'])
  );

DROP POLICY IF EXISTS "announcements_admin_write" ON public.site_announcements;
CREATE POLICY "announcements_admin_write"
  ON public.site_announcements FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['admin']))
  WITH CHECK (public.current_user_has_role(ARRAY['admin']));

-- ────────────────────────────────────────────────
-- 4) RECYCLE BIN (soft-delete)
--    Quy ước: soft delete = đặt deleted_at + gạt status sang giá trị ẩn
--    (articles → archived, submissions → rejected) nên mọi truy vấn public
--    hiện có (lọc theo status) tự động ẩn mà không cần sửa.
-- ────────────────────────────────────────────────
ALTER TABLE public.articles    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_articles_trash    ON public.articles (deleted_at DESC) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_submissions_trash ON public.submissions (deleted_at DESC) WHERE deleted_at IS NOT NULL;

-- ────────────────────────────────────────────────
-- 5) ANALYTICS: view tổng hợp 30 ngày + RPC top tranh yêu thích
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.daily_stats AS
WITH days AS (
  SELECT generate_series(
    (current_date - interval '29 days'),
    current_date,
    interval '1 day'
  )::date AS day
)
SELECT
  d.day,
  (SELECT count(*) FROM public.profiles    WHERE created_at::date = d.day) AS new_users,
  (SELECT count(*) FROM public.articles    WHERE created_at::date = d.day) AS new_articles,
  (SELECT count(*) FROM public.submissions WHERE created_at::date = d.day) AS new_submissions,
  (SELECT count(*) FROM public.comments    WHERE created_at::date = d.day) AS new_comments
FROM days d;

COMMENT ON VIEW public.daily_stats IS 'Aggregate counts per day, last 30 days. Non-sensitive totals only.';

CREATE OR REPLACE FUNCTION public.get_top_artifacts(p_limit INT DEFAULT 8)
RETURNS TABLE (
  submission_id UUID,
  title         TEXT,
  image_url     TEXT,
  fav_count     BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.title, s.image_url, count(f.*)::BIGINT AS fav_count
  FROM public.submissions s
  LEFT JOIN public.favorites f ON f.submission_id = s.id
  WHERE s.status = 'approved'
  GROUP BY s.id, s.title, s.image_url
  ORDER BY fav_count DESC, s.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_artifacts(INT) TO authenticated;

-- Hạn chế view daily_stats: chỉ authenticated đọc được (anon bị chặn)
REVOKE SELECT ON public.daily_stats FROM anon;
