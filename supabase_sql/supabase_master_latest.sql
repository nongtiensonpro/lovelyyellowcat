-- ============================================================
-- 🚀 LOVELY YELLOW CAT // VAPORWAVE ART JOURNAL
-- 📁 MASTER DATABASE MIGRATION & FULL SCHEMA (LATEST REBUILD)
-- ============================================================
-- Hướng dẫn sử dụng:
-- 1. Mở trang quản trị Supabase: https://supabase.com/dashboard
-- 2. Chọn dự án (Project) mới của bạn
-- 3. Vào mục "SQL Editor" ở thanh điều hướng bên trái
-- 4. Tạo một truy vấn mới (New Query), dán toàn bộ nội dung file này vào và nhấn "RUN"
-- 5. Toàn bộ CSDL, bảo mật RLS, Triggers chống spam, Hệ thống điểm thưởng Gamification
--    và Realtime sẽ được thiết lập tự động 100%.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 0. TIỆN ÍCH MỞ RỘNG (EXTENSIONS)
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- 1. BẢNG HỒ SƠ NGƯỜI DÙNG (PROFILES) & AUTH TRIGGER
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  full_name    TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::TEXT, now()),
  role         TEXT NOT NULL DEFAULT 'reader'
               CHECK (role IN ('reader', 'editor', 'admin')),
  bio          TEXT,
  banner_url   TEXT,
  social_links JSONB NOT NULL DEFAULT '{}'::JSONB,
  is_banned    BOOLEAN NOT NULL DEFAULT FALSE,
  banned_at    TIMESTAMPTZ,
  banned_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ban_reason   TEXT
);

-- Đảm bảo tương thích ngược nếu chạy nâng cấp
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'reader',
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS banned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT;

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'reader',
  ALTER COLUMN is_banned SET DEFAULT FALSE,
  ALTER COLUMN social_links SET DEFAULT '{}'::JSONB;

-- Hàm kiểm tra vai trò người dùng (không đệ quy RLS)
CREATE OR REPLACE FUNCTION public.current_user_has_role(allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = ANY (allowed_roles)
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_has_role(TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_has_role(TEXT[]) TO anon, authenticated, service_role;

-- Trigger tự động đồng bộ khi người dùng đăng nhập bằng Google OAuth
CREATE OR REPLACE FUNCTION public.handle_new_google_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    coalesce(NEW.email, ''),
    coalesce(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', 'Thành viên mới'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_google ON auth.users;
CREATE TRIGGER on_auth_user_created_google
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_google_user();

-- Trigger bảo vệ trường nhạy cảm (role, is_banned) chống leo thang đặc quyền
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  SELECT role INTO caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF coalesce(caller_role, 'reader') <> 'admin' AND auth.role() <> 'service_role' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Không có quyền thay đổi vai trò (role) của tài khoản.';
    END IF;

    IF NEW.is_banned IS DISTINCT FROM OLD.is_banned OR
       NEW.banned_at IS DISTINCT FROM OLD.banned_at OR
       NEW.banned_by IS DISTINCT FROM OLD.banned_by OR
       NEW.ban_reason IS DISTINCT FROM OLD.ban_reason THEN
      RAISE EXCEPTION 'Không có quyền thay đổi trạng thái cấm (ban) của tài khoản.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_sensitive_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.protect_profile_sensitive_fields();

-- ------------------------------------------------------------
-- 2. BẢNG BÀI VIẾT TẠP CHÍ (ARTICLES) & THẺ (TAGS)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.articles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  excerpt      TEXT,
  body_md      TEXT NOT NULL,
  cover_url    TEXT,
  author_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft', 'published', 'archived')),
  tags         TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  view_count   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::TEXT, now()),
  published_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.tag_definitions (
  slug  TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  color TEXT NOT NULL
);

-- Seed danh mục tag mặc định
INSERT INTO public.tag_definitions (slug, label, color)
VALUES
  ('vaporwave', 'Vaporwave', '#ff71ce'),
  ('synthwave', 'Synthwave', '#01cdfe'),
  ('retro95', 'Windows 95', '#fffb96'),
  ('cyberpunk', 'Cyberpunk', '#05ffa1'),
  ('vhs_glitch', 'VHS Glitch', '#b967ff'),
  ('roman_statue', 'Tượng Cổ Điển', '#ffffff'),
  ('citypop', 'City Pop', '#ff9a3c'),
  ('pixel_art', 'Pixel Art', '#00f0ff')
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 3. BẢNG TRANH CỘNG ĐỒNG (SUBMISSIONS) & TRIỂN LÃM
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.submissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  image_url        TEXT NOT NULL,
  image_pid        TEXT NOT NULL,
  tags             TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::TEXT, now())
);

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ------------------------------------------------------------
-- 4. BÌNH LUẬN, CẢM XÚC, LƯU TRỮ (INTERACTIONS)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id TEXT NOT NULL,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::TEXT, now()),
  parent_id  UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  depth      INTEGER DEFAULT 0 CHECK (depth <= 5)
);

