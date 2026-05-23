-- =======================================================
-- GIAI ĐOẠN D: PHÒNG TRIỂN LÃM CỘNG ĐỒNG (SQL MIGRATION)
-- =======================================================

-- 1. Tạo bảng public.favorites lưu giữ tác phẩm yêu thích
create table if not exists public.favorites (
  profile_id    uuid references public.profiles(id) on delete cascade not null,
  submission_id uuid references public.submissions(id) on delete cascade not null,
  saved_at      timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (profile_id, submission_id)
);

-- Kích hoạt RLS bảo mật cấp dòng
alter table public.favorites enable row level security;

-- Thêm quyền RLS cho phép người dùng thao tác danh sách yêu thích của riêng họ
drop policy if exists "Allow users all access own favorites" on public.favorites;
create policy "Allow users all access own favorites" on public.favorites for all to authenticated
  using (auth.uid() = profile_id);

drop policy if exists "Allow editors and admins delete favorites" on public.favorites;
create policy "Allow editors and admins delete favorites" on public.favorites for delete to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('editor', 'admin')));

-- 2. Đăng ký bảng favorites vào Supabase Realtime Replication
do $$
begin
  begin
    alter publication supabase_realtime add table public.favorites;
  exception when others then null;
  end;
end $$;

-- 3. Tạo View artist_stats tổng hợp số liệu đóng góp của nghệ sĩ
create or replace view public.artist_stats as
  select
    p.id,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.banner_url,
    count(distinct s.id) as artwork_count,
    coalesce(sum(r.reaction_total), 0) as total_reactions,
    max(s.created_at) as last_active
  from public.profiles p
  left join public.submissions s
    on s.author_id = p.id and s.status = 'approved'
  left join (
    -- Thống kê số lượng cảm xúc của từng submission (sử dụng UUID dạng string trong cột article_id)
    select article_id, count(*) as reaction_total
    from public.reactions group by article_id
  ) r on r.article_id = s.id::text
  group by p.id, p.full_name, p.avatar_url, p.bio, p.banner_url
  having count(distinct s.id) > 0   -- Chỉ hiển thị những người dùng đã đăng ít nhất 1 tranh được duyệt
  order by total_reactions desc, artwork_count desc;
