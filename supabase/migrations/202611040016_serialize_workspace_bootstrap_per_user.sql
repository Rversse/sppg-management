-- Serialize initial workspace creation per user to prevent concurrent duplicate workspaces.
create or replace function public.create_workspace_for_current_user(workspace_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  new_workspace_id uuid;
  normalized_name text := btrim(workspace_name);
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if normalized_name is null or char_length(normalized_name) < 2 or char_length(normalized_name) > 120 then
    raise exception 'Nama workspace harus 2 sampai 120 karakter' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller_id::text, 0));

  if exists (
    select 1 from public.workspace_memberships where user_id = caller_id
  ) then
    raise exception 'Akun ini sudah terhubung ke workspace. Hubungi owner untuk akses workspace tambahan.'
      using errcode = '23505';
  end if;

  insert into public.workspaces (name)
  values (normalized_name)
  returning id into new_workspace_id;

  insert into public.workspace_memberships (workspace_id, user_id, role)
  values (new_workspace_id, caller_id, 'owner');

  return new_workspace_id;
end;
$$;

revoke all on function public.create_workspace_for_current_user(text) from public;
revoke all on function public.create_workspace_for_current_user(text) from anon;
grant execute on function public.create_workspace_for_current_user(text) to authenticated;
