-- 1. Cập nhật bảng public.profiles với các cột nâng cao
alter table public.profiles 
  add column if not exists role text not null default 'reader' check (role in ('reader', 'editor', 'admin')),
  add column if not exists bio text,
  add column if not exists banner_url text,
  add column if not exists social_links jsonb default '{}'::jsonb;

-- 2. Tạo bảng quản lý nhãn bài viết (Tags)
create table if not exists public.tag_definitions (
  slug text primary key,
  label text not null,
  color text not null
);

alter table public.tag_definitions enable row level security;

drop policy if exists "Allow public read tag definitions" on public.tag_definitions;
create policy "Allow public read tag definitions" on public.tag_definitions for select using (true);

drop policy if exists "Allow editors and admins write tag definitions" on public.tag_definitions;
create policy "Allow editors and admins write tag definitions" on public.tag_definitions for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('editor', 'admin')));

-- 3. Tạo bảng bài viết (Articles) quản trị nội dung
create table if not exists public.articles (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  title text not null,
  excerpt text,
  body_md text not null,
  cover_url text,
  author_id uuid references public.profiles(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  tags text[] default '{}'::text[],
  view_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  published_at timestamp with time zone
);

alter table public.articles enable row level security;

drop policy if exists "Allow public read published articles" on public.articles;
create policy "Allow public read published articles" on public.articles for select using (status = 'published');

drop policy if exists "Allow editors and admins all access to articles" on public.articles;
create policy "Allow editors and admins all access to articles" on public.articles for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('editor', 'admin')));

-- 4. GIN Index hỗ trợ tìm kiếm Full-Text Search Tiếng Việt
create or replace function public.immutable_array_to_string(arr text[], sep text)
returns text
language sql
immutable parallel safe strict
as $$
  select array_to_string(arr, sep);
$$;

alter table public.articles
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig, public.immutable_array_to_string(tags, ' ')), 'C')
  ) stored;

create index if not exists articles_search_idx on public.articles using gin(search_vector);

