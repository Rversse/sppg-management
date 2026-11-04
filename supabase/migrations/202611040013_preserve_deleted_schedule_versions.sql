-- Preserve schedule history after a live group is deleted.
alter table public.volunteer_schedule_versions
  drop constraint if exists volunteer_schedule_versions_group_fk;
