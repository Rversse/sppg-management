-- Simplify volunteer records to the operational fields used by this workspace.
-- Existing daily_rate values are stored in thousands of IDR (120 = Rp120,000);
-- preserve those values so no imported payroll data is changed.
alter table public.volunteers
  drop column employee_code,
  drop column phone,
  drop column position_title;

alter table public.volunteers
  rename column daily_rate to daily_wage;

comment on column public.volunteers.daily_wage is
  'Daily wage stored in thousands of Indonesian rupiah for compatibility with existing imported values.';
