-- Project S — full database schema.
-- Run this entire file in the Supabase SQL editor before using the app.

create table public.profiles (
  id uuid references auth.users primary key,
  username text unique not null,
  display_name text not null,
  avatar_color text not null default '#c084fc',
  accent_color text not null default '#c084fc',
  theme_preference text not null default 'system',
  xp integer not null default 0,
  created_at timestamptz default now()
);

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  invite_code text unique not null default substr(md5(random()::text), 1, 8),
  created_by uuid references public.profiles,
  created_at timestamptz default now()
);

create table public.community_members (
  community_id uuid references public.communities on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  role text not null default 'member',
  joined_at timestamptz default now(),
  primary key (community_id, user_id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities on delete cascade,
  slug text not null,
  label text not null,
  emoji text not null,
  color text not null,
  sort_order integer not null default 0,
  unique (community_id, slug)
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  community_id uuid references public.communities not null,
  date date not null,
  category_id uuid references public.categories not null,
  storage_path text not null,
  public_url text not null,
  created_at timestamptz default now()
);

create table public.ai_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  photo_id uuid references public.photos,
  session_type text not null,
  context jsonb,
  result jsonb,
  created_at timestamptz default now()
);

create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  event_type text not null,
  xp_awarded integer not null,
  metadata jsonb,
  created_at timestamptz default now()
);

create table public.badges (
  id text primary key,
  name text not null,
  description text not null,
  emoji text not null,
  condition_type text not null
);

create table public.user_badges (
  user_id uuid references public.profiles on delete cascade,
  badge_id text references public.badges,
  awarded_at timestamptz default now(),
  primary key (user_id, badge_id)
);

create table public.study_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  exam_name text not null,
  subject text not null,
  created_at timestamptz default now()
);

create table public.mcq_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  topic_id uuid references public.study_topics,
  photo_id uuid references public.photos,
  questions jsonb not null,
  answers jsonb,
  score integer,
  created_at timestamptz default now()
);

-- Seed badges
insert into public.badges (id, name, description, emoji, condition_type) values
  ('first_upload',  'First capture',   'Upload your first photo',                  '📸', 'upload_count'),
  ('week_streak',   'Week on fire',    '7 consecutive days with at least one upload','🔥', 'streak'),
  ('month_streak',  'Diamond month',   '30-day upload streak',                     '💎', 'streak'),
  ('gym_rat',       'Gym rat',         '20 gym uploads',                           '🏋️', 'category_count'),
  ('clean_eater',   'Clean eater',     '15 meal uploads',                          '🥗', 'category_count'),
  ('scholar',       'Scholar',         '10 study uploads',                         '📚', 'category_count'),
  ('perfect_quiz',  'Perfect score',   'Score 5/5 on any MCQ session',             '🎯', 'mcq'),
  ('all_rounder',   'All-rounder',     'Upload in all 3 default categories in one week', '⚡', 'variety'),
  ('level_5',       'Unstoppable',     'Reach Level 5',                            '🚀', 'xp');

-- ─── Row Level Security ──────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.categories enable row level security;
alter table public.photos enable row level security;
alter table public.ai_sessions enable row level security;
alter table public.xp_events enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.study_topics enable row level security;
alter table public.mcq_attempts enable row level security;

-- Helper: membership check without recursive RLS (security definer bypasses RLS)
create or replace function public.is_community_member(cid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.community_members
    where community_id = cid and user_id = auth.uid()
  );
$$;

