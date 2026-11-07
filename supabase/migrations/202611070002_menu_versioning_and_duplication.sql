-- Add immutable lineage metadata and an atomic menu-version duplication workflow.
alter table public.menu_items
  add column version_group_id uuid not null default gen_random_uuid(),
  add column version_number integer not null default 1 check (version_number > 0),
  add column based_on_menu_id uuid,
  add column is_current_version boolean not null default true,
  add constraint menu_items_based_on_fk foreign key (workspace_id, based_on_menu_id)
    references public.menu_items(workspace_id, id) on delete restrict,
  add constraint menu_items_version_group_number_unique unique (workspace_id, version_group_id, version_number);

create unique index menu_items_one_current_version_idx
  on public.menu_items(workspace_id, version_group_id)
  where is_current_version;

create index menu_items_version_lineage_idx
  on public.menu_items(workspace_id, version_group_id, version_number desc);

create or replace function public.duplicate_menu_version(p_menu_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source_menu public.menu_items%rowtype;
  new_menu_id uuid;
  next_version integer;
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'Autentikasi diperlukan.' using errcode = '42501';
  end if;

  select * into source_menu
    from public.menu_items
    where id = p_menu_id
    for update;

  if not found then
    raise exception 'Menu sumber tidak ditemukan.' using errcode = 'P0002';
  end if;

  if not private.has_workspace_role(source_menu.workspace_id, array['owner','admin','operations']::public.workspace_role[]) then
    raise exception 'Tidak memiliki izin untuk membuat versi menu.' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(source_menu.workspace_id::text || ':' || source_menu.version_group_id::text, 0)
  );

  select coalesce(max(version_number), 0) + 1
    into next_version
    from public.menu_items
    where workspace_id = source_menu.workspace_id
      and version_group_id = source_menu.version_group_id;

  update public.menu_items
    set is_current_version = false
    where workspace_id = source_menu.workspace_id
      and version_group_id = source_menu.version_group_id
      and is_current_version;

  insert into public.menu_items (
    workspace_id, name, description, status, portion_count,
    prep_duration_minutes, cook_duration_minutes, production_notes, dietary_notes,
    created_by, updated_by, version_group_id, version_number, based_on_menu_id, is_current_version
  ) values (
    source_menu.workspace_id, source_menu.name, source_menu.description, 'draft', source_menu.portion_count,
    source_menu.prep_duration_minutes, source_menu.cook_duration_minutes, source_menu.production_notes, source_menu.dietary_notes,
    actor, actor, source_menu.version_group_id, next_version, source_menu.id, true
  ) returning id into new_menu_id;

  insert into public.menu_components (
    workspace_id, menu_id, category, item_name, quantity, unit, preparation_note, sort_order
  )
  select workspace_id, new_menu_id, category, item_name, quantity, unit, preparation_note, sort_order
    from public.menu_components
    where workspace_id = source_menu.workspace_id and menu_id = source_menu.id;

  insert into public.menu_seasonings (
    workspace_id, menu_id, ingredient_name, quantity, unit, preparation_note, sort_order
  )
  select workspace_id, new_menu_id, ingredient_name, quantity, unit, preparation_note, sort_order
    from public.menu_seasonings
    where workspace_id = source_menu.workspace_id and menu_id = source_menu.id;

  insert into public.menu_production_steps (
    workspace_id, menu_id, step_order, title, instructions, duration_minutes, critical_note
  )
  select workspace_id, new_menu_id, step_order, title, instructions, duration_minutes, critical_note
    from public.menu_production_steps
    where workspace_id = source_menu.workspace_id and menu_id = source_menu.id;

  return new_menu_id;
end;
$$;

revoke all on function public.duplicate_menu_version(uuid) from public, anon;
grant execute on function public.duplicate_menu_version(uuid) to authenticated;

-- Superseded versions are historical snapshots and cannot be edited or removed.
create or replace function private.protect_superseded_menu_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_current_version = false then
    raise exception 'Versi menu lama bersifat arsip dan tidak dapat diubah atau dihapus.'
      using errcode = '23514';
  end if;

  if tg_op = 'UPDATE'
     and (new.workspace_id, new.version_group_id, new.version_number, new.based_on_menu_id)
       is distinct from
       (old.workspace_id, old.version_group_id, old.version_number, old.based_on_menu_id) then
    raise exception 'Identitas versi menu tidak dapat diubah.'
      using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.protect_superseded_menu_version() from public, anon, authenticated;
create trigger menu_items_version_history_guard
  before update or delete on public.menu_items
  for each row execute function private.protect_superseded_menu_version();
