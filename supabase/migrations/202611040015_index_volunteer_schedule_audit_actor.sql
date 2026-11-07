-- Cover the actor_id foreign key on append-only schedule audit records.
create index if not exists volunteer_schedule_audit_actor_id_idx
  on public.volunteer_schedule_audit (actor_id)
  where actor_id is not null;
