-- Preserve production batch events after batch deletion.
alter table public.production_batch_events drop constraint if exists production_batch_events_batch_fk;
