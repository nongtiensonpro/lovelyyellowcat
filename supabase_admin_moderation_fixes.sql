-- =======================================================
-- ADMIN MODERATION FIXES
-- Chạy file này trên Supabase SQL Editor nếu bảng quản trị báo xóa/duyệt
-- thành công nhưng bản ghi vẫn còn trong database do RLS chặn thao tác.
-- =======================================================

-- 1. Bài viết: editor/admin có toàn quyền quản trị nội dung bài viết.
drop policy if exists "Allow editors and admins all access to articles" on public.articles;
create policy "Allow editors and admins all access to articles" on public.articles for all to authenticated
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('editor', 'admin')
  ))
  with check (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('editor', 'admin')
  ));

-- 2. Bình luận: Admin cần quyền xóa bình luận bất kỳ, không chỉ đọc/insert.
drop policy if exists "Allow editors and admins delete comments" on public.comments;
create policy "Allow editors and admins delete comments" on public.comments for delete to authenticated
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('editor', 'admin')
  ));

-- 3. Reactions: Admin cần xóa reactions liên quan khi xóa bài viết/tranh.
drop policy if exists "Allow editors and admins delete reactions" on public.reactions;
create policy "Allow editors and admins delete reactions" on public.reactions for delete to authenticated
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('editor', 'admin')
  ));

-- 4. Tranh cộng đồng: middleware cho phép editor vào /admin, nên RLS cũng phải khớp.
drop policy if exists "Allow admins to access all submissions" on public.submissions;
drop policy if exists "Allow editors and admins access all submissions" on public.submissions;
create policy "Allow editors and admins access all submissions" on public.submissions for all to authenticated
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('editor', 'admin')
  ))
  with check (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('editor', 'admin')
  ));

-- 5. Favorites: bảng này có FK cascade theo submission_id, policy này giữ quyền dọn dẹp rõ ràng cho admin.
drop policy if exists "Allow editors and admins delete favorites" on public.favorites;
create policy "Allow editors and admins delete favorites" on public.favorites for delete to authenticated
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('editor', 'admin')
  ));

-- 6. Notifications: duyệt/từ chối tranh cần tạo thông báo cho tác giả.
drop policy if exists "Allow editors and admins insert notifications" on public.notifications;
create policy "Allow editors and admins insert notifications" on public.notifications for insert to authenticated
  with check (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('editor', 'admin')
  ));