create or replace function public.shares_community_with(other uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1
    from public.community_members a
    join public.community_members b on a.community_id = b.community_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- profiles: read own + fellow community members; write own
create policy "profiles_select" on public.profiles for select
  using (id = auth.uid() or public.shares_community_with(id));
create policy "profiles_insert" on public.profiles for insert
  with check (id = auth.uid());
create policy "profiles_update" on public.profiles for update
  using (id = auth.uid());

-- communities: members can read; any authed user can create; lookup by invite code handled via RPC below
create policy "communities_select" on public.communities for select
  using (public.is_community_member(id) or created_by = auth.uid());
create policy "communities_insert" on public.communities for insert
  with check (created_by = auth.uid());
create policy "communities_update" on public.communities for update
  using (created_by = auth.uid());

-- community_members: members see their communities' rosters; users join/leave themselves
create policy "members_select" on public.community_members for select
  using (user_id = auth.uid() or public.is_community_member(community_id));
create policy "members_insert" on public.community_members for insert
  with check (user_id = auth.uid());
create policy "members_delete" on public.community_members for delete
  using (user_id = auth.uid());

-- categories: readable by members; writable by community admins
create policy "categories_select" on public.categories for select
  using (public.is_community_member(community_id));
create policy "categories_insert" on public.categories for insert
  with check (public.is_community_member(community_id));
create policy "categories_update" on public.categories for update
  using (public.is_community_member(community_id));
create policy "categories_delete" on public.categories for delete
  using (public.is_community_member(community_id));

-- photos: readable by community members; users write their own
create policy "photos_select" on public.photos for select
  using (public.is_community_member(community_id));
create policy "photos_insert" on public.photos for insert
  with check (user_id = auth.uid() and public.is_community_member(community_id));
create policy "photos_update" on public.photos for update
  using (user_id = auth.uid());
create policy "photos_delete" on public.photos for delete
  using (user_id = auth.uid());

-- ai_sessions, xp_events, study_topics, mcq_attempts: own rows only
create policy "ai_sessions_own" on public.ai_sessions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "xp_events_select" on public.xp_events for select
  using (user_id = auth.uid() or public.shares_community_with(user_id));
create policy "xp_events_insert" on public.xp_events for insert
  with check (user_id = auth.uid());
create policy "study_topics_own" on public.study_topics for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "mcq_attempts_own" on public.mcq_attempts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- badges: readable by everyone authenticated
create policy "badges_select" on public.badges for select
  using (auth.role() = 'authenticated');

-- user_badges: own + community members (for leaderboard/profile views)
create policy "user_badges_select" on public.user_badges for select
  using (user_id = auth.uid() or public.shares_community_with(user_id));
create policy "user_badges_insert" on public.user_badges for insert
  with check (user_id = auth.uid());

-- ─── RPCs ────────────────────────────────────────────────────────────

-- Join a community by invite code (bypasses RLS to look up the code)
create or replace function public.join_community_by_code(code text)
returns uuid language plpgsql security definer as $$
declare cid uuid;
begin
  select id into cid from public.communities where invite_code = code;
  if cid is null then
    return null;
  end if;
  insert into public.community_members (community_id, user_id, role)
  values (cid, auth.uid(), 'member')
  on conflict do nothing;
  return cid;
end;
$$;

-- Preview a community by invite code (name + member count, no join)
create or replace function public.preview_community_by_code(code text)
returns table(id uuid, name text, member_count bigint)
language sql security definer stable as $$
  select c.id, c.name, count(m.user_id)
  from public.communities c
  left join public.community_members m on m.community_id = c.id
  where c.invite_code = code
  group by c.id, c.name;
$$;

-- Atomic XP increment
create or replace function public.increment_xp(uid uuid, amount integer)
returns void language sql security definer as $$
  update public.profiles set xp = xp + amount where id = uid;
$$;

-- Check username availability (bypasses profile RLS)
create or replace function public.is_username_taken(candidate text)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles where username = candidate);
$$;

-- ─── Storage ─────────────────────────────────────────────────────────
-- Bucket: photos (public read). Create via dashboard or:
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
on conflict (id) do nothing;

create policy "photos_bucket_read" on storage.objects for select
  using (bucket_id = 'photos');
create policy "photos_bucket_insert" on storage.objects for insert
  with check (bucket_id = 'photos' and auth.role() = 'authenticated');
create policy "photos_bucket_delete" on storage.objects for delete
  using (bucket_id = 'photos' and auth.role() = 'authenticated');

-- ─── Realtime ────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.photos;
alter publication supabase_realtime add table public.categories;
