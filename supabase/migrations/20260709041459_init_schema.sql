create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New Chat',
  summary text,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant', 'tool')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.chat_sessions(id) on delete set null,
  message_id uuid references public.chat_messages(id) on delete set null,
  label text,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_sessions_user_id on public.chat_sessions(user_id);
create index if not exists idx_chat_sessions_updated_at on public.chat_sessions(updated_at desc);
create index if not exists idx_chat_messages_session_id on public.chat_messages(session_id);
create index if not exists idx_chat_messages_user_id on public.chat_messages(user_id);
create index if not exists idx_chat_messages_created_at on public.chat_messages(created_at);
create index if not exists idx_saved_items_user_id on public.saved_items(user_id);

alter table public.profiles enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.saved_items enable row level security;

create policy "users can view own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "users can insert own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "users can view own chat sessions"
on public.chat_sessions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users can insert own chat sessions"
on public.chat_sessions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users can update own chat sessions"
on public.chat_sessions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users can delete own chat sessions"
on public.chat_sessions
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "users can view own chat messages"
on public.chat_messages
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users can insert own chat messages"
on public.chat_messages
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users can update own chat messages"
on public.chat_messages
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users can delete own chat messages"
on public.chat_messages
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "users can view own saved items"
on public.saved_items
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users can insert own saved items"
on public.saved_items
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users can update own saved items"
on public.saved_items
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users can delete own saved items"
on public.saved_items
for delete
to authenticated
using ((select auth.uid()) = user_id);
