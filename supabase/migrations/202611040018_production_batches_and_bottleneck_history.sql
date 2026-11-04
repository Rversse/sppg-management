-- Production batches, assignment, and bottleneck history.
create type public.production_batch_status as enum ('queued','preparing','blocked','ready','completed','cancelled');
create table public.production_batches (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 menu_plan_id uuid not null, batch_number integer not null check(batch_number>0),
 portion_count integer not null check(portion_count>0),
 status public.production_batch_status not null default 'queued',
 assigned_volunteer_id uuid, blocker_note text, work_notes text,
 started_at timestamptz, completed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 created_by uuid references auth.users(id) on delete set null,
 updated_by uuid references auth.users(id) on delete set null,
 constraint production_batches_plan_fk foreign key(workspace_id,menu_plan_id) references public.menu_plans(workspace_id,id) on delete cascade,
 constraint production_batches_volunteer_fk foreign key(workspace_id,assigned_volunteer_id) references public.volunteers(workspace_id,id) on delete set null,
 unique(workspace_id,menu_plan_id,batch_number), unique(workspace_id,id),
 check((status='blocked' and nullif(btrim(blocker_note),'') is not null) or status<>'blocked'),
 check(status<>'completed' or completed_at is not null)
);
create index production_batches_plan_idx on public.production_batches(workspace_id,menu_plan_id,batch_number);
create index production_batches_status_idx on public.production_batches(workspace_id,status,updated_at desc);
alter table public.production_batches enable row level security;
create policy "workspace members can view production batches" on public.production_batches for select to authenticated using(private.has_workspace_role(workspace_id));
create policy "operations and admins manage production batches" on public.production_batches for all to authenticated using(private.has_workspace_role(workspace_id,array['owner','admin','operations']::public.workspace_role[])) with check(private.has_workspace_role(workspace_id,array['owner','admin','operations']::public.workspace_role[]));
grant select,insert,update,delete on public.production_batches to authenticated;
create trigger production_batches_touch_updated_at before update on public.production_batches for each row execute function private.touch_updated_at();
create table public.production_batch_events (
 id bigint generated always as identity primary key,
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 batch_id uuid not null,
 action text not null check(action in ('INSERT','UPDATE','DELETE')),
 before_data jsonb, after_data jsonb,
 actor_id uuid references auth.users(id) on delete set null,
 occurred_at timestamptz not null default now(),
 constraint production_batch_events_batch_fk foreign key(workspace_id,batch_id) references public.production_batches(workspace_id,id) on delete cascade
);
create index production_batch_events_workspace_time_idx on public.production_batch_events(workspace_id,occurred_at desc);
create index production_batch_events_batch_time_idx on public.production_batch_events(batch_id,occurred_at desc);
alter table public.production_batch_events enable row level security;
create policy "workspace members can view production batch events" on public.production_batch_events for select to authenticated using(private.has_workspace_role(workspace_id));
grant select on public.production_batch_events to authenticated;
create or replace function private.capture_production_batch_event()
returns trigger language plpgsql security definer set search_path=''
as $$
declare old_row jsonb; new_row jsonb; target_workspace uuid; target_batch uuid;
begin
 if tg_op='INSERT' then new_row:=to_jsonb(new); target_workspace:=new.workspace_id; target_batch:=new.id;
 elsif tg_op='UPDATE' then old_row:=to_jsonb(old); new_row:=to_jsonb(new); target_workspace:=new.workspace_id; target_batch:=new.id;
 else old_row:=to_jsonb(old); target_workspace:=old.workspace_id; target_batch:=old.id; end if;
 insert into public.production_batch_events(workspace_id,batch_id,action,before_data,after_data,actor_id)
 values(target_workspace,target_batch,tg_op,old_row,new_row,auth.uid());
 if tg_op='DELETE' then return old; end if; return new;
end;
$$;
revoke all on function private.capture_production_batch_event() from public,anon,authenticated;
create trigger production_batches_audit after insert or update or delete on public.production_batches for each row execute function private.capture_production_batch_event();
