grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.profiles to anon, authenticated;
grant select, insert, update, delete on public.chat_sessions to anon, authenticated;
grant select, insert, update, delete on public.chat_messages to anon, authenticated;
grant select, insert, update, delete on public.saved_items to anon, authenticated;

alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
