-- ============================================================
-- 🔐 LOVELY YELLOW CAT // AI E2EE ENCRYPTED STORAGE
-- Migration: supabase_ai_encrypted.sql
-- Mô tả: Lưu trữ hội thoại AI mã hóa đầu-cuối (E2EE) - Zero Knowledge
-- Nguyên tắc: E2EE bắt buộc, lưu trữ vĩnh viễn theo tài khoản,
--             admin KHÔNG được phép đọc (tuân thủ /terms)
-- Yêu cầu: Chỉ tài khoản hoạt động (is_banned = false) mới được dùng
-- ============================================================

-- ------------------------------------------------------------
-- 0. Vault cho server secrets (GEMINI_API_KEY) - TÙY CHỌN, không bắt buộc
--    Nếu extension chưa được cài trên instance này, sẽ tự bỏ qua.
--    Khi đó GEMINI_API_KEY vẫn lưu an toàn trong Cloudflare Workers Secrets
--    (như hiện tại tại src/pages/api/ai/chat.ts:46) — không ảnh hưởng E2EE chat.
-- ------------------------------------------------------------
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vault WITH SCHEMA vault;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Vault extension not available on this instance, skipping: %', SQLERRM;
END;
$$;

BEGIN;

-- ------------------------------------------------------------
-- 1. Bảng khóa bọc của từng user (1 row / user)
--    Lưu masterKey đã được wrap bằng KEK dẫn xuất từ passphrase
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_user_keys (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_master_key text NOT NULL, -- Base64(AES-GCM-GCM ciphertext của masterKey)
  kek_salt text NOT NULL,             -- Base64(salt 16B cho PBKDF2)
  kek_iterations integer NOT NULL DEFAULT 250000 CHECK (kek_iterations >= 100000),
  iv_wrap text NOT NULL,              -- Base64(iv 12B dùng để wrap masterKey)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 2. Phiên chat (metadata không nhạy cảm giữ plaintext tối thiểu)
--    Title được mã hóa, persona giữ plaintext để filter UI không cần giải mã
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_encrypted text NOT NULL, -- Base64 ciphertext của title
  title_iv text NOT NULL,        -- Base64 iv
  persona text NOT NULL CHECK (persona IN ('cybercat','art_critic','hacker','synth_dj')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user_updated ON public.ai_sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user_created ON public.ai_sessions(user_id, created_at DESC);

-- ------------------------------------------------------------
-- 3. Tin nhắn (mỗi row = 1 message đã mã hóa)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.ai_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- denormalize để RLS đơn giản, không join
  role text NOT NULL CHECK (role IN ('user','model')),
  ciphertext text NOT NULL, -- Base64(AES-GCM ciphertext + auth tag)
  iv text NOT NULL,         -- Base64(12B iv)
  model_name text,          -- plaintext, không nhạy cảm (để UI hiện)
  is_error boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_messages_session_created ON public.ai_messages(session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_user ON public.ai_messages(user_id);

-- ------------------------------------------------------------
-- 4. RLS — BẬT và CHỈ chủ sở hữu được truy cập (admin cũng KHÔNG đọc được)
--    Tuân thủ cam kết /terms: người dùng có toàn quyền với dữ liệu của mình
-- ------------------------------------------------------------
ALTER TABLE public.ai_user_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- Xóa policies cũ nếu tồn tại (idempotent)
DROP POLICY IF EXISTS "ai_user_keys_owner_all" ON public.ai_user_keys;
DROP POLICY IF EXISTS "ai_sessions_owner_all" ON public.ai_sessions;
DROP POLICY IF EXISTS "ai_messages_owner_all" ON public.ai_messages;

-- Chỉ owner (auth.uid() = user_id) được ALL, không có policy cho admin/service_role đọc ké
CREATE POLICY "ai_user_keys_owner_all"
  ON public.ai_user_keys FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_sessions_owner_all"
  ON public.ai_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_messages_owner_all"
  ON public.ai_messages FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Đảm bảo không có policy nào cho anon
-- (không GRANT cho anon, chỉ authenticated)

-- ------------------------------------------------------------
-- 5. Hàm kiểm tra tài khoản hoạt động (dùng trong API, không phải RLS)
--    Tài khoản hoạt động = tồn tại trong profiles và is_banned = false
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_account_active(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id
      AND COALESCE(is_banned, false) = false
  );
$$;

-- ------------------------------------------------------------
-- 6. Trigger tự động cập nhật updated_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_ai_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_user_keys_updated ON public.ai_user_keys;
CREATE TRIGGER trg_ai_user_keys_updated
  BEFORE UPDATE ON public.ai_user_keys
  FOR EACH ROW EXECUTE FUNCTION public.handle_ai_updated_at();

DROP TRIGGER IF EXISTS trg_ai_sessions_updated ON public.ai_sessions;
CREATE TRIGGER trg_ai_sessions_updated
  BEFORE UPDATE ON public.ai_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_ai_updated_at();

-- ------------------------------------------------------------
-- 7. Rate limit cho ai_messages (chống spam AI, 30 msg / phút)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_ai_message_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  IF user_role IN ('admin','editor') THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO recent_count
  FROM public.ai_messages
  WHERE user_id = auth.uid()
    AND created_at > now() - interval '60 seconds';

  IF recent_count >= 30 THEN
    RAISE EXCEPTION 'Bạn đang gửi quá nhanh! Vui lòng đợi 60 giây (tối đa 30 tin/phút).';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_message_rate_limit ON public.ai_messages;
CREATE TRIGGER trg_ai_message_rate_limit
  BEFORE INSERT ON public.ai_messages
  FOR EACH ROW EXECUTE FUNCTION public.check_ai_message_rate_limit();

-- ------------------------------------------------------------
-- 8. Realtime (tùy chọn) — cho phép đồng bộ đa thiết bị cùng user
--    Chỉ user mới subscribe được nhờ RLS, không lộ cho admin
-- ------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_sessions;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_messages;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$$;

COMMIT;

-- ============================================================
-- GHI CHÚ VẬN HÀNH
-- - Dữ liệu lưu VĨNH VIỄN theo tài khoản (ON DELETE CASCADE khi xóa auth.users)
-- - Admin KHÔNG có policy SELECT → không đọc được dù có service_role key? 
--   Lưu ý: service_role bypass RLS. Để đảm bảo zero-knowledge thực sự,
--   KHÔNG dùng service_role để đọc bảng này ở bất kỳ API nào.
--   Tất cả API phải dùng anon key + JWT của user (auth.uid()).
-- - Nếu cần hỗ trợ quên passphrase: user phải dùng "khóa khôi phục" (masterKey Base64) đã in ra,
--   không có backdoor.
-- ============================================================
