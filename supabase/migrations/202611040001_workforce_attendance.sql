-- SPPG workforce and attendance foundation.
-- Apply only to the dedicated SPPG Management Supabase project after review.
-- This migration intentionally does not seed users or create public signup access.

create extension if not exists pgcrypto;

create type public.workspace_role as enum ('owner', 'admin', 'hr', 'finance', 'operations', 'viewer');
create type public.volunteer_status as enum ('active', 'inactive');
create type public.attendance_status as enum ('present', 'permission', 'sick', 'absent');

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  timezone text not null default 'Asia/Jakarta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_memberships (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name),
  unique (workspace_id, id)
);

create table public.volunteers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  section_id uuid,
  employee_code text,
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  phone text,
  position_title text,
  daily_rate numeric(14,2) check (daily_rate is null or daily_rate >= 0),
  status public.volunteer_status not null default 'active',
  joined_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint volunteers_section_workspace_fk
    foreign key (workspace_id, section_id)
    references public.sections(workspace_id, id)
    on delete set null (section_id),
  unique (workspace_id, id),
  unique (workspace_id, employee_code)
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  volunteer_id uuid not null,
  work_date date not null,
  status public.attendance_status not null,
  clock_in time,
  clock_out time,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  recorded_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint attendance_volunteer_workspace_fk
    foreign key (workspace_id, volunteer_id)
    references public.volunteers(workspace_id, id)
    on delete cascade,
  constraint attendance_clock_order check (
    clock_in is null or clock_out is null or clock_out >= clock_in
  ),
  unique (workspace_id, volunteer_id, work_date)
);

create index volunteers_workspace_status_idx on public.volunteers(workspace_id, status);
create index volunteers_workspace_section_idx on public.volunteers(workspace_id, section_id);
create index attendance_workspace_date_idx on public.attendance_records(workspace_id, work_date);
create index attendance_volunteer_date_idx on public.attendance_records(volunteer_id, work_date desc);

-- Private helper avoids recursive membership-table RLS policies.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.has_workspace_role(
  target_workspace_id uuid,
  allowed_roles public.workspace_role[] default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = target_workspace_id
      and membership.user_id = (select auth.uid())
      and (allowed_roles is null or membership.role = any(allowed_roles))
  );
$$;

revoke all on function private.has_workspace_role(uuid, public.workspace_role[]) from public;
grant execute on function private.has_workspace_role(uuid, public.workspace_role[]) to authenticated;

alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.sections enable row level security;
alter table public.volunteers enable row level security;
alter table public.attendance_records enable row level security;

create policy "members can view their workspaces"
  on public.workspaces for select to authenticated
  using (private.has_workspace_role(id));

create policy "users can view own memberships"
  on public.workspace_memberships for select to authenticated
  using (user_id = (select auth.uid()));

create policy "members can view sections"
  on public.sections for select to authenticated
  using (private.has_workspace_role(workspace_id));

create policy "workforce managers can manage sections"
  on public.sections for all to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','hr','operations']::public.workspace_role[]))
  with check (private.has_workspace_role(workspace_id, array['owner','admin','hr','operations']::public.workspace_role[]));

create policy "members can view volunteers"
  on public.volunteers for select to authenticated
  using (private.has_workspace_role(workspace_id));

create policy "hr and admins can insert volunteers"
  on public.volunteers for insert to authenticated
  with check (private.has_workspace_role(workspace_id, array['owner','admin','hr']::public.workspace_role[]));

create policy "hr and admins can update volunteers"
  on public.volunteers for update to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','hr']::public.workspace_role[]))
  with check (private.has_workspace_role(workspace_id, array['owner','admin','hr']::public.workspace_role[]));

create policy "admins can delete volunteers"
  on public.volunteers for delete to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

create policy "members can view attendance"
  on public.attendance_records for select to authenticated
  using (private.has_workspace_role(workspace_id));

create policy "hr and admins can record attendance"
  on public.attendance_records for insert to authenticated
  with check (private.has_workspace_role(workspace_id, array['owner','admin','hr']::public.workspace_role[]));

create policy "hr and admins can correct attendance"
  on public.attendance_records for update to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','hr']::public.workspace_role[]))
  with check (private.has_workspace_role(workspace_id, array['owner','admin','hr']::public.workspace_role[]));

create policy "admins can remove attendance records"
  on public.attendance_records for delete to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

grant select on public.workspaces, public.workspace_memberships, public.sections,
  public.volunteers, public.attendance_records to authenticated;
grant insert, update, delete on public.sections to authenticated;
grant insert, update on public.volunteers to authenticated;
grant delete on public.volunteers to authenticated;
grant insert, update on public.attendance_records to authenticated;
grant delete on public.attendance_records to authenticated;

-- Membership provisioning is intentionally an administrative/bootstrap operation.
-- Do not grant authenticated users direct INSERT/UPDATE/DELETE on workspace_memberships.
