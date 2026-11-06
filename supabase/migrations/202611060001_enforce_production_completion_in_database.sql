-- Enforce production completion invariants at the database boundary.
-- UI checks are useful feedback, but direct API calls must obey the same rules.

create or replace function private.enforce_production_batch_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'preparing' then
    new.started_at := coalesce(new.started_at, now());
    new.completed_at := null;
  elsif new.status = 'completed' then
    new.started_at := coalesce(new.started_at, now());
    new.completed_at := coalesce(new.completed_at, now());
    if new.completed_at < new.started_at then
      raise exception 'Waktu selesai batch tidak boleh sebelum waktu mulai.'
        using errcode = '23514';
    end if;
  elsif new.status <> 'completed' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_production_batch_timestamps() from public, anon, authenticated;

create trigger production_batches_timestamp_invariants
before insert or update of status, started_at, completed_at
on public.production_batches
for each row execute function private.enforce_production_batch_timestamps();

create or replace function private.enforce_menu_plan_completion()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  batch_count integer;
  allocated_portions integer;
  incomplete_count integer;
begin
  if new.status = 'completed' and old.status is distinct from new.status then
    select
      count(*)::integer,
      coalesce(sum(portion_count) filter (where status <> 'cancelled'), 0)::integer,
      count(*) filter (where status not in ('completed', 'cancelled'))::integer
    into batch_count, allocated_portions, incomplete_count
    from public.production_batches
    where workspace_id = new.workspace_id
      and menu_plan_id = new.id;

    if batch_count = 0 then
      raise exception 'Rencana belum dapat diselesaikan karena belum memiliki batch produksi.'
        using errcode = '23514';
    end if;

    if allocated_portions <> new.portion_count then
      raise exception 'Total porsi batch aktif (%) harus sama dengan porsi rencana (%).',
        allocated_portions, new.portion_count
        using errcode = '23514';
    end if;

    if incomplete_count > 0 then
      raise exception 'Masih ada % batch yang belum selesai.', incomplete_count
        using errcode = '23514';
    end if;

    if exists (
      select 1 from public.production_batches
      where workspace_id = new.workspace_id
        and menu_plan_id = new.id
        and status = 'cancelled'
    ) then
      raise exception 'Rencana tidak dapat diselesaikan selama masih ada batch yang dibatalkan.'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_menu_plan_completion() from public, anon, authenticated;

create trigger menu_plans_completion_invariants
before update of status on public.menu_plans
for each row execute function private.enforce_menu_plan_completion();
