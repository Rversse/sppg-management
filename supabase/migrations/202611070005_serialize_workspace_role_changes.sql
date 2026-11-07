-- Serialize role changes within a workspace so concurrent owner demotions
-- cannot race past the final-owner invariant.
create or replace function public.update_workspace_member_role(
  p_target_user_id uuid,
  p_new_role public.workspace_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_workspace_id uuid;
  actor_role public.workspace_role;
  target_role public.workspace_role;
  owner_count integer;
begin
  select wm.workspace_id, wm.role into current_workspace_id, actor_role
  from public.workspace_memberships wm
  where wm.user_id = auth.uid()
  order by wm.created_at asc
  limit 1;

  if current_workspace_id is null or actor_role not in ('owner','admin') then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_workspace_id::text, 0));

  select wm.role into target_role
  from public.workspace_memberships wm
  where wm.workspace_id = current_workspace_id and wm.user_id = p_target_user_id
  for update;

  if target_role is null then raise exception 'Anggota tidak ditemukan' using errcode = 'P0002'; end if;
  if actor_role = 'admin' and (target_role in ('owner','admin') or p_new_role in ('owner','admin')) then
    raise exception 'Admin hanya dapat mengatur role operasional anggota' using errcode = '42501';
  end if;

  if target_role = 'owner' and p_new_role <> 'owner' then
    select count(*) into owner_count from public.workspace_memberships wm
    where wm.workspace_id = current_workspace_id and wm.role = 'owner';
    if owner_count <= 1 then raise exception 'Workspace harus memiliki minimal satu owner' using errcode = '23514'; end if;
    if actor_role <> 'owner' then raise exception 'Hanya owner yang dapat mengubah role owner' using errcode = '42501'; end if;
  end if;

  update public.workspace_memberships set role = p_new_role
  where workspace_id = current_workspace_id and user_id = p_target_user_id;
end;
$$;
revoke all on function public.update_workspace_member_role(uuid, public.workspace_role) from public, anon;
grant execute on function public.update_workspace_member_role(uuid, public.workspace_role) to authenticated;