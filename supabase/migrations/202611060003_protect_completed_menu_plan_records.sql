-- Preserve production plan context whenever a batch has ever been created.
-- Completed plans can only be reopened; cancellation is not a way to unlock history.

create or replace function private.protect_completed_menu_plan()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if exists (
      select 1 from public.production_batches b
      where b.workspace_id = old.workspace_id and b.menu_plan_id = old.id
    ) then
      raise exception 'Rencana yang sudah memiliki riwayat batch produksi tidak dapat dihapus. Gunakan status Dibatalkan.'
        using errcode = '23514';
    end if;

    if old.status = 'completed' then
      raise exception 'Rencana produksi yang sudah selesai tidak dapat dihapus.'
        using errcode = '23514';
    end if;
    return old;
  end if;

  if old.status = 'completed' then
    if new.status = 'cancelled' then
      raise exception 'Rencana selesai harus dibuka kembali sebelum dapat dibatalkan.'
        using errcode = '23514';
    end if;

    if (new.workspace_id, new.menu_id, new.planned_date, new.portion_count, new.production_notes)
       is distinct from
       (old.workspace_id, old.menu_id, old.planned_date, old.portion_count, old.production_notes) then
      raise exception 'Data utama rencana yang sudah selesai tidak dapat diubah. Buka kembali rencana terlebih dahulu.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.protect_completed_menu_plan() from public, anon, authenticated;

drop trigger if exists menu_plans_completed_record_guard on public.menu_plans;
create trigger menu_plans_completed_record_guard
before update or delete on public.menu_plans
for each row execute function private.protect_completed_menu_plan();
