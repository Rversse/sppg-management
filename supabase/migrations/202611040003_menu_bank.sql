-- Menu bank: composition-first catalog and production notes.
-- Apply only after the dedicated SPPG Management Supabase project is provisioned.

create type public.menu_status as enum ('draft', 'active', 'archived');
create type public.menu_component_category as enum (
  'protein_source', 'protein', 'vegetable', 'fruit', 'other'
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 160),
  description text,
  status public.menu_status not null default 'draft',
  portion_count integer check (portion_count is null or portion_count > 0),
  prep_duration_minutes integer check (prep_duration_minutes is null or prep_duration_minutes >= 0),
  cook_duration_minutes integer check (cook_duration_minutes is null or cook_duration_minutes >= 0),
  production_notes text,
  dietary_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (workspace_id, id)
);

create table public.menu_components (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  menu_id uuid not null,
  category public.menu_component_category not null,
  item_name text not null check (char_length(trim(item_name)) between 1 and 160),
  quantity numeric(12,3) check (quantity is null or quantity >= 0),
  unit text check (unit is null or char_length(trim(unit)) between 1 and 32),
  preparation_note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint menu_components_menu_fk foreign key (workspace_id, menu_id)
    references public.menu_items(workspace_id, id) on delete cascade
);

create table public.menu_seasonings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  menu_id uuid not null,
  ingredient_name text not null check (char_length(trim(ingredient_name)) between 1 and 160),
  quantity numeric(12,3) check (quantity is null or quantity >= 0),
  unit text check (unit is null or char_length(trim(unit)) between 1 and 32),
  preparation_note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint menu_seasonings_menu_fk foreign key (workspace_id, menu_id)
    references public.menu_items(workspace_id, id) on delete cascade
);

create table public.menu_production_steps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  menu_id uuid not null,
  step_order integer not null check (step_order > 0),
  title text not null check (char_length(trim(title)) between 1 and 120),
  instructions text not null,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  critical_note text,
  created_at timestamptz not null default now(),
  constraint menu_production_steps_menu_fk foreign key (workspace_id, menu_id)
    references public.menu_items(workspace_id, id) on delete cascade,
  unique (menu_id, step_order)
);

create index menu_items_workspace_status_idx on public.menu_items(workspace_id, status);
create index menu_components_menu_order_idx on public.menu_components(menu_id, sort_order);
create index menu_seasonings_menu_order_idx on public.menu_seasonings(menu_id, sort_order);
create index menu_production_steps_menu_order_idx on public.menu_production_steps(menu_id, step_order);

alter table public.menu_items enable row level security;
alter table public.menu_components enable row level security;
alter table public.menu_seasonings enable row level security;
alter table public.menu_production_steps enable row level security;

create policy "workspace members can view menu items"
  on public.menu_items for select to authenticated
  using (private.has_workspace_role(workspace_id));

create policy "operations and admins manage menu items"
  on public.menu_items for all to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]))
  with check (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]));

create policy "workspace members can view menu components"
  on public.menu_components for select to authenticated
  using (private.has_workspace_role(workspace_id));

create policy "operations and admins manage menu components"
  on public.menu_components for all to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]))
  with check (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]));

create policy "workspace members can view menu seasonings"
  on public.menu_seasonings for select to authenticated
  using (private.has_workspace_role(workspace_id));

create policy "operations and admins manage menu seasonings"
  on public.menu_seasonings for all to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]))
  with check (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]));

create policy "workspace members can view production steps"
  on public.menu_production_steps for select to authenticated
  using (private.has_workspace_role(workspace_id));

create policy "operations and admins manage production steps"
  on public.menu_production_steps for all to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]))
  with check (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]));

grant select on public.menu_items, public.menu_components, public.menu_seasonings,
  public.menu_production_steps to authenticated;
grant insert, update, delete on public.menu_items, public.menu_components,
  public.menu_seasonings, public.menu_production_steps to authenticated;

create trigger menu_items_touch_updated_at
  before update on public.menu_items
  for each row execute function private.touch_updated_at();
