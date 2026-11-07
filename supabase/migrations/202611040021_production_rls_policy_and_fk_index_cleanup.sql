-- Remove overlapping permissive SELECT policies and cover menu/production foreign keys.
drop policy if exists "operations and admins manage menu plans" on public.menu_plans;
create policy "operations and admins insert menu plans" on public.menu_plans for insert to authenticated
 with check(private.has_workspace_role(workspace_id,array['owner','admin','operations']::public.workspace_role[]));
create policy "operations and admins update menu plans" on public.menu_plans for update to authenticated
 using(private.has_workspace_role(workspace_id,array['owner','admin','operations']::public.workspace_role[]))
 with check(private.has_workspace_role(workspace_id,array['owner','admin','operations']::public.workspace_role[]));
create policy "operations and admins delete menu plans" on public.menu_plans for delete to authenticated
 using(private.has_workspace_role(workspace_id,array['owner','admin','operations']::public.workspace_role[]));

drop policy if exists "operations and admins manage production batches" on public.production_batches;
create policy "operations and admins insert production batches" on public.production_batches for insert to authenticated
 with check(private.has_workspace_role(workspace_id,array['owner','admin','operations']::public.workspace_role[]));
create policy "operations and admins update production batches" on public.production_batches for update to authenticated
 using(private.has_workspace_role(workspace_id,array['owner','admin','operations']::public.workspace_role[]))
 with check(private.has_workspace_role(workspace_id,array['owner','admin','operations']::public.workspace_role[]));
create policy "operations and admins delete production batches" on public.production_batches for delete to authenticated
 using(private.has_workspace_role(workspace_id,array['owner','admin','operations']::public.workspace_role[]));

create index if not exists menu_plans_workspace_menu_idx on public.menu_plans(workspace_id,menu_id);
create index if not exists menu_plans_created_by_idx on public.menu_plans(created_by) where created_by is not null;
create index if not exists menu_plans_updated_by_idx on public.menu_plans(updated_by) where updated_by is not null;
create index if not exists production_batches_assignee_idx on public.production_batches(workspace_id,assigned_volunteer_id) where assigned_volunteer_id is not null;
create index if not exists production_batches_created_by_idx on public.production_batches(created_by) where created_by is not null;
create index if not exists production_batches_updated_by_idx on public.production_batches(updated_by) where updated_by is not null;
create index if not exists production_batch_events_actor_idx on public.production_batch_events(actor_id) where actor_id is not null;
