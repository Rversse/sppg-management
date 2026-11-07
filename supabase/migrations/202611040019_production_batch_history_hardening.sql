-- Keep batch assignments workspace-safe and retain audit events after batch deletion.
alter table public.production_batches drop constraint production_batches_volunteer_fk;
alter table public.production_batches add constraint production_batches_volunteer_fk
 foreign key(workspace_id,assigned_volunteer_id) references public.volunteers(workspace_id,id)
 on delete set null (assigned_volunteer_id);
alter table public.production_batch_events drop constraint production_batch_events_batch_fk;
