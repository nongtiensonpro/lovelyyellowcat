-- ══════════════════════════════════════════════════════════════
-- LOVELYYELLOWCAT — PHASE 0 SECURITY HARDENING
-- Ngày: 22/08/2026 · Tài liệu tham chiếu: tailieu/Ke_hoach_nang_cap_UI_v3.md
-- Nội dung:
--   1. Siết RLS articles: editor chỉ toàn quyền trên bài CỦA MÌNH,
--      admin full quyền (trước đây editor xóa/sửa được cả bài của admin khác).
--   2. Siết RLS submissions: editor được DUYỆT (select/update) mọi tranh,
--      nhưng chỉ được XÓA tranh của chính mình; admin giữ toàn quyền.
--   3. Nới lỏng admin_audit_log: target_id được phép null, bỏ FK vào profiles,
--      thêm cột target_type để ghi audit cho mọi đối tượng (article/submission/...).
-- Script IDEMPOTENT — chạy lại an toàn nhiều lần.
-- ══════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────
-- 1) ARTICLES: tách quyền editor / admin
-- ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow editors and admins all access to articles" ON public.articles;

CREATE POLICY "Allow admins all access to articles"
  ON public.articles FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['admin']))
  WITH CHECK (public.current_user_has_role(ARRAY['admin']));

CREATE POLICY "Allow editors manage own articles"
  ON public.articles FOR ALL TO authenticated
  USING (
    public.current_user_has_role(ARRAY['editor'])
    AND author_id = auth.uid()
  )
  WITH CHECK (
    public.current_user_has_role(ARRAY['editor'])
    AND author_id = auth.uid()
  );

-- ────────────────────────────────────────────────
-- 2) SUBMISSIONS: editor duyệt được hết, xóa chỉ được của mình
-- ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow editors and admins access all submissions" ON public.submissions;

CREATE POLICY "Allow admins all access to submissions"
  ON public.submissions FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['admin']))
  WITH CHECK (public.current_user_has_role(ARRAY['admin']));

CREATE POLICY "Allow editors view all submissions"
  ON public.submissions FOR SELECT TO authenticated
  USING (public.current_user_has_role(ARRAY['editor']));

CREATE POLICY "Allow editors moderate all submissions"
  ON public.submissions FOR UPDATE TO authenticated
  USING (public.current_user_has_role(ARRAY['editor']))
  WITH CHECK (public.current_user_has_role(ARRAY['editor']));

CREATE POLICY "Allow editors insert own submissions"
  ON public.submissions FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_has_role(ARRAY['editor'])
    AND author_id = auth.uid()
  );

CREATE POLICY "Allow editors delete own submissions"
  ON public.submissions FOR DELETE TO authenticated
  USING (
    public.current_user_has_role(ARRAY['editor'])
    AND author_id = auth.uid()
  );

-- ────────────────────────────────────────────────
-- 3) ADMIN_AUDIT_LOG: hỗ trợ ghi audit đa đối tượng
-- ────────────────────────────────────────────────
-- Bỏ ràng buộc FK target_id -> profiles (nếu tồn tại), cho phép NULL
DO $$
DECLARE fk_name text;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'public.admin_audit_log'::regclass
    AND contype = 'f'
    AND conname ILIKE '%target%';
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.admin_audit_log DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

ALTER TABLE public.admin_audit_log ALTER COLUMN target_id DROP NOT NULL;

-- Thêm cột phân loại đối tượng bị tác động ('profile' | 'article' | 'submission' | 'comment' | ...)
ALTER TABLE public.admin_audit_log ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'profile';
CREATE INDEX IF NOT EXISTS idx_audit_log_target_type ON public.admin_audit_log (target_type);
