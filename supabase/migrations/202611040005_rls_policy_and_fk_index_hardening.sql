-- Tighten RLS policy shape and cover frequently used foreign keys.
-- The workspace bootstrap RPC is intentionally SECURITY DEFINER: it atomically
-- creates a workspace and its first owner membership, which clients cannot insert directly.

-- Supabase's automatic-RLS event trigger remains installed, but must not be
-- callable as a normal Data API RPC by anon/authenticated clients.
do $
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end
$;

-- Replace broad FOR ALL policies with command-specific policies to avoid
-- duplicate permissive SELECT evaluation while preserving the same role model.
drop policy if exists "workforce managers can manage sections" on public.sections;
create policy "workforce managers can insert sections" on public.sections
  for insert to authenticated
  with check (private.has_workspace_role(workspace_id, array['owner','admin','hr','operations']::public.workspace_role[]));
create policy "workforce managers can update sections" on public.sections
  for update to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','hr','operations']::public.workspace_role[]))
  with check (private.has_workspace_role(workspace_id, array['owner','admin','hr','operations']::public.workspace_role[]));
create policy "workforce managers can delete sections" on public.sections
  for delete to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','hr','operations']::public.workspace_role[]));

drop policy if exists "operations and admins manage menu items" on public.menu_items;
create policy "operations and admins insert menu items" on public.menu_items
  for insert to authenticated
  with check (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]));
create policy "operations and admins update menu items" on public.menu_items
  for update to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]))
  with check (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]));
create policy "operations and admins delete menu items" on public.menu_items
  for delete to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]));

drop policy if exists "operations and admins manage menu components" on public.menu_components;
create policy "operations and admins insert menu components" on public.menu_components
  for insert to authenticated
  with check (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]));
create policy "operations and admins update menu components" on public.menu_components
  for update to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]))
  with check (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]));
create policy "operations and admins delete menu components" on public.menu_components
  for delete to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]));

drop policy if exists "operations and admins manage menu seasonings" on public.menu_seasonings;
create policy "operations and admins insert menu seasonings" on public.menu_seasonings
  for insert to authenticated
  with check (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]));
create policy "operations and admins update menu seasonings" on public.menu_seasonings
  for update to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]))
  with check (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]));
create policy "operations and admins delete menu seasonings" on public.menu_seasonings
  for delete to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]));

drop policy if exists "operations and admins manage production steps" on public.menu_production_steps;
create policy "operations and admins insert production steps" on public.menu_production_steps
  for insert to authenticated
  with check (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]));
create policy "operations and admins update production steps" on public.menu_production_steps
  for update to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]))
  with check (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]));
create policy "operations and admins delete production steps" on public.menu_production_steps
  for delete to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]));

-- Foreign-key indexes improve joins and parent deletes as data volume grows.
create index if not exists workspace_memberships_user_id_idx on public.workspace_memberships(user_id);
create index if not exists volunteers_created_by_idx on public.volunteers(created_by);
create index if not exists attendance_recorded_by_idx on public.attendance_records(recorded_by);
create index if not exists attendance_updated_by_idx on public.attendance_records(updated_by);
create index if not exists audit_actor_id_idx on public.workforce_audit_log(actor_id);
create index if not exists menu_items_created_by_idx on public.menu_items(created_by);
create index if not exists menu_items_updated_by_idx on public.menu_items(updated_by);
create index if not exists menu_components_workspace_menu_idx on public.menu_components(workspace_id, menu_id);
create index if not exists menu_seasonings_workspace_menu_idx on public.menu_seasonings(workspace_id, menu_id);
create index if not exists menu_steps_workspace_menu_idx on public.menu_production_steps(workspace_id, menu_id);
