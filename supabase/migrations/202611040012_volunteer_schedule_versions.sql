-- Immutable-by-date schedule snapshots so roster history is not rewritten by later edits.
create table public.volunteer_schedule_versions (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  group_id uuid not null,
  valid_from date not null,
  valid_to date,
  group_snapshot jsonb not null,
  members_snapshot jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint volunteer_schedule_versions_date_range check (valid_to is null or valid_to >= valid_from),
  constraint volunteer_schedule_versions_group_fk
    foreign key (workspace_id, group_id)
    references public.volunteer_groups(workspace_id, id)
    on delete cascade
);
create unique index volunteer_schedule_versions_start_idx
  on public.volunteer_schedule_versions(workspace_id, group_id, valid_from);
create index volunteer_schedule_versions_lookup_idx
  on public.volunteer_schedule_versions(workspace_id, valid_from, valid_to);
alter table public.volunteer_schedule_versions enable row level security;
create policy "workspace members read schedule versions"
  on public.volunteer_schedule_versions for select to authenticated
  using (private.has_workspace_role(workspace_id));
grant select on public.volunteer_schedule_versions to authenticated;
revoke insert, update, delete, truncate on public.volunteer_schedule_versions from anon, authenticated;

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
  effective_date date := (clock_timestamp() at time zone 'Asia/Jakarta')::date;
  group_row public.volunteer_groups%rowtype;
  group_json jsonb;
  members_json jsonb;
begin
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

create or replace function private.capture_volunteer_group_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_volunteer_schedule_version(old.workspace_id, old.id, true);
    return old;
  end if;
  perform private.refresh_volunteer_schedule_version(new.workspace_id, new.id, false);
  return new;
end;
$$;

create or replace function private.capture_volunteer_member_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_volunteer_schedule_version(old.workspace_id, old.group_id, false);
    return old;
  end if;
  perform private.refresh_volunteer_schedule_version(new.workspace_id, new.group_id, false);
  return new;
end;
$$;

revoke all on function private.capture_volunteer_group_version() from public;
revoke all on function private.capture_volunteer_member_version() from public;

create trigger volunteer_groups_version_snapshot
  after insert or update or delete on public.volunteer_groups
  for each row execute function private.capture_volunteer_group_version();
create trigger volunteer_group_members_version_snapshot
  after insert or delete on public.volunteer_group_members
  for each row execute function private.capture_volunteer_member_version();

-- Seed a baseline for any groups already present when this migration is installed.
do $$
declare r record;
begin
  for r in select workspace_id, id from public.volunteer_groups loop
    perform private.refresh_volunteer_schedule_version(r.workspace_id, r.id, false);
  end loop;
end;
$$;

comment on table public.volunteer_schedule_versions is
  'Effective-dated snapshots of recurring group configuration and member details for historically stable daily rosters.';