-- 5. Tạo bảng gửi tác phẩm nghệ thuật của cộng đồng (Submissions)
create table if not exists public.submissions (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  image_url text not null,
  image_pid text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.submissions enable row level security;

drop policy if exists "Allow users to view own submissions" on public.submissions;
create policy "Allow users to view own submissions" on public.submissions for select to authenticated using (auth.uid() = author_id);

drop policy if exists "Allow users to insert own submissions" on public.submissions;
create policy "Allow users to insert own submissions" on public.submissions for insert to authenticated with check (auth.uid() = author_id);

drop policy if exists "Allow public to view approved submissions" on public.submissions;
create policy "Allow public to view approved submissions" on public.submissions for select using (status = 'approved');

drop policy if exists "Allow admins to access all submissions" on public.submissions;
create policy "Allow admins to access all submissions" on public.submissions for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- 6. Tạo bảng bày tỏ cảm xúc emoji (Reactions)
create table if not exists public.reactions (
  id uuid default gen_random_uuid() primary key,
  article_id text not null,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  emoji text not null check (emoji in ('💾', '📼', '🌊', '🎮', '🌸')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (article_id, profile_id, emoji)
);

alter table public.reactions enable row level security;

drop policy if exists "Allow public read reactions" on public.reactions;
create policy "Allow public read reactions" on public.reactions for select using (true);

drop policy if exists "Allow authenticated insert reactions" on public.reactions;
create policy "Allow authenticated insert reactions" on public.reactions for insert to authenticated with check (auth.uid() = profile_id);

drop policy if exists "Allow authenticated delete own reactions" on public.reactions;
create policy "Allow authenticated delete own reactions" on public.reactions for delete to authenticated using (auth.uid() = profile_id);

-- View đếm tổng hợp Reactions
create or replace view public.article_reaction_counts as
  select
    article_id,
    emoji,
    count(*) as total
  from public.reactions
  group by article_id, emoji;

-- 7. Hệ thống Gamification: Điểm tích lũy và Huy chương (Badges)
create table if not exists public.user_points (
  profile_id uuid references public.profiles(id) on delete cascade primary key,
  total_xp integer default 0 not null,
  level integer default 1 not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.badges (
  id serial primary key,
  slug text unique not null,
  label text not null,
  description text,
  icon_emoji text,
  xp_required integer default 0 not null
);

create table if not exists public.user_badges (
  profile_id uuid references public.profiles(id) on delete cascade not null,
  badge_id integer references public.badges(id) on delete cascade not null,
  earned_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (profile_id, badge_id)
);

alter table public.user_points enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

drop policy if exists "Allow public read user points" on public.user_points;
create policy "Allow public read user points" on public.user_points for select using (true);

drop policy if exists "Allow public read badges" on public.badges;
create policy "Allow public read badges" on public.badges for select using (true);

drop policy if exists "Allow public read user badges" on public.user_badges;
create policy "Allow public read user badges" on public.user_badges for select using (true);

-- Hàm xử lý tích lũy điểm XP động trong PostgreSQL
create or replace function public.award_xp(p_profile_id uuid, p_xp_amount integer)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  current_xp integer;
  new_xp integer;
  new_level integer;
begin
  -- Đảm bảo người dùng có dòng ghi nhận điểm
  insert into public.user_points (profile_id, total_xp, level)
  values (p_profile_id, 0, 1)
  on conflict (profile_id) do nothing;
  
  -- Thực thi cộng dồn XP
  update public.user_points
  set total_xp = total_xp + p_xp_amount,
      updated_at = now()
  where profile_id = p_profile_id
  returning total_xp into new_xp;
  
  -- Công thức tính Level cấp số nhân hoài cổ: level = floor(sqrt(xp / 100)) + 1
  new_level := floor(sqrt(new_xp::double precision / 100.0)) + 1;
  if new_level < 1 then
    new_level := 1;
  end if;
  
  update public.user_points
  set level = new_level
  where profile_id = p_profile_id;
  
  -- Tự động trao tặng Huy chương nếu đạt yêu cầu điểm tích lũy
  insert into public.user_badges (profile_id, badge_id)
  select p_profile_id, id
  from public.badges b
  where b.xp_required <= new_xp
  on conflict (profile_id, badge_id) do nothing;
end;
$$;

-- Nạp các dữ liệu huy chương mặc định phong cách 8-bit
insert into public.badges (slug, label, description, icon_emoji, xp_required)
values 
  ('bronze-creator', 'Nhà Sáng Tạo Đồng', 'Đạt 50 XP đóng góp xây dựng tạp chí.', '💾', 50),
  ('silver-creator', 'Nhà Sáng Tạo Bạc', 'Đạt 200 XP đóng góp chất lượng cao.', '📼', 200),
  ('gold-creator', 'Nhà Sáng Tạo Vàng', 'Đạt 1000 XP huyền thoại Vaporwave.', '👑', 1000)
on conflict (slug) do update
set label = excluded.label, description = excluded.description, icon_emoji = excluded.icon_emoji, xp_required = excluded.xp_required;

-- Triggers tự động tặng điểm XP
create or replace function public.handle_comment_xp()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.award_xp(new.profile_id, 10); -- Thêm 10 XP khi bình luận bài viết
  return new;
end;
$$;

drop trigger if exists on_comment_created_xp on public.comments;
create trigger on_comment_created_xp
  after insert on public.comments
  for each row execute procedure public.handle_comment_xp();

create or replace function public.handle_reaction_xp()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.award_xp(new.profile_id, 2); -- Thêm 2 XP khi bày tỏ cảm xúc emoji
  return new;
end;
$$;

drop trigger if exists on_reaction_created_xp on public.reactions;
create trigger on_reaction_created_xp
  after insert on public.reactions
  for each row execute procedure public.handle_reaction_xp();

-- 8. Hệ thống Thông báo (Notifications)
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  recipient uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('comment_reply', 'submission_approved', 'submission_rejected', 'badge_earned')),
  payload jsonb default '{}'::jsonb not null,
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notifications enable row level security;

drop policy if exists "Allow users to access own notifications" on public.notifications;
create policy "Allow users to access own notifications" on public.notifications for all to authenticated
  using (auth.uid() = recipient);

create index if not exists notif_unread_idx on public.notifications (recipient, is_read, created_at desc) where is_read = false;

-- Trigger tạo thông báo phản hồi bình luận
create or replace function public.handle_comment_notification()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  parent_author uuid;
begin
  if new.parent_id is not null then
    select profile_id into parent_author
    from public.comments
    where id = new.parent_id;
    
    if parent_author is not null and parent_author != new.profile_id then
      insert into public.notifications (recipient, type, payload)
      values (
        parent_author,
        'comment_reply',
        jsonb_build_object(
          'article_id', new.article_id,
          'comment_id', new.id,
          'sender_name', (select full_name from public.profiles where id = new.profile_id)
        )
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_comment_created_notification on public.comments;
create trigger on_comment_created_notification
  after insert on public.comments
  for each row execute procedure public.handle_comment_notification();

-- 9. Nâng cấp Nested Comments cho bảng comments đã có
alter table public.comments
  add column if not exists parent_id uuid references public.comments(id) on delete cascade,
  add column if not exists depth integer default 0 check (depth <= 3);

-- Hàm đệ quy recursive CTE lấy cây bình luận
create or replace function public.get_comment_tree(p_article_id text)
returns table (
  id uuid,
  article_id text,
  profile_id uuid,
  content text,
  created_at timestamp with time zone,
  parent_id uuid,
  depth integer,
  full_name text,
  avatar_url text
) 
language plpgsql
security definer set search_path = ''
as $$
begin
  return query
  with recursive comment_tree as (
    -- Gốc (Bình luận cấp 0)
    select c.id, c.article_id, c.profile_id, c.content, c.created_at, c.parent_id, 0 as depth
    from public.comments c
    where c.article_id = p_article_id and c.parent_id is null
  
    union all
  
    -- Các nút con lồng nhau
    select c.id, c.article_id, c.profile_id, c.content, c.created_at, c.parent_id, ct.depth + 1
    from public.comments c
    join comment_tree ct on c.parent_id = ct.id
    where ct.depth < 3
  )
  select 
    ct.id, 
    ct.article_id, 
    ct.profile_id, 
    ct.content, 
    ct.created_at, 
    ct.parent_id, 
    ct.depth,
    p.full_name,
    p.avatar_url
  from comment_tree ct
  join public.profiles p on p.id = ct.profile_id
  order by ct.created_at asc;
end;
$$;

-- 10. Tạo bảng lưu trữ dấu trang (Bookmarks / Read Later)
create table if not exists public.bookmarks (
  profile_id uuid references public.profiles(id) on delete cascade not null,
  article_id text not null,
  saved_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (profile_id, article_id)
);

alter table public.bookmarks enable row level security;

drop policy if exists "Allow users all access own bookmarks" on public.bookmarks;
create policy "Allow users all access own bookmarks" on public.bookmarks for all to authenticated
  using (auth.uid() = profile_id);

-- 11. Đăng ký các kênh phát sóng thời gian thực (Supabase Realtime Replication)
do $$
begin
  -- Đảm bảo Supabase Realtime kích hoạt cho các bảng cần tương tác
  begin
    alter publication supabase_realtime add table public.comments;
  exception when others then null;
  end;
  
  begin
    alter publication supabase_realtime add table public.reactions;
  exception when others then null;
  end;

  begin
    alter publication supabase_realtime add table public.notifications;
  exception when others then null;
  end;

  begin
    alter publication supabase_realtime add table public.submissions;
  exception when others then null;
  end;
end $$;
