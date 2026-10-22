-- Run in the Supabase SQL editor. Public profile fields are kept separate from auth.users.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 80),
  title text not null default '' check (char_length(title) <= 80),
  location text not null default '' check (char_length(location) <= 100),
  bio text not null default '' check (char_length(bio) <= 500),
  skills text[] not null default '{}',
  website text check (website is null or website ~ '^https://'),
  github_url text check (github_url is null or github_url ~ '^https://'),
  linkedin_url text check (linkedin_url is null or linkedin_url ~ '^https://'),
  avatar_url text check (avatar_url is null or avatar_url ~ '^https://'),
  availability text not null default 'Available' check (availability in ('Available','Open to offers','Booked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists avatar_url text check (avatar_url is null or avatar_url ~ '^https://');

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  description text not null check (char_length(description) between 10 and 500),
  technologies text[] not null default '{}',
  screenshot_url text check (screenshot_url is null or screenshot_url ~ '^https://'),
  repository_url text check (repository_url is null or repository_url ~ '^https://'),
  demo_url text check (demo_url is null or demo_url ~ '^https://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint distinct_connection_people check (sender_id <> recipient_id),
  constraint unique_connection_pair unique (sender_id, recipient_id)
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 100),
  company text not null check (char_length(company) between 2 and 100),
  location text not null check (char_length(location) between 2 and 100),
  employment_type text not null check (employment_type in ('Full-time','Contract','Part-time','Freelance')),
  description text not null check (char_length(description) between 20 and 3000),
  skills text[] not null default '{}',
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists jobs_open_created_idx on public.jobs(status, created_at desc);
create index if not exists jobs_skills_idx on public.jobs using gin(skills);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.ai_request_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0
);
alter table public.ai_request_limits enable row level security;
create or replace function public.consume_ai_request() returns boolean
language plpgsql security definer set search_path = '' as $$
declare current_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.ai_request_limits(user_id, window_started_at, request_count)
  values (auth.uid(), now(), 1)
  on conflict (user_id) do update set
    window_started_at = case when now() - public.ai_request_limits.window_started_at >= interval '1 minute' then now() else public.ai_request_limits.window_started_at end,
    request_count = case when now() - public.ai_request_limits.window_started_at >= interval '1 minute' then 1 else public.ai_request_limits.request_count + 1 end
  returning request_count into current_count;
  return current_count <= 12;
end; $$;
revoke all on function public.consume_ai_request() from public, anon;
grant execute on function public.consume_ai_request() to authenticated;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;
create index if not exists profiles_location_idx on public.profiles(location);
create index if not exists profiles_skills_idx on public.profiles using gin(skills);
create index if not exists profiles_name_search_idx on public.profiles using gin(to_tsvector('simple', full_name || ' ' || title || ' ' || bio));
create index if not exists projects_owner_idx on public.projects(owner_id, created_at desc);
create index if not exists connection_recipient_idx on public.connection_requests(recipient_id, status);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
-- Create a public profile on sign-up so the member can receive requests before editing it.
create or replace function public.create_profile_for_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 'New member'))
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users
for each row execute function public.create_profile_for_new_user();
drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at before update on public.projects for each row execute function public.touch_updated_at();
drop trigger if exists connection_touch_updated_at on public.connection_requests;
create trigger connection_touch_updated_at before update on public.connection_requests for each row execute function public.touch_updated_at();
drop trigger if exists jobs_touch_updated_at on public.jobs;
create trigger jobs_touch_updated_at before update on public.jobs for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.connection_requests enable row level security;
alter table public.jobs enable row level security;
alter table public.admin_users enable row level security;

