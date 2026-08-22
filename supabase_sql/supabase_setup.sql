create table if not exists public.profiles (  
  id uuid not null references auth.users on delete cascade primary key,  
  email text not null,  
  full_name text,  
  avatar_url text,  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null  
);

alter table public.profiles enable row level security;

drop policy if exists "Allow public read profiles" on public.profiles;
create policy "Allow public read profiles" on public.profiles for select using (true);

drop policy if exists "Allow user update own profile" on public.profiles;
create policy "Allow user update own profile" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_google_user()  
returns trigger  
language plpgsql  
security definer set search_path = ''  
as $$  
begin  
  insert into public.profiles (id, email, full_name, avatar_url)  
  values (  
    new.id,  
    new.email,  
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),  
    new.raw_user_meta_data ->> 'avatar_url'  
  );  
  return new;  
end;  
$$;

drop trigger if exists on_auth_user_created_google on auth.users;

create trigger on_auth_user_created_google  
  after insert on auth.users  
  for each row execute procedure public.handle_new_google_user();

create table if not exists public.comments (  
  id uuid default gen_random_uuid() primary key,  
  article_id text not null,  
  profile_id uuid references public.profiles(id) on delete cascade not null,  
  content text not null,  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null  
);

alter table public.comments enable row level security;

drop policy if exists "Allow public read comments" on public.comments;
create policy "Allow public read comments" on public.comments for select using (true);

drop policy if exists "Allow authenticated write own comments" on public.comments;
create policy "Allow authenticated write own comments" on public.comments for insert to authenticated with check (auth.uid() = profile_id);
