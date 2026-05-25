-- ============================================================
-- 🔧 SUPABASE USER MANAGEMENT MIGRATION
-- Hệ thống quản lý tài khoản người dùng cho Admin Panel
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- BƯỚC 1: Thêm cột ban/suspend vào bảng profiles
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned   boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_at   timestamptz,
  ADD COLUMN IF NOT EXISTS banned_by   uuid        REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS ban_reason  text;

-- ────────────────────────────────────────────────────────────
-- BƯỚC 2: Tạo bảng Audit Log — Nhật ký hành động Admin
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid        NOT NULL REFERENCES public.profiles(id),
  action      text        NOT NULL,  -- 'role_change', 'ban', 'unban'
  target_id   uuid        NOT NULL REFERENCES public.profiles(id),
  details     jsonb       DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

-- Bật RLS cho audit_log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Chỉ admin có thể đọc audit log
CREATE POLICY "admin_select_audit_log" ON public.admin_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Chỉ admin có thể ghi audit log
CREATE POLICY "admin_insert_audit_log" ON public.admin_audit_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ────────────────────────────────────────────────────────────
-- BƯỚC 3: RLS Policy cho admin quản lý profiles
-- ────────────────────────────────────────────────────────────

-- Admin có thể cập nhật BẤT KỲ profile nào (role, ban status)
-- Policy tên khác với policy tự update của user (tránh trùng)
CREATE POLICY "admin_manage_profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ────────────────────────────────────────────────────────────
-- BƯỚC 4: Function kiểm tra admin cuối cùng (tránh tự hạ role)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.count_admins()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::integer FROM public.profiles WHERE role = 'admin' AND (is_banned = false OR is_banned IS NULL);
$$;

-- ────────────────────────────────────────────────────────────
-- BƯỚC 5: Index tối ưu truy vấn
-- ────────────────────────────────────────────────────────────

-- Index cho lọc theo role
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Index cho lọc theo ban status
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON public.profiles(is_banned);

-- Index cho audit log theo thời gian
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.admin_audit_log(created_at DESC);

-- Index cho audit log theo admin
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id ON public.admin_audit_log(admin_id);
