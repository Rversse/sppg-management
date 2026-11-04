-- Append-only audit history for recurring volunteer groups and membership changes.
create table public.volunteer_schedule_audit (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entity_type text not null check (entity_type in ('group','membership')),
  entity_id uuid not null,
  group_id uuid,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  before_data jsonb,
  after_data jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now()
);

create index volunteer_schedule_audit_workspace_time_idx
  on public.volunteer_schedule_audit(workspace_id, occurred_at desc);
create index volunteer_schedule_audit_group_time_idx
  on public.volunteer_schedule_audit(workspace_id, group_id, occurred_at desc);

alter table public.volunteer_schedule_audit enable row level security;
create policy "workforce managers read schedule history"
  on public.volunteer_schedule_audit for select to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','hr']::public.workspace_role[]));
grant select on public.volunteer_schedule_audit to authenticated;
revoke insert, update, delete, truncate on public.volunteer_schedule_audit from anon, authenticated;

create or replace function private.capture_volunteer_group_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_data jsonb;
  new_data jsonb;
  row_data jsonb;
  workspace_key uuid;
  group_key uuid;
begin
  if tg_op <> 'INSERT' then old_data := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then new_data := to_jsonb(new); end if;
  row_data := coalesce(new_data, old_data);
  workspace_key := (row_data ->> 'workspace_id')::uuid;
  group_key := (row_data ->> 'id')::uuid;

  insert into public.volunteer_schedule_audit (
    workspace_id, entity_type, entity_id, group_id, action,
    before_data, after_data, actor_id
  ) values (
    workspace_key, 'group', group_key, group_key, tg_op,
    old_data, new_data, (select auth.uid())
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function private.capture_volunteer_group_member_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_data jsonb;
  new_data jsonb;
  row_data jsonb;
  workspace_key uuid;
  volunteer_key uuid;
  group_key uuid;
begin
  if tg_op <> 'INSERT' then old_data := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then new_data := to_jsonb(new); end if;
  row_data := coalesce(new_data, old_data);
  workspace_key := (row_data ->> 'workspace_id')::uuid;
  volunteer_key := (row_data ->> 'volunteer_id')::uuid;
  group_key := (row_data ->> 'group_id')::uuid;

  insert into public.volunteer_schedule_audit (
    workspace_id, entity_type, entity_id, group_id, action,
    before_data, after_data, actor_id
  ) values (
    workspace_key, 'membership', volunteer_key, group_key, tg_op,
    old_data, new_data, (select auth.uid())
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.capture_volunteer_group_change() from public;
revoke all on function private.capture_volunteer_group_member_change() from public;

create trigger volunteer_groups_audit
  after insert or update or delete on public.volunteer_groups
  for each row execute function private.capture_volunteer_group_change();
create trigger volunteer_group_members_audit
  after insert or delete on public.volunteer_group_members
  for each row execute function private.capture_volunteer_group_member_change();

comment on table public.volunteer_schedule_audit is
  'Append-only audit trail for recurring volunteer group and membership changes; not attendance or payroll.';
