alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;

$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );

$$;

create policy "admins can view all chat sessions"
on public.chat_sessions
for select
to authenticated
using (public.is_admin());

create policy "admins can view all chat messages"
on public.chat_messages
for select
to authenticated
using (public.is_admin());

create policy "admins can view all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());