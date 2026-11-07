-- Prevent batch portions from exceeding the planned menu portions, including concurrent inserts.
create or replace function private.enforce_production_batch_portion_limit()
returns trigger language plpgsql set search_path=''
as $$
declare planned_portions integer; allocated_portions integer;
begin
 select portion_count into planned_portions from public.menu_plans
 where workspace_id=new.workspace_id and id=new.menu_plan_id for update;
 if planned_portions is null then raise exception 'Menu plan tidak ditemukan untuk workspace ini.' using errcode='23503'; end if;
 select coalesce(sum(portion_count),0)::integer into allocated_portions from public.production_batches
 where workspace_id=new.workspace_id and menu_plan_id=new.menu_plan_id
 and id is distinct from new.id and status<>'cancelled';
 if new.status<>'cancelled' and allocated_portions+new.portion_count>planned_portions then
  raise exception 'Total porsi batch (%) melebihi rencana menu (%)',allocated_portions+new.portion_count,planned_portions using errcode='23514';
 end if;
 return new;
end;
$$;
revoke all on function private.enforce_production_batch_portion_limit() from public,anon,authenticated;
create trigger production_batches_portion_limit before insert or update of workspace_id,menu_plan_id,portion_count,status
on public.production_batches for each row execute function private.enforce_production_batch_portion_limit();

create or replace function private.enforce_menu_plan_portion_limit()
returns trigger language plpgsql set search_path=''
as $$
declare allocated_portions integer;
begin
 select coalesce(sum(portion_count),0)::integer into allocated_portions from public.production_batches
 where workspace_id=new.workspace_id and menu_plan_id=new.id and status<>'cancelled';
 if allocated_portions>new.portion_count then
  raise exception 'Jumlah porsi rencana tidak boleh di bawah total porsi batch aktif (%)',allocated_portions using errcode='23514';
 end if;
 return new;
end;
$$;
revoke all on function private.enforce_menu_plan_portion_limit() from public,anon,authenticated;
create trigger menu_plans_portion_limit before update of portion_count on public.menu_plans
for each row execute function private.enforce_menu_plan_portion_limit();
