-- Date-based menu planning and production status lifecycle.

create type public.menu_plan_status as enum ('planned','preparing','ready','completed','cancelled');

create table public.menu_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  menu_id uuid not null,
  planned_date date not null,
  portion_count integer not null check (portion_count > 0),
  status public.menu_plan_status not null default 'planned',
  production_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint menu_plans_menu_fk foreign key (workspace_id, menu_id)
    references public.menu_items(workspace_id, id) on delete restrict,
  unique (workspace_id, id)
);

create index menu_plans_workspace_date_idx
  on public.menu_plans(workspace_id, planned_date, status);
create index menu_plans_menu_date_idx
  on public.menu_plans(menu_id, planned_date);

alter table public.menu_plans enable row level security;

create policy "workspace members can view menu plans"
  on public.menu_plans for select to authenticated
  using (private.has_workspace_role(workspace_id));

create policy "operations and admins manage menu plans"
  on public.menu_plans for all to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]))
  with check (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]));

grant select, insert, update, delete on public.menu_plans to authenticated;

create trigger menu_plans_touch_updated_at
  before update on public.menu_plans
  for each row execute function private.touch_updated_at();