CREATE TABLE IF NOT EXISTS public.reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id TEXT NOT NULL,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::TEXT, now()),
  UNIQUE (article_id, profile_id, emoji)
);

CREATE TABLE IF NOT EXISTS public.favorites (
  profile_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  saved_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::TEXT, now()),
  PRIMARY KEY (profile_id, submission_id)
);

CREATE TABLE IF NOT EXISTS public.bookmarks (
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  article_id TEXT NOT NULL,
  saved_at   TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::TEXT, now()),
  PRIMARY KEY (profile_id, article_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  payload    JSONB NOT NULL DEFAULT '{}'::JSONB,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::TEXT, now())
);

-- ------------------------------------------------------------
-- 5. HỆ THỐNG GAMIFICATION (XP, LEVEL, HUY CHƯƠNG)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_points (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_xp   INTEGER NOT NULL DEFAULT 0,
  level      INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::TEXT, now())
);

CREATE TABLE IF NOT EXISTS public.badges (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  label       TEXT NOT NULL,
  description TEXT,
  icon_emoji  TEXT,
  xp_required INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id   INTEGER NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::TEXT, now()),
  PRIMARY KEY (profile_id, badge_id)
);

-- Seed danh sách huy chương mặc định
INSERT INTO public.badges (slug, label, description, icon_emoji, xp_required)
VALUES
  ('bronze-creator', 'Nhà Sáng Tạo Đồng', 'Đạt 50 XP đóng góp xây dựng tạp chí.', '💾', 50),
  ('silver-creator', 'Nhà Sáng Tạo Bạc', 'Đạt 200 XP đóng góp chất lượng cao.', '📼', 200),
  ('gold-creator', 'Nhà Sáng Tạo Vàng', 'Đạt 1000 XP huyền thoại Vaporwave.', '👑', 1000),
  ('cyber-pioneer', 'Nhà Khai Hoang Số', 'Đạt 2500 XP bậc thầy Cyberpunk.', '⚡', 2500)
ON CONFLICT (slug) DO UPDATE SET
  label = excluded.label,
  description = excluded.description,
  icon_emoji = excluded.icon_emoji,
  xp_required = excluded.xp_required;

-- Bảng nhật ký kiểm toán quản trị (Admin Audit Log)
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   UUID NOT NULL REFERENCES public.profiles(id),
  action     TEXT NOT NULL,
  target_id  UUID NOT NULL REFERENCES public.profiles(id),
  details    JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 6. TÌM KIẾM TOÀN VĂN (FULL-TEXT SEARCH), VIEWS & INDEXES
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.immutable_array_to_string(arr TEXT[], sep TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT array_to_string(arr, sep);
$$;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(excerpt, '')), 'B') ||
    setweight(
      to_tsvector(
        'simple'::regconfig,
        coalesce(public.immutable_array_to_string(tags, ' '), '')
      ),
      'C'
    )
  ) STORED;

-- Indexes tối ưu hiệu năng truy vấn
CREATE INDEX IF NOT EXISTS articles_search_idx ON public.articles USING gin (search_vector);
CREATE INDEX IF NOT EXISTS idx_articles_status_published_at ON public.articles (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_author_id ON public.articles (author_id);
CREATE INDEX IF NOT EXISTS idx_articles_tags ON public.articles USING gin (tags);

CREATE INDEX IF NOT EXISTS idx_comments_article_id ON public.comments (article_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments (parent_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status_created_at ON public.submissions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_author_id ON public.submissions (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_article_id ON public.reactions (article_id);
CREATE INDEX IF NOT EXISTS idx_favorites_submission_id ON public.favorites (submission_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications (recipient, created_at DESC);
CREATE INDEX IF NOT EXISTS notif_unread_idx ON public.notifications (recipient, is_read, created_at DESC) WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON public.profiles (is_banned);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id ON public.admin_audit_log (admin_id);

-- View tổng hợp số lượng cảm xúc bài viết
CREATE OR REPLACE VIEW public.article_reaction_counts AS
SELECT
  article_id,
  emoji,
  count(*) AS total
FROM public.reactions
GROUP BY article_id, emoji;

-- View thống kê nghệ sĩ và xếp hạng triển lãm
CREATE OR REPLACE VIEW public.artist_stats AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.bio,
  p.banner_url,
  count(DISTINCT s.id) AS artwork_count,
  coalesce(sum(r.reaction_total), 0) AS total_reactions,
  max(s.created_at) AS last_active
FROM public.profiles p
LEFT JOIN public.submissions s
  ON s.author_id = p.id
 AND s.status = 'approved'
LEFT JOIN (
  SELECT article_id, count(*) AS reaction_total
  FROM public.reactions
  GROUP BY article_id
) r ON r.article_id = s.id::TEXT
GROUP BY p.id, p.full_name, p.avatar_url, p.bio, p.banner_url
HAVING count(DISTINCT s.id) > 0
ORDER BY total_reactions DESC, artwork_count DESC;

-- ------------------------------------------------------------
-- 7. CHÍNH SÁCH BẢO MẬT HÀNG (ROW LEVEL SECURITY - RLS)
-- ------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Allow public read profiles" ON public.profiles;
CREATE POLICY "Allow public read profiles"
  ON public.profiles FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Allow user update own profile" ON public.profiles;
CREATE POLICY "Allow user update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "admin_manage_profiles" ON public.profiles;
CREATE POLICY "admin_manage_profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['admin']))
  WITH CHECK (public.current_user_has_role(ARRAY['admin']));

-- Articles Policies
DROP POLICY IF EXISTS "Allow public read published articles" ON public.articles;
CREATE POLICY "Allow public read published articles"
  ON public.articles FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Allow editors and admins all access to articles" ON public.articles;
CREATE POLICY "Allow editors and admins all access to articles"
  ON public.articles FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['editor', 'admin']))
  WITH CHECK (public.current_user_has_role(ARRAY['editor', 'admin']));

-- Comments Policies
DROP POLICY IF EXISTS "Allow public read comments" ON public.comments;
CREATE POLICY "Allow public read comments"
  ON public.comments FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Allow authenticated write own comments" ON public.comments;
CREATE POLICY "Allow authenticated write own comments"
  ON public.comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Allow editors and admins delete comments" ON public.comments;
CREATE POLICY "Allow editors and admins delete comments"
  ON public.comments FOR DELETE TO authenticated
  USING (public.current_user_has_role(ARRAY['editor', 'admin']));

-- Tag Definitions Policies
DROP POLICY IF EXISTS "Allow public read tag definitions" ON public.tag_definitions;
CREATE POLICY "Allow public read tag definitions"
  ON public.tag_definitions FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Allow editors and admins write tag definitions" ON public.tag_definitions;
CREATE POLICY "Allow editors and admins write tag definitions"
  ON public.tag_definitions FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['editor', 'admin']))
  WITH CHECK (public.current_user_has_role(ARRAY['editor', 'admin']));

-- Submissions Policies
DROP POLICY IF EXISTS "Allow users to view own submissions" ON public.submissions;
CREATE POLICY "Allow users to view own submissions"
  ON public.submissions FOR SELECT TO authenticated
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Allow users to insert own submissions" ON public.submissions;
CREATE POLICY "Allow users to insert own submissions"
  ON public.submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Allow public to view approved submissions" ON public.submissions;
CREATE POLICY "Allow public to view approved submissions"
  ON public.submissions FOR SELECT
  USING (status = 'approved');

DROP POLICY IF EXISTS "Allow editors and admins access all submissions" ON public.submissions;
CREATE POLICY "Allow editors and admins access all submissions"
  ON public.submissions FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['editor', 'admin']))
  WITH CHECK (public.current_user_has_role(ARRAY['editor', 'admin']));

-- Reactions Policies
DROP POLICY IF EXISTS "Allow public read reactions" ON public.reactions;
CREATE POLICY "Allow public read reactions"
  ON public.reactions FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Allow authenticated insert reactions" ON public.reactions;
CREATE POLICY "Allow authenticated insert reactions"
  ON public.reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Allow authenticated delete own reactions" ON public.reactions;
CREATE POLICY "Allow authenticated delete own reactions"
  ON public.reactions FOR DELETE TO authenticated
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Allow editors and admins delete reactions" ON public.reactions;
CREATE POLICY "Allow editors and admins delete reactions"
  ON public.reactions FOR DELETE TO authenticated
  USING (public.current_user_has_role(ARRAY['editor', 'admin']));

-- Favorites Policies
DROP POLICY IF EXISTS "Allow users all access own favorites" ON public.favorites;
CREATE POLICY "Allow users all access own favorites"
  ON public.favorites FOR ALL TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Allow editors and admins delete favorites" ON public.favorites;
CREATE POLICY "Allow editors and admins delete favorites"
  ON public.favorites FOR DELETE TO authenticated
  USING (public.current_user_has_role(ARRAY['editor', 'admin']));

-- Bookmarks Policies
DROP POLICY IF EXISTS "Allow users all access own bookmarks" ON public.bookmarks;
CREATE POLICY "Allow users all access own bookmarks"
  ON public.bookmarks FOR ALL TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Notifications Policies
DROP POLICY IF EXISTS "Allow users to access own notifications" ON public.notifications;
CREATE POLICY "Allow users to access own notifications"
  ON public.notifications FOR ALL TO authenticated
  USING (auth.uid() = recipient)
  WITH CHECK (auth.uid() = recipient);

DROP POLICY IF EXISTS "Allow editors and admins insert notifications" ON public.notifications;
CREATE POLICY "Allow editors and admins insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.current_user_has_role(ARRAY['editor', 'admin']));

-- Gamification Policies
DROP POLICY IF EXISTS "Allow public read user points" ON public.user_points;
CREATE POLICY "Allow public read user points"
  ON public.user_points FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Allow public read badges" ON public.badges;
CREATE POLICY "Allow public read badges"
  ON public.badges FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Allow public read user badges" ON public.user_badges;
CREATE POLICY "Allow public read user badges"
  ON public.user_badges FOR SELECT
  USING (TRUE);

-- Audit Log Policies
DROP POLICY IF EXISTS "admin_select_audit_log" ON public.admin_audit_log;
CREATE POLICY "admin_select_audit_log"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.current_user_has_role(ARRAY['admin']));

DROP POLICY IF EXISTS "admin_insert_audit_log" ON public.admin_audit_log;
CREATE POLICY "admin_insert_audit_log"
  ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.current_user_has_role(ARRAY['admin']));

