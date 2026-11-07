-- Serialize batch creation with plan completion and reject writes to completed plans.
-- Locking the parent row closes the race where a batch could be inserted while
-- another transaction is marking the same plan as completed.

create or replace function private.prevent_batch_insert_into_completed_plan()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_status text;
begin
  select status::text
    into parent_status
    from public.menu_plans
    where workspace_id = new.workspace_id
      and id = new.menu_plan_id
    for update;

  if not found then
    -- Keep the composite foreign key responsible for the canonical missing-parent error.
    return new;
  end if;

  if parent_status = 'completed' then
    raise exception 'Batch baru tidak dapat ditambahkan ke rencana yang sudah selesai. Buka kembali rencana terlebih dahulu.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.prevent_batch_insert_into_completed_plan() from public, anon, authenticated;

create trigger production_batches_completed_plan_insert_guard
before insert on public.production_batches
for each row execute function private.prevent_batch_insert_into_completed_plan();
