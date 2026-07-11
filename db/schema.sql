create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table users add column if not exists name text;
alter table users add column if not exists date_of_birth date;
alter table users add column if not exists phone text;
alter table users add column if not exists address text;
alter table users add column if not exists nickname text;
alter table users add column if not exists custom_instructions text;

create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null default '새 채팅',
  is_pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_sessions_user_id on chat_sessions(user_id);
create index if not exists idx_chat_messages_session_id on chat_messages(session_id);
create index if not exists idx_chat_messages_created_at on chat_messages(created_at);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_created_at on feedback(created_at desc);