-- ------------------------------------------------------------
-- 8. CÁC HÀM XỬ LÝ NGHIỆP VỤ & TỰ ĐỘNG HÓA (RPC & TRIGGERS)
-- ------------------------------------------------------------

-- Lấy bài viết liên quan dựa theo Tag
CREATE OR REPLACE FUNCTION public.get_related_articles(
  p_slug TEXT,
  p_limit INTEGER DEFAULT 3
)
RETURNS SETOF public.articles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT a.*
  FROM public.articles a
  CROSS JOIN public.articles source
  WHERE source.slug = p_slug
    AND a.slug <> p_slug
    AND a.status = 'published'
    AND a.tags && source.tags
  ORDER BY (
    SELECT count(*)
    FROM unnest(a.tags) t
    WHERE t = ANY(source.tags)
  ) DESC,
  a.published_at DESC NULLS LAST
  LIMIT greatest(coalesce(p_limit, 3), 0);
$$;

-- Lấy cây bình luận phân cấp (Comment Tree)
CREATE OR REPLACE FUNCTION public.get_comment_tree(p_article_id TEXT)
RETURNS TABLE (
  id         UUID,
  article_id TEXT,
  profile_id UUID,
  content    TEXT,
  created_at TIMESTAMPTZ,
  parent_id  UUID,
  depth      INTEGER,
  full_name  TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE comment_tree AS (
    SELECT
      c.id,
      c.article_id,
      c.profile_id,
      c.content,
      c.created_at,
      c.parent_id,
      0 AS depth
    FROM public.comments c
    WHERE c.article_id = p_article_id
      AND c.parent_id IS NULL

    UNION ALL

    SELECT
      c.id,
      c.article_id,
      c.profile_id,
      c.content,
      c.created_at,
      c.parent_id,
      ct.depth + 1
    FROM public.comments c
    JOIN comment_tree ct ON c.parent_id = ct.id
    WHERE ct.depth < 5
  )
  SELECT
    ct.id,
    ct.article_id,
    ct.profile_id,
    ct.content,
    ct.created_at,
    ct.parent_id,
    ct.depth,
    p.full_name,
    p.avatar_url
  FROM comment_tree ct
  JOIN public.profiles p ON p.id = ct.profile_id
  ORDER BY ct.created_at ASC;
END;
$$;

-- Hàm cộng điểm tích lũy (XP) & Tự động tăng Level và cấp Huy chương
CREATE OR REPLACE FUNCTION public.award_xp(
  p_profile_id UUID,
  p_xp_amount INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  new_xp INTEGER;
  new_level INTEGER;
BEGIN
  INSERT INTO public.user_points (profile_id, total_xp, level)
  VALUES (p_profile_id, 0, 1)
  ON CONFLICT (profile_id) DO NOTHING;

  UPDATE public.user_points
  SET total_xp = total_xp + p_xp_amount,
      updated_at = now()
  WHERE profile_id = p_profile_id
  RETURNING total_xp INTO new_xp;

  new_level := floor(sqrt(new_xp::DOUBLE PRECISION / 100.0)) + 1;
  IF new_level < 1 THEN
    new_level := 1;
  END IF;

  UPDATE public.user_points
  SET level = new_level
  WHERE profile_id = p_profile_id;

  INSERT INTO public.user_badges (profile_id, badge_id)
  SELECT p_profile_id, b.id
  FROM public.badges b
  WHERE b.xp_required <= new_xp
  ON CONFLICT (profile_id, badge_id) DO NOTHING;
END;
$$;

-- Tự động cộng 10 XP khi bình luận
CREATE OR REPLACE FUNCTION public.handle_comment_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.award_xp(NEW.profile_id, 10);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_comment_created_xp ON public.comments;
CREATE TRIGGER on_comment_created_xp
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE PROCEDURE public.handle_comment_xp();

-- Tự động cộng 2 XP khi thả cảm xúc
CREATE OR REPLACE FUNCTION public.handle_reaction_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.award_xp(NEW.profile_id, 2);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_reaction_created_xp ON public.reactions;
CREATE TRIGGER on_reaction_created_xp
  AFTER INSERT ON public.reactions
  FOR EACH ROW EXECUTE PROCEDURE public.handle_reaction_xp();

-- Tự động gửi thông báo khi có người trả lời bình luận
CREATE OR REPLACE FUNCTION public.handle_comment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  parent_author UUID;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT c.profile_id
    INTO parent_author
    FROM public.comments c
    WHERE c.id = NEW.parent_id;

    IF parent_author IS NOT NULL AND parent_author <> NEW.profile_id THEN
      INSERT INTO public.notifications (recipient, type, payload)
      VALUES (
        parent_author,
        'comment_reply',
        jsonb_build_object(
          'article_id', NEW.article_id,
          'comment_id', NEW.id,
          'sender_name', (
            SELECT p.full_name
            FROM public.profiles p
            WHERE p.id = NEW.profile_id
          )
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_comment_created_notification ON public.comments;
CREATE TRIGGER on_comment_created_notification
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE PROCEDURE public.handle_comment_notification();

-- Đếm số lượng Admin đang hoạt động
CREATE OR REPLACE FUNCTION public.count_admins()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT count(*)::INTEGER
  FROM public.profiles
  WHERE role = 'admin'
    AND coalesce(is_banned, FALSE) = FALSE;
$$;

-- ------------------------------------------------------------
-- 9. HỆ THỐNG GIỚI HẠN TẦN SUẤT CHỐNG SPAM (ANTI-SPAM RATE LIMIT)
-- ------------------------------------------------------------

-- Giới hạn bình luận: tối đa 1 bình luận / 10 giây đối với tài khoản thường
CREATE OR REPLACE FUNCTION public.check_comment_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  recent_count INTEGER;
  user_role TEXT;
BEGIN
  SELECT p.role INTO user_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF user_role IN ('admin', 'editor') THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO recent_count
  FROM public.comments c
  WHERE c.profile_id = auth.uid()
    AND c.created_at > now() - interval '10 seconds';

  IF recent_count > 0 THEN
    RAISE EXCEPTION 'Bình luận quá nhanh! Vui lòng đợi 10 giây giữa mỗi lần bình luận.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_comment_rate_limit ON public.comments;
CREATE TRIGGER trg_check_comment_rate_limit
  BEFORE INSERT ON public.comments
  FOR EACH ROW EXECUTE PROCEDURE public.check_comment_rate_limit();

-- Giới hạn gửi tranh: tối đa 1 tranh / 3 phút đối với tài khoản thường
CREATE OR REPLACE FUNCTION public.check_submission_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  recent_count INTEGER;
  user_role TEXT;
BEGIN
  SELECT p.role INTO user_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF user_role IN ('admin', 'editor') THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO recent_count
  FROM public.submissions s
  WHERE s.author_id = auth.uid()
    AND s.created_at > now() - interval '3 minutes';

  IF recent_count > 0 THEN
    RAISE EXCEPTION 'Gửi tranh quá nhanh! Vui lòng đợi 3 phút giữa mỗi lần đăng tác phẩm.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_submission_rate_limit ON public.submissions;
CREATE TRIGGER trg_check_submission_rate_limit
  BEFORE INSERT ON public.submissions
  FOR EACH ROW EXECUTE PROCEDURE public.check_submission_rate_limit();

-- ------------------------------------------------------------
-- 10. ĐĂNG KÝ SUPABASE REALTIME
-- ------------------------------------------------------------

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.favorites;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$$;

COMMIT;

-- ============================================================
-- ✅ HOÀN TẤT KHỞI TẠO TOÀN BỘ CƠ SỞ DỮ LIỆU
-- ============================================================
