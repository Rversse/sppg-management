-- Use each workspace's configured timezone when deciding the effective date
-- of recurring schedule snapshots. The original function assumed Asia/Jakarta.
create or replace function private.refresh_volunteer_schedule_version(
  workspace_key uuid,
  group_key uuid,
  was_deleted boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  timezone_name text;
  effective_date date;
  group_row public.volunteer_groups%rowtype;
  group_json jsonb;
  members_json jsonb;
begin
  select coalesce(w.timezone, 'Asia/Jakarta')
    into timezone_name
    from public.workspaces w
    where w.id = workspace_key;

  if not found then
    timezone_name := 'Asia/Jakarta';
  end if;

  effective_date := (clock_timestamp() at time zone timezone_name)::date;

  if was_deleted then
    update public.volunteer_schedule_versions
      set valid_to = effective_date - 1
      where workspace_id = workspace_key and group_id = group_key
        and valid_to is null and valid_from < effective_date;
    delete from public.volunteer_schedule_versions
      where workspace_id = workspace_key and group_id = group_key
        and valid_from = effective_date;
    return;
  end if;

  select * into group_row
    from public.volunteer_groups
    where workspace_id = workspace_key and id = group_key;
  if not found then return; end if;

  group_json := jsonb_build_object(
    'id', group_row.id,
    'name', group_row.name,
    'section_id', group_row.section_id,
    'start_time', group_row.start_time,
    'end_time', group_row.end_time,
    'weekdays', group_row.weekdays,
    'notes', group_row.notes
  );

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', v.id,
    'full_name', v.full_name,
    'section_id', v.section_id,
    'daily_wage', v.daily_wage,
    'status', v.status
  ) order by v.full_name), '[]'::jsonb)
  into members_json
  from public.volunteer_group_members m
  join public.volunteers v
    on v.workspace_id = m.workspace_id and v.id = m.volunteer_id
  where m.workspace_id = workspace_key and m.group_id = group_key;

  update public.volunteer_schedule_versions
    set valid_to = effective_date - 1
    where workspace_id = workspace_key and group_id = group_key
      and valid_to is null and valid_from < effective_date;

  insert into public.volunteer_schedule_versions (
    workspace_id, group_id, valid_from, valid_to, group_snapshot, members_snapshot
  ) values (
    workspace_key, group_key, effective_date, null, group_json, members_json
  )
  on conflict (workspace_id, group_id, valid_from)
  do update set
    valid_to = null,
    group_snapshot = excluded.group_snapshot,
    members_snapshot = excluded.members_snapshot;
end;
$$;

revoke all on function private.refresh_volunteer_schedule_version(uuid, uuid, boolean) from public;
