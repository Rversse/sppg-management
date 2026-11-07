-- Keep completed production plans immutable at the batch boundary.
-- Reopening a plan is required before its batches can be changed or removed.

create or replace function private.prevent_completed_plan_batch_mutation()
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
    where workspace_id = old.workspace_id
      and id = old.menu_plan_id
    for update;

  -- A missing parent is expected during ON DELETE CASCADE from menu_plans.
  if found and parent_status = 'completed' then
    raise exception 'Batch pada rencana yang sudah selesai tidak dapat diubah atau dihapus. Buka kembali rencana terlebih dahulu.'
      using errcode = '23514';
  end if;

  if tg_op = 'UPDATE'
     and (new.workspace_id, new.menu_plan_id) is distinct from (old.workspace_id, old.menu_plan_id) then
    select status::text
      into parent_status
      from public.menu_plans
      where workspace_id = new.workspace_id
        and id = new.menu_plan_id
      for update;

    if found and parent_status = 'completed' then
      raise exception 'Batch tidak dapat dipindahkan ke rencana yang sudah selesai.'
        using errcode = '23514';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_completed_plan_batch_mutation() from public, anon, authenticated;

create trigger production_batches_completed_plan_guard
before update or delete on public.production_batches
for each row execute function private.prevent_completed_plan_batch_mutation();
