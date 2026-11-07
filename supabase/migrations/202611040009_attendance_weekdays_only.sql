alter table public.attendance_records
  add constraint attendance_weekdays_only
  check (extract(isodow from work_date) between 1 and 5);
comment on constraint attendance_weekdays_only on public.attendance_records is
  'Regular SPPG operations are scheduled Monday through Friday; Saturday and Sunday are holidays.';