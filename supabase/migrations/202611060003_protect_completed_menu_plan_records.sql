-- Preserve completed production plan context as an immutable operational record.
-- Reopen the plan before changing its production-defining fields; completed plans
-- cannot be deleted because their batches and calendar context are historical data.

create or replace function private.protect_completed_menu_plan()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'completed' then
    if tg_op = 'DELETE' then
      raise exception 'Rencana produksi yang sudah selesai tidak dapat dihapus.'
        using errcode = '23514';
    end if;

    if (new.workspace_id, new.menu_id, new.planned_date, new.portion_count, new.production_notes)
       is distinct from
       (old.workspace_id, old.menu_id, old.planned_date, old.portion_count, old.production_notes) then
      raise exception 'Data utama rencana yang sudah selesai tidak dapat diubah. Buka kembali rencana terlebih dahulu.'
        using errcode = '23514';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.protect_completed_menu_plan() from public, anon, authenticated;

create trigger menu_plans_completed_record_guard
before update or delete on public.menu_plans
for each row execute function private.protect_completed_menu_plan();
