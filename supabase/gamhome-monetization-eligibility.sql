-- Gamhome&Chill: 20,000 qualified-view monetization eligibility and approval workflow.
-- Run only in the Gamhome&Chill Supabase project (cxqijbdtcaqyttbfzqds).

update public.gamhome_platform_settings
set qualified_streams_required = 20000, updated_at = now()
where id = 1;
alter table public.gamhome_platform_settings
  alter column qualified_streams_required set default 20000;

create table if not exists public.gamhome_monetization_applications (
  creator_id uuid primary key references public.gamhome_creators(user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  applied_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  admin_note text
);
alter table public.gamhome_monetization_applications enable row level security;
drop policy if exists "gamhome creators and admins read monetization applications" on public.gamhome_monetization_applications;
create policy "gamhome creators and admins read monetization applications"
  on public.gamhome_monetization_applications for select to authenticated
  using (creator_id = (select auth.uid()) or public.gamhome_is_admin());
revoke all on public.gamhome_monetization_applications from anon, authenticated;
grant select on public.gamhome_monetization_applications to authenticated;

-- Creators may edit their public profile, but cannot forge view totals, channel approval,
-- or monetization approval timestamps through the browser Data API.
revoke insert, update on public.gamhome_creators from authenticated;
grant insert (user_id, display_name) on public.gamhome_creators to authenticated;
grant update (display_name, bio, avatar_url, updated_at)
  on public.gamhome_creators to authenticated;

create or replace function public.gamhome_request_monetization()
returns public.gamhome_monetization_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_required integer;
  v_views bigint;
  v_app public.gamhome_monetization_applications;
begin
  if v_user is null then raise exception 'Sign in before applying for monetization'; end if;
  select qualified_streams_required into v_required
    from public.gamhome_platform_settings where id = 1;
  select qualified_streams into v_views
    from public.gamhome_creators where user_id = v_user;
  if not found then raise exception 'Create your creator channel before applying'; end if;
  if coalesce(v_views, 0) < coalesce(v_required, 20000) then
    raise exception 'You need % qualified views before applying', coalesce(v_required, 20000);
  end if;
  select * into v_app from public.gamhome_monetization_applications where creator_id = v_user;
  if found then
    if v_app.status = 'approved' then raise exception 'Your channel is already approved for monetization'; end if;
    if v_app.status = 'pending' then return v_app; end if;
    update public.gamhome_monetization_applications
      set status = 'pending', applied_at = now(), reviewed_at = null,
          reviewed_by = null, admin_note = null
      where creator_id = v_user returning * into v_app;
  else
    insert into public.gamhome_monetization_applications(creator_id)
      values (v_user) returning * into v_app;
  end if;
  return v_app;
end;
$$;
revoke all on function public.gamhome_request_monetization() from public, anon;
grant execute on function public.gamhome_request_monetization() to authenticated;

create or replace function public.gamhome_review_monetization(p_creator_id uuid, p_action text)
returns public.gamhome_monetization_applications
language plpgsql
security definer
set search_path = public
as $$
declare v_app public.gamhome_monetization_applications;
begin
  if not public.gamhome_is_admin() then raise exception 'Administrator access required'; end if;
  if p_action not in ('approve','reject') then raise exception 'Invalid monetization decision'; end if;
  update public.gamhome_monetization_applications
     set status = case when p_action = 'approve' then 'approved' else 'rejected' end,
         reviewed_at = now(), reviewed_by = auth.uid()
   where creator_id = p_creator_id and status = 'pending'
   returning * into v_app;
  if not found then raise exception 'Application not found or no longer pending'; end if;
  update public.gamhome_creators
     set monetization_approved_at = case when p_action = 'approve' then now() else null end,
         updated_at = now()
   where user_id = p_creator_id;
  update public.gamhome_videos
     set monetization_enabled = (p_action = 'approve'), updated_at = now()
   where creator_id = p_creator_id;
  return v_app;
end;
$$;
revoke all on function public.gamhome_review_monetization(uuid, text) from public, anon;
grant execute on function public.gamhome_review_monetization(uuid, text) to authenticated;

-- Monetization is off until a creator is approved. Prevent creators from self-approving
-- videos or enabling monetization by submitting modified API payloads.
alter table public.gamhome_videos
  alter column monetization_enabled set default false;
update public.gamhome_videos v
   set monetization_enabled = exists (
     select 1 from public.gamhome_creators c
      where c.user_id = v.creator_id and c.monetization_approved_at is not null
   );

create or replace function public.gamhome_enforce_video_approval()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.gamhome_is_admin() then
    if tg_op = 'INSERT' then
      new.moderation_status := 'pending';
      new.published_at := null;
    else
      new.moderation_status := old.moderation_status;
      new.published_at := old.published_at;
    end if;
  end if;
  new.monetization_enabled := exists (
    select 1 from public.gamhome_creators c
     where c.user_id = new.creator_id and c.monetization_approved_at is not null
  );
  return new;
end;
$$;
drop trigger if exists gamhome_enforce_video_approval on public.gamhome_videos;
create trigger gamhome_enforce_video_approval
before insert or update of creator_id, monetization_enabled, moderation_status, published_at
on public.gamhome_videos for each row
execute function public.gamhome_enforce_video_approval();
revoke all on function public.gamhome_enforce_video_approval() from public, anon, authenticated;
