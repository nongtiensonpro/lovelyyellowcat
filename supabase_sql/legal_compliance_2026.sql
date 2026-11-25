-- ============================================================
-- ⚖️ LOVELY YELLOW CAT // LEGAL COMPLIANCE MIGRATION 2026
-- Tham chiếu: Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 & NĐ 356/2025/NĐ-CP
-- Gồm:
--   1. Quyền tự xóa tài khoản (profiles DELETE RLS + RPC delete_own_account)
--   2. Tự động dọn dẹp dữ liệu AI & Telemetry quá hạn 6 tháng
-- ============================================================

BEGIN;

-- 1. Cho phép người dùng tự xóa dòng profiles của chính mình qua RLS
DROP POLICY IF EXISTS "Allow user delete own profile" ON public.profiles;
CREATE POLICY "Allow user delete own profile"
  ON public.profiles FOR DELETE TO authenticated
  USING (auth.uid() = id);

-- 2. RPC xóa tài khoản hoàn toàn (xóa auth.users để cascade toàn bộ profiles,
--    submissions, comments, reactions, favorites, bookmarks, notifications,
--    user_points, user_badges, ai_user_keys, ai_sessions, ai_messages)
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Chưa xác thực người dùng.';
  END IF;

  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

-- 3. Hàm dọn dẹp dữ liệu AI & Telemetry quá hạn 6 tháng (180 ngày)
--    Có thể gọi qua pg_cron định kỳ hoặc từ API người dùng (chỉ xóa của chính user)
CREATE OR REPLACE FUNCTION public.prune_expired_ai_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_sessions
  WHERE updated_at < (now() - INTERVAL '6 months');
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  DELETE FROM public.ui_events
  WHERE created_at < (now() - INTERVAL '6 months');

  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.prune_expired_ai_sessions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prune_expired_ai_sessions() TO service_role;

COMMIT;
