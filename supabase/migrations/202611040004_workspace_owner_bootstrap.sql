-- Secure first-party workspace bootstrap for authenticated users.
-- The caller receives owner membership atomically; clients cannot write memberships directly.

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
