-- Keep the current effective schedule snapshot aligned with edits to a scheduled volunteer's display and wage data.
create or replace function private.capture_volunteer_profile_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  membership_row record;
begin
  for membership_row in
    select workspace_id, group_id
    from public.volunteer_group_members
    where workspace_id = new.workspace_id
      and volunteer_id = new.id
  loop
    perform private.refresh_volunteer_schedule_version(
      membership_row.workspace_id,
      membership_row.group_id,
      false
    );
  end loop;
  return new;
end;
$$;

revoke all on function private.capture_volunteer_profile_version() from public;

create trigger volunteers_profile_version_snapshot
  after update of full_name, daily_wage, status, section_id
  on public.volunteers
  for each row
  when (
    old.full_name is distinct from new.full_name
    or old.daily_wage is distinct from new.daily_wage
    or old.status is distinct from new.status
    or old.section_id is distinct from new.section_id
  )
  execute function private.capture_volunteer_profile_version();