-- Profiles and projects are public portfolio data. Only the account owner may write.
drop policy if exists "Anyone can read profiles" on public.profiles;
create policy "Anyone can read profiles" on public.profiles for select using (true);
drop policy if exists "Owners insert own profile" on public.profiles;
create policy "Owners insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "Owners update own profile" on public.profiles;
create policy "Owners update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "Anyone can read projects" on public.projects;
create policy "Anyone can read projects" on public.projects for select using (true);
drop policy if exists "Owners create projects" on public.projects;
create policy "Owners create projects" on public.projects for insert to authenticated with check (auth.uid() = owner_id);
drop policy if exists "Owners update projects" on public.projects;
create policy "Owners update projects" on public.projects for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "Owners delete projects" on public.projects;
create policy "Owners delete projects" on public.projects for delete to authenticated using (auth.uid() = owner_id);

drop policy if exists "Anyone can read open jobs" on public.jobs;
create policy "Anyone can read open jobs" on public.jobs for select using (status = 'open' or public.is_admin());
drop policy if exists "Members create jobs" on public.jobs;
create policy "Members create jobs" on public.jobs for insert to authenticated with check (auth.uid() = owner_id);
drop policy if exists "Owners update jobs" on public.jobs;
create policy "Owners update jobs" on public.jobs for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "Owners delete jobs" on public.jobs;
create policy "Owners delete jobs" on public.jobs for delete to authenticated using (auth.uid() = owner_id);
drop policy if exists "Admins delete jobs" on public.jobs;
create policy "Admins delete jobs" on public.jobs for delete to authenticated using (public.is_admin());

drop policy if exists "Users can read own admin status" on public.admin_users;
create policy "Users can read own admin status" on public.admin_users for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Admins can read profiles" on public.profiles;
create policy "Admins can read profiles" on public.profiles for select to authenticated using (public.is_admin());
drop policy if exists "Admins can delete profiles" on public.profiles;
create policy "Admins can delete profiles" on public.profiles for delete to authenticated using (public.is_admin());

-- Private resumes use one fixed PDF path per account: <auth uid>/resume.pdf.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 8388608, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 8388608, allowed_mime_types = array['application/pdf'];
drop policy if exists "Owners read own resumes" on storage.objects;
create policy "Owners read own resumes" on storage.objects for select to authenticated using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Owners upload own resumes" on storage.objects;
create policy "Owners upload own resumes" on storage.objects for insert to authenticated with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Owners update own resumes" on storage.objects;
create policy "Owners update own resumes" on storage.objects for update to authenticated using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Owners delete own resumes" on storage.objects;
create policy "Owners delete own resumes" on storage.objects for delete to authenticated using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

-- Participants can read requests. Only senders create; recipients may accept/decline;
-- senders may withdraw. The restrictive checks keep either party from changing the other.
drop policy if exists "Participants read requests" on public.connection_requests;
create policy "Participants read requests" on public.connection_requests for select to authenticated using (auth.uid() = sender_id or auth.uid() = recipient_id);
drop policy if exists "Senders create requests" on public.connection_requests;
create policy "Senders create requests" on public.connection_requests for insert to authenticated with check (auth.uid() = sender_id and status = 'pending');
drop policy if exists "Recipients respond to requests" on public.connection_requests;
create policy "Recipients respond to requests" on public.connection_requests for update to authenticated using (auth.uid() = recipient_id and status = 'pending') with check (auth.uid() = recipient_id and status in ('accepted','declined'));
drop policy if exists "Senders withdraw requests" on public.connection_requests;
create policy "Senders withdraw requests" on public.connection_requests for update to authenticated using (auth.uid() = sender_id and status = 'pending') with check (auth.uid() = sender_id and status = 'withdrawn');


-- Private developer workspace: projects, tasks, learning goals, and activity.
create table if not exists public.workspace_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 100),
  summary text not null check (char_length(summary) between 8 and 500),
  status text not null default 'active' check (status in ('planning','active','paused','complete')),
  due_date date,
  technologies text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists workspace_projects_owner_idx on public.workspace_projects(owner_id, created_at desc);

create table if not exists public.workspace_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.workspace_projects(id) on delete set null,
  title text not null check (char_length(title) between 3 and 140),
  due_date date,
  is_completed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists workspace_tasks_owner_idx on public.workspace_tasks(owner_id, is_completed, created_at desc);

