-- Keep the first recorder immutable after an attendance row is created.
-- updated_by remains the field for subsequent corrections.
create or replace function private.preserve_attendance_original_recorder()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.recorded_by := old.recorded_by;
  return new;
end;
$$;

revoke all on function private.preserve_attendance_original_recorder() from public, anon, authenticated;

drop trigger if exists attendance_preserve_original_recorder on public.attendance_records;
create trigger attendance_preserve_original_recorder
before update on public.attendance_records
for each row execute function private.preserve_attendance_original_recorder();

comment on column public.attendance_records.recorded_by is
  'User who first recorded this attendance row; immutable on update. updated_by tracks later corrections.';
