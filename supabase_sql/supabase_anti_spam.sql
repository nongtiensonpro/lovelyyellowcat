-- ==========================================================
-- HỆ THỐNG CHỐNG SPAM TOÀN DIỆN (SUPABASE DATABASE LAYER)
-- Chạy tệp tin SQL này trong Supabase SQL Editor để cài đặt
-- các rào chắn giới hạn tần suất gửi dữ liệu (Rate Limiting).
-- ==========================================================

-- 1. GIỚI HẠN TẦN SUẤT BÌNH LUẬN (Tối đa 1 bình luận / 10 giây)
CREATE OR REPLACE FUNCTION public.check_comment_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE
  recent_count integer;
  user_role text;
BEGIN
  -- Lấy vai trò (role) của người dùng hiện tại
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Bỏ qua giới hạn đối với các tài khoản Biên tập viên (editor) và Quản trị viên (admin)
  IF user_role = 'admin' OR user_role = 'editor' THEN
    RETURN NEW;
  END IF;

  -- Đếm số lượng bình luận được gửi bởi tài khoản này trong vòng 10 giây qua
  SELECT count(*) INTO recent_count
  FROM public.comments
  WHERE profile_id = auth.uid()
    AND created_at > now() - interval '10 seconds';

  -- Nếu phát hiện có bình luận, chặn thao tác và hiển thị thông báo lỗi
  IF recent_count > 0 THEN
    RAISE EXCEPTION 'Bình luận quá nhanh! Vui lòng đợi 10 giây giữa mỗi lần bình luận.';
  END IF;

  RETURN NEW;
END;
$$;

-- Gắn trigger vào bảng comments trước khi chèn dòng dữ liệu mới
DROP TRIGGER IF EXISTS trg_check_comment_rate_limit ON public.comments;
CREATE TRIGGER trg_check_comment_rate_limit
  BEFORE INSERT ON public.comments
  FOR EACH ROW EXECUTE PROCEDURE public.check_comment_rate_limit();


-- 2. GIỚI HẠN TẦN SUẤT GỬI TRANH (Tối đa 1 tác phẩm / 3 phút)
CREATE OR REPLACE FUNCTION public.check_submission_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE
  recent_count integer;
  user_role text;
BEGIN
  -- Lấy vai trò (role) của người dùng hiện tại
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Bỏ qua giới hạn đối với các tài khoản Biên tập viên (editor) và Quản trị viên (admin)
  IF user_role = 'admin' OR user_role = 'editor' THEN
    RETURN NEW;
  END IF;

  -- Đếm số lượng tranh được gửi bởi tài khoản này trong vòng 3 phút qua
  SELECT count(*) INTO recent_count
  FROM public.submissions
  WHERE author_id = auth.uid()
    AND created_at > now() - interval '3 minutes';

  -- Nếu phát hiện có tranh được gửi gần đây, chặn thao tác và hiển thị thông báo lỗi
  IF recent_count > 0 THEN
    RAISE EXCEPTION 'Gửi tranh quá nhanh! Vui lòng đợi 3 phút giữa mỗi lần đăng tác phẩm.';
  END IF;

  RETURN NEW;
END;
$$;

-- Gắn trigger vào bảng submissions trước khi chèn dòng dữ liệu mới
DROP TRIGGER IF EXISTS trg_check_submission_rate_limit ON public.submissions;
CREATE TRIGGER trg_check_submission_rate_limit
  BEFORE INSERT ON public.submissions
  FOR EACH ROW EXECUTE PROCEDURE public.check_submission_rate_limit();
