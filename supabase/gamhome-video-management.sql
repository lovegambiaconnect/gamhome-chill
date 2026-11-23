-- Gamhome&Chill creator video management permissions (applied 2026-11-23)
alter table public.gamhome_videos enable row level security;
grant update (title, description) on public.gamhome_videos to authenticated;
grant delete on public.gamhome_videos to authenticated;
drop policy if exists "Creators can update their own videos" on public.gamhome_videos;
create policy "Creators can update their own videos" on public.gamhome_videos for update to authenticated using (creator_id = auth.uid()) with check (creator_id = auth.uid());
drop policy if exists "Creators can delete their own videos" on public.gamhome_videos;
create policy "Creators can delete their own videos" on public.gamhome_videos for delete to authenticated using (creator_id = auth.uid());
