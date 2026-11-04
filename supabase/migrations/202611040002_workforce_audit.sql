-- Append-only change history for workforce and attendance records.

create table public.workforce_audit_log (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entity_type text not null check (entity_type in ('volunteer', 'attendance', 'section')),
  entity_id uuid not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  before_data jsonb,
  after_data jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now()
);

create index workforce_audit_workspace_time_idx
  on public.workforce_audit_log(workspace_id, occurred_at desc);

alter table public.workforce_audit_log enable row level security;

create policy "workforce managers can read audit history"
  on public.workforce_audit_log for select to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','hr']::public.workspace_role[]));

grant select on public.workforce_audit_log to authenticated;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.capture_workforce_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb;
  old_data jsonb;
  new_data jsonb;
  workspace_key uuid;
  entity_key uuid;
  entity_name text;
begin
  if tg_op = 'DELETE' then
    old_data := to_jsonb(old);
    row_data := old_data;
  else
    new_data := to_jsonb(new);
    row_data := new_data;
  end if;

  if tg_op <> 'INSERT' then
    old_data := to_jsonb(old);
  end if;

  if tg_op <> 'DELETE' then
    new_data := to_jsonb(new);
  end if;

  workspace_key := (row_data ->> 'workspace_id')::uuid;
  entity_key := (row_data ->> 'id')::uuid;
  entity_name := case tg_table_name
    when 'volunteers' then 'volunteer'
    when 'attendance_records' then 'attendance'
    when 'sections' then 'section'
    else tg_table_name
  end;

  insert into public.workforce_audit_log (
    workspace_id, entity_type, entity_id, action,
    before_data, after_data, actor_id
  ) values (
    workspace_key, entity_name, entity_key, tg_op,
    old_data, new_data, (select auth.uid())
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.touch_updated_at() from public;
revoke all on function private.capture_workforce_change() from public;

create trigger volunteers_touch_updated_at
  before update on public.volunteers
  for each row execute function private.touch_updated_at();
create trigger sections_touch_updated_at
  before update on public.sections
  for each row execute function private.touch_updated_at();
create trigger attendance_touch_updated_at
  before update on public.attendance_records
  for each row execute function private.touch_updated_at();

create trigger volunteers_audit
  after insert or update or delete on public.volunteers
  for each row execute function private.capture_workforce_change();
create trigger sections_audit
  after insert or update or delete on public.sections
  for each row execute function private.capture_workforce_change();
create trigger attendance_audit
  after insert or update or delete on public.attendance_records
  for each row execute function private.capture_workforce_change();

-- Prevent clients from modifying or deleting audit history directly.
revoke insert, update, delete, truncate on public.workforce_audit_log from anon, authenticated;