create table if not exists public.learning_goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  category text not null check (category in ('DSA','Learning','Skill')),
  unit text not null default 'sessions' check (char_length(unit) between 1 and 30),
  target integer not null check (target between 1 and 100000),
  progress integer not null default 0 check (progress >= 0 and progress <= target),
  updated_at timestamptz not null default now()
);
create index if not exists learning_goals_owner_idx on public.learning_goals(owner_id, updated_at desc);

create table if not exists public.workspace_notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 300),
  type text not null default 'activity',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists workspace_notifications_owner_idx on public.workspace_notifications(owner_id, created_at desc);

alter table public.workspace_projects enable row level security;
alter table public.workspace_tasks enable row level security;
alter table public.learning_goals enable row level security;
alter table public.workspace_notifications enable row level security;

drop policy if exists "Members read own workspace projects" on public.workspace_projects;
create policy "Members read own workspace projects" on public.workspace_projects for select to authenticated using (auth.uid() = owner_id);
drop policy if exists "Members create own workspace projects" on public.workspace_projects;
create policy "Members create own workspace projects" on public.workspace_projects for insert to authenticated with check (auth.uid() = owner_id);
drop policy if exists "Members update own workspace projects" on public.workspace_projects;
create policy "Members update own workspace projects" on public.workspace_projects for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "Members delete own workspace projects" on public.workspace_projects;
create policy "Members delete own workspace projects" on public.workspace_projects for delete to authenticated using (auth.uid() = owner_id);

drop policy if exists "Members read own workspace tasks" on public.workspace_tasks;
create policy "Members read own workspace tasks" on public.workspace_tasks for select to authenticated using (auth.uid() = owner_id);
drop policy if exists "Members create own workspace tasks" on public.workspace_tasks;
create policy "Members create own workspace tasks" on public.workspace_tasks for insert to authenticated with check (auth.uid() = owner_id and (project_id is null or exists (select 1 from public.workspace_projects p where p.id = project_id and p.owner_id = auth.uid())));
drop policy if exists "Members update own workspace tasks" on public.workspace_tasks;
create policy "Members update own workspace tasks" on public.workspace_tasks for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id and (project_id is null or exists (select 1 from public.workspace_projects p where p.id = project_id and p.owner_id = auth.uid())));
drop policy if exists "Members delete own workspace tasks" on public.workspace_tasks;
create policy "Members delete own workspace tasks" on public.workspace_tasks for delete to authenticated using (auth.uid() = owner_id);

drop policy if exists "Members read own learning goals" on public.learning_goals;
create policy "Members read own learning goals" on public.learning_goals for select to authenticated using (auth.uid() = owner_id);
drop policy if exists "Members create own learning goals" on public.learning_goals;
create policy "Members create own learning goals" on public.learning_goals for insert to authenticated with check (auth.uid() = owner_id);
drop policy if exists "Members update own learning goals" on public.learning_goals;
create policy "Members update own learning goals" on public.learning_goals for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "Members delete own learning goals" on public.learning_goals;
create policy "Members delete own learning goals" on public.learning_goals for delete to authenticated using (auth.uid() = owner_id);

drop policy if exists "Members read own workspace notifications" on public.workspace_notifications;
create policy "Members read own workspace notifications" on public.workspace_notifications for select to authenticated using (auth.uid() = owner_id);
drop policy if exists "Members create own workspace notifications" on public.workspace_notifications;
create policy "Members create own workspace notifications" on public.workspace_notifications for insert to authenticated with check (auth.uid() = owner_id);
drop policy if exists "Members mark own workspace notifications read" on public.workspace_notifications;
create policy "Members mark own workspace notifications read" on public.workspace_notifications for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "Members delete own workspace notifications" on public.workspace_notifications;
create policy "Members delete own workspace notifications" on public.workspace_notifications for delete to authenticated using (auth.uid() = owner_id);
