-- Simplify volunteer records to the operational fields actually used by this workspace.
-- Historical audit JSON remains intact; current volunteer rows no longer carry unused contact/code/title fields.
alter table public.volunteers
  drop column employee_code,
  drop column phone,
  drop column position_title,
  rename column daily_rate to daily_wage;

comment on column public.volunteers.daily_wage is
  'Daily wage amount in thousands of Indonesian rupiah, preserving existing stored values.';
