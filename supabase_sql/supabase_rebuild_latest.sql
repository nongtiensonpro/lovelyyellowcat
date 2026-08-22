-- ============================================================
-- LOVELY YELLOW CAT / VAPORWAVE MAGAZINE
-- Supabase database rebuild - consolidated latest schema
-- Generated from the project's existing SQL and application usage.
--
-- IMPORTANT:
--   - This script rebuilds the public schema, functions, triggers,
--     RLS policies, indexes, views and Realtime registrations.
--   - It intentionally does NOT DROP TABLE, TRUNCATE or DELETE data.
--   - Run it in Supabase SQL Editor with the postgres/service role.
--   - It cannot restore rows that no longer exist in a backup/export.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 0. Required extension
-- ------------------------------------------------------------

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. Profiles and authentication trigger
-- ------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  full_name    text,
  avatar_url   text,
  created_at   timestamptz not null default timezone('utc'::text, now()),
  role         text not null default 'reader'
               check (role in ('reader', 'editor', 'admin')),
  bio          text,
  banner_url   text,
  social_links jsonb not null default '{}'::jsonb,
  is_banned    boolean not null default false,
  banned_at    timestamptz,
  banned_by    uuid references public.profiles(id) on delete set null,
  ban_reason   text
);

-- Complete older/partial installations without replacing existing data.
alter table public.profiles
  add column if not exists role text default 'reader',
  add column if not exists bio text,
  add column if not exists banner_url text,
  add column if not exists social_links jsonb default '{}'::jsonb,
  add column if not exists is_banned boolean default false,
  add column if not exists banned_at timestamptz,
  add column if not exists banned_by uuid references public.profiles(id) on delete set null,
  add column if not exists ban_reason text;

alter table public.profiles
  alter column role set default 'reader',
  alter column is_banned set default false,
  alter column social_links set default '{}'::jsonb;

update public.profiles
set role = 'reader'
where role is null;

update public.profiles
set is_banned = false
where is_banned is null;

update public.profiles
set social_links = '{}'::jsonb
where social_links is null;

alter table public.profiles
  alter column role set not null,
  alter column is_banned set not null,
  alter column social_links set not null;

-- Used by RLS policies so admin/editor checks do not recurse through the
-- profiles policy while the profiles table itself is being updated.
create or replace function public.current_user_has_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = any (allowed_roles)
  );
$$;

revoke all on function public.current_user_has_role(text[]) from public;
grant execute on function public.current_user_has_role(text[]) to anon, authenticated;

alter table public.profiles enable row level security;

drop policy if exists "Allow public read profiles" on public.profiles;
create policy "Allow public read profiles"
  on public.profiles for select
  using (true);

drop policy if exists "Allow user update own profile" on public.profiles;
create policy "Allow user update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "admin_manage_profiles" on public.profiles;
create policy "admin_manage_profiles"
  on public.profiles for update to authenticated
  using (public.current_user_has_role(array['admin']))
  with check (public.current_user_has_role(array['admin']));

create or replace function public.handle_new_google_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_google on auth.users;
create trigger on_auth_user_created_google
  after insert on auth.users
  for each row execute procedure public.handle_new_google_user();

-- If auth.users survived a public-schema reset, recreate the missing profiles.
insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 2. Core content tables
-- ------------------------------------------------------------

create table if not exists public.articles (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  excerpt      text,
  body_md      text not null,
  cover_url    text,
  author_id    uuid references public.profiles(id) on delete set null,
  status       text not null default 'draft'
               check (status in ('draft', 'published', 'archived')),
  tags         text[] not null default '{}'::text[],
  view_count   integer not null default 0,
  created_at   timestamptz not null default timezone('utc'::text, now()),
  published_at timestamptz
);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  article_id text not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  parent_id  uuid references public.comments(id) on delete cascade,
  depth      integer default 0 check (depth <= 3)
);

alter table public.comments
  add column if not exists parent_id uuid references public.comments(id) on delete cascade,
  add column if not exists depth integer default 0;

create table if not exists public.tag_definitions (
  slug  text primary key,
  label text not null,
  color text not null
);

create table if not exists public.submissions (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text,
  image_url   text not null,
  image_pid   text not null,
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at  timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.reactions (
  id         uuid primary key default gen_random_uuid(),
  article_id text not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  emoji      text not null check (emoji in ('💾', '📼', '🌊', '🎮', '🌸')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (article_id, profile_id, emoji)
);

create table if not exists public.favorites (
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  saved_at      timestamptz not null default timezone('utc'::text, now()),
  primary key (profile_id, submission_id)
);

create table if not exists public.bookmarks (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  article_id text not null,
  saved_at   timestamptz not null default timezone('utc'::text, now()),
  primary key (profile_id, article_id)
);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  recipient  uuid not null references public.profiles(id) on delete cascade,
  type       text not null check (type in (
    'comment_reply',
    'submission_approved',
    'submission_rejected',
    'badge_earned'
  )),
  payload    jsonb not null default '{}'::jsonb,
  is_read    boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- ------------------------------------------------------------
-- 3. Gamification tables
-- ------------------------------------------------------------

create table if not exists public.user_points (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  total_xp   integer not null default 0,
  level      integer not null default 1,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.badges (
  id          serial primary key,
  slug        text unique not null,
  label       text not null,
  description text,
  icon_emoji  text,
  xp_required integer not null default 0
);

create table if not exists public.user_badges (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  badge_id   integer not null references public.badges(id) on delete cascade,
  earned_at  timestamptz not null default timezone('utc'::text, now()),
  primary key (profile_id, badge_id)
);

create table if not exists public.admin_audit_log (
  id         uuid primary key default gen_random_uuid(),
  admin_id   uuid not null references public.profiles(id),
  action     text not null,
  target_id  uuid not null references public.profiles(id),
  details    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4. Search, views and indexes
-- ------------------------------------------------------------

create or replace function public.immutable_array_to_string(arr text[], sep text)
returns text
language sql
immutable
parallel safe
strict
as $$
  select array_to_string(arr, sep);
$$;

alter table public.articles
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(excerpt, '')), 'B') ||
    setweight(
      to_tsvector(
        'simple'::regconfig,
        coalesce(public.immutable_array_to_string(tags, ' '), '')
      ),
      'C'
    )
  ) stored;

create index if not exists articles_search_idx
  on public.articles using gin (search_vector);
create index if not exists idx_articles_status_published_at
  on public.articles (status, published_at desc);
create index if not exists idx_articles_author_id
  on public.articles (author_id);
create index if not exists idx_articles_tags
  on public.articles using gin (tags);

create index if not exists idx_comments_article_id
  on public.comments (article_id, created_at);
create index if not exists idx_comments_parent_id
  on public.comments (parent_id);
create index if not exists idx_submissions_status_created_at
  on public.submissions (status, created_at desc);
create index if not exists idx_submissions_author_id
  on public.submissions (author_id, created_at desc);
create index if not exists idx_reactions_article_id
  on public.reactions (article_id);
create index if not exists idx_favorites_submission_id
  on public.favorites (submission_id);
create index if not exists idx_notifications_recipient
  on public.notifications (recipient, created_at desc);
create index if not exists notif_unread_idx
  on public.notifications (recipient, is_read, created_at desc)
  where is_read = false;

create index if not exists idx_profiles_role
  on public.profiles (role);
create index if not exists idx_profiles_is_banned
  on public.profiles (is_banned);
create index if not exists idx_audit_log_created_at
  on public.admin_audit_log (created_at desc);
create index if not exists idx_audit_log_admin_id
  on public.admin_audit_log (admin_id);

create or replace view public.article_reaction_counts as
select
  article_id,
  emoji,
  count(*) as total
from public.reactions
group by article_id, emoji;

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
  on s.author_id = p.id
 and s.status = 'approved'
left join (
  select article_id, count(*) as reaction_total
  from public.reactions
  group by article_id
) r on r.article_id = s.id::text
group by p.id, p.full_name, p.avatar_url, p.bio, p.banner_url
having count(distinct s.id) > 0
order by total_reactions desc, artwork_count desc;

-- ------------------------------------------------------------
-- 5. RLS policies
-- ------------------------------------------------------------

alter table public.articles enable row level security;
alter table public.comments enable row level security;
alter table public.tag_definitions enable row level security;
alter table public.submissions enable row level security;
alter table public.reactions enable row level security;
alter table public.favorites enable row level security;
alter table public.bookmarks enable row level security;
alter table public.notifications enable row level security;
alter table public.user_points enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.admin_audit_log enable row level security;

-- Articles
drop policy if exists "Allow public read published articles" on public.articles;
create policy "Allow public read published articles"
  on public.articles for select
  using (status = 'published');

drop policy if exists "Allow editors and admins all access to articles" on public.articles;
create policy "Allow editors and admins all access to articles"
  on public.articles for all to authenticated
  using (public.current_user_has_role(array['editor', 'admin']))
  with check (public.current_user_has_role(array['editor', 'admin']));

-- Comments
drop policy if exists "Allow public read comments" on public.comments;
create policy "Allow public read comments"
  on public.comments for select
  using (true);

drop policy if exists "Allow authenticated write own comments" on public.comments;
create policy "Allow authenticated write own comments"
  on public.comments for insert to authenticated
  with check (auth.uid() = profile_id);

drop policy if exists "Allow editors and admins delete comments" on public.comments;
create policy "Allow editors and admins delete comments"
  on public.comments for delete to authenticated
  using (public.current_user_has_role(array['editor', 'admin']));

-- Tags
drop policy if exists "Allow public read tag definitions" on public.tag_definitions;
create policy "Allow public read tag definitions"
  on public.tag_definitions for select
  using (true);

drop policy if exists "Allow editors and admins write tag definitions" on public.tag_definitions;
create policy "Allow editors and admins write tag definitions"
  on public.tag_definitions for all to authenticated
  using (public.current_user_has_role(array['editor', 'admin']))
  with check (public.current_user_has_role(array['editor', 'admin']));

-- Submissions
drop policy if exists "Allow users to view own submissions" on public.submissions;
create policy "Allow users to view own submissions"
  on public.submissions for select to authenticated
  using (auth.uid() = author_id);

drop policy if exists "Allow users to insert own submissions" on public.submissions;
create policy "Allow users to insert own submissions"
  on public.submissions for insert to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Allow public to view approved submissions" on public.submissions;
create policy "Allow public to view approved submissions"
  on public.submissions for select
  using (status = 'approved');

drop policy if exists "Allow admins to access all submissions" on public.submissions;
drop policy if exists "Allow editors and admins access all submissions" on public.submissions;
create policy "Allow editors and admins access all submissions"
  on public.submissions for all to authenticated
  using (public.current_user_has_role(array['editor', 'admin']))
  with check (public.current_user_has_role(array['editor', 'admin']));

-- Reactions
drop policy if exists "Allow public read reactions" on public.reactions;
create policy "Allow public read reactions"
  on public.reactions for select
  using (true);

drop policy if exists "Allow authenticated insert reactions" on public.reactions;
create policy "Allow authenticated insert reactions"
  on public.reactions for insert to authenticated
  with check (auth.uid() = profile_id);

drop policy if exists "Allow authenticated delete own reactions" on public.reactions;
create policy "Allow authenticated delete own reactions"
  on public.reactions for delete to authenticated
  using (auth.uid() = profile_id);

drop policy if exists "Allow editors and admins delete reactions" on public.reactions;
create policy "Allow editors and admins delete reactions"
  on public.reactions for delete to authenticated
  using (public.current_user_has_role(array['editor', 'admin']));

-- Favorites
drop policy if exists "Allow users all access own favorites" on public.favorites;
create policy "Allow users all access own favorites"
  on public.favorites for all to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

drop policy if exists "Allow editors and admins delete favorites" on public.favorites;
create policy "Allow editors and admins delete favorites"
  on public.favorites for delete to authenticated
  using (public.current_user_has_role(array['editor', 'admin']));

-- Bookmarks
drop policy if exists "Allow users all access own bookmarks" on public.bookmarks;
create policy "Allow users all access own bookmarks"
  on public.bookmarks for all to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- Notifications
drop policy if exists "Allow users to access own notifications" on public.notifications;
create policy "Allow users to access own notifications"
  on public.notifications for all to authenticated
  using (auth.uid() = recipient)
  with check (auth.uid() = recipient);

drop policy if exists "Allow editors and admins insert notifications" on public.notifications;
create policy "Allow editors and admins insert notifications"
  on public.notifications for insert to authenticated
  with check (public.current_user_has_role(array['editor', 'admin']));

-- Gamification read policies. Writes happen through security-definer functions.
drop policy if exists "Allow public read user points" on public.user_points;
create policy "Allow public read user points"
  on public.user_points for select
  using (true);

drop policy if exists "Allow public read badges" on public.badges;
create policy "Allow public read badges"
  on public.badges for select
  using (true);

drop policy if exists "Allow public read user badges" on public.user_badges;
create policy "Allow public read user badges"
  on public.user_badges for select
  using (true);

-- Audit log
drop policy if exists "admin_select_audit_log" on public.admin_audit_log;
create policy "admin_select_audit_log"
  on public.admin_audit_log for select to authenticated
  using (public.current_user_has_role(array['admin']));

drop policy if exists "admin_insert_audit_log" on public.admin_audit_log;
create policy "admin_insert_audit_log"
  on public.admin_audit_log for insert to authenticated
  with check (public.current_user_has_role(array['admin']));

-- ------------------------------------------------------------
-- 6. RPC functions and triggers
-- ------------------------------------------------------------

create or replace function public.get_related_articles(
  p_slug text,
  p_limit integer default 3
)
returns setof public.articles
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select a.*
  from public.articles a
  cross join public.articles source
  where source.slug = p_slug
    and a.slug <> p_slug
    and a.status = 'published'
    and a.tags && source.tags
  order by (
    select count(*)
    from unnest(a.tags) t
    where t = any(source.tags)
  ) desc,
  a.published_at desc nulls last
  limit greatest(coalesce(p_limit, 3), 0);
$$;

create or replace function public.get_comment_tree(p_article_id text)
returns table (
  id         uuid,
  article_id text,
  profile_id uuid,
  content    text,
  created_at timestamptz,
  parent_id  uuid,
  depth      integer,
  full_name  text,
  avatar_url text
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  return query
  with recursive comment_tree as (
    select
      c.id,
      c.article_id,
      c.profile_id,
      c.content,
      c.created_at,
      c.parent_id,
      0 as depth
    from public.comments c
    where c.article_id = p_article_id
      and c.parent_id is null

    union all

    select
      c.id,
      c.article_id,
      c.profile_id,
      c.content,
      c.created_at,
      c.parent_id,
      ct.depth + 1
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

create or replace function public.award_xp(
  p_profile_id uuid,
  p_xp_amount integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  new_xp integer;
  new_level integer;
begin
  insert into public.user_points (profile_id, total_xp, level)
  values (p_profile_id, 0, 1)
  on conflict (profile_id) do nothing;

  update public.user_points
  set total_xp = total_xp + p_xp_amount,
      updated_at = now()
  where profile_id = p_profile_id
  returning total_xp into new_xp;

  new_level := floor(sqrt(new_xp::double precision / 100.0)) + 1;
  if new_level < 1 then
    new_level := 1;
  end if;

  update public.user_points
  set level = new_level
  where profile_id = p_profile_id;

  insert into public.user_badges (profile_id, badge_id)
  select p_profile_id, b.id
  from public.badges b
  where b.xp_required <= new_xp
  on conflict (profile_id, badge_id) do nothing;
end;
$$;

insert into public.badges (slug, label, description, icon_emoji, xp_required)
values
  ('bronze-creator', 'Nhà Sáng Tạo Đồng', 'Đạt 50 XP đóng góp xây dựng tạp chí.', '💾', 50),
  ('silver-creator', 'Nhà Sáng Tạo Bạc', 'Đạt 200 XP đóng góp chất lượng cao.', '📼', 200),
  ('gold-creator', 'Nhà Sáng Tạo Vàng', 'Đạt 1000 XP huyền thoại Vaporwave.', '👑', 1000)
on conflict (slug) do update set
  label = excluded.label,
  description = excluded.description,
  icon_emoji = excluded.icon_emoji,
  xp_required = excluded.xp_required;

create or replace function public.handle_comment_xp()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  perform public.award_xp(new.profile_id, 10);
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
security definer
set search_path = public, pg_catalog
as $$
begin
  perform public.award_xp(new.profile_id, 2);
  return new;
end;
$$;

drop trigger if exists on_reaction_created_xp on public.reactions;
create trigger on_reaction_created_xp
  after insert on public.reactions
  for each row execute procedure public.handle_reaction_xp();

create or replace function public.handle_comment_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  parent_author uuid;
begin
  if new.parent_id is not null then
    select c.profile_id
    into parent_author
    from public.comments c
    where c.id = new.parent_id;

    if parent_author is not null and parent_author <> new.profile_id then
      insert into public.notifications (recipient, type, payload)
      values (
        parent_author,
        'comment_reply',
        jsonb_build_object(
          'article_id', new.article_id,
          'comment_id', new.id,
          'sender_name', (
            select p.full_name
            from public.profiles p
            where p.id = new.profile_id
          )
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

create or replace function public.count_admins()
returns integer
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select count(*)::integer
  from public.profiles
  where role = 'admin'
    and coalesce(is_banned, false) = false;
$$;

-- ------------------------------------------------------------
-- 7. Anti-spam triggers
-- ------------------------------------------------------------

create or replace function public.check_comment_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  recent_count integer;
  user_role text;
begin
  select p.role into user_role
  from public.profiles p
  where p.id = auth.uid();

  if user_role in ('admin', 'editor') then
    return new;
  end if;

  select count(*) into recent_count
  from public.comments c
  where c.profile_id = auth.uid()
    and c.created_at > now() - interval '10 seconds';

  if recent_count > 0 then
    raise exception 'Bình luận quá nhanh! Vui lòng đợi 10 giây giữa mỗi lần bình luận.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_check_comment_rate_limit on public.comments;
create trigger trg_check_comment_rate_limit
  before insert on public.comments
  for each row execute procedure public.check_comment_rate_limit();

create or replace function public.check_submission_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  recent_count integer;
  user_role text;
begin
  select p.role into user_role
  from public.profiles p
  where p.id = auth.uid();

  if user_role in ('admin', 'editor') then
    return new;
  end if;

  select count(*) into recent_count
  from public.submissions s
  where s.author_id = auth.uid()
    and s.created_at > now() - interval '3 minutes';

  if recent_count > 0 then
    raise exception 'Gửi tranh quá nhanh! Vui lòng đợi 3 phút giữa mỗi lần đăng tác phẩm.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_check_submission_rate_limit on public.submissions;
create trigger trg_check_submission_rate_limit
  before insert on public.submissions
  for each row execute procedure public.check_submission_rate_limit();

-- ------------------------------------------------------------
-- 8. Supabase Realtime registrations
-- ------------------------------------------------------------

do $$
begin
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

  begin
    alter publication supabase_realtime add table public.favorites;
  exception when others then null;
  end;
end;
$$;

commit;

-- ============================================================
-- End of rebuild script
-- ============================================================

