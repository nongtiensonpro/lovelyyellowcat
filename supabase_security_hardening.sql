-- ============================================================
-- 🛡️ SUPABASE SECURITY HARDENING MIGRATION
-- Chặn leo thang đặc quyền (Privilege Escalation) trên bảng profiles
-- ============================================================

-- 1. Hàm trigger bảo vệ các trường nhạy cảm của bảng profiles
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  caller_role text;
BEGIN
  -- Lấy role hiện tại của caller từ profiles
  SELECT role INTO caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Nếu không phải admin (hoặc service_role), chặn thay đổi role và is_banned
  IF coalesce(caller_role, 'reader') <> 'admin' AND auth.role() <> 'service_role' THEN
    -- Giữ nguyên role cũ
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Không có quyền thay đổi vai trò (role) của tài khoản.';
    END IF;

    -- Giữ nguyên trạng thái cấm cũ
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

-- 2. Gắn trigger vào bảng profiles
DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_sensitive_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.protect_profile_sensitive_fields();

-- 3. Đảm bảo RLS được kích hoạt trên tất cả bảng quan trọng
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_audit_log ENABLE ROW LEVEL SECURITY;
