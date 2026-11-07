-- Record actual start and finish timestamps for each recipe stage in a production batch.
create table public.production_batch_stages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  batch_id uuid not null,
  step_order integer not null check (step_order > 0),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  started_by uuid references auth.users(id) on delete set null,
  completed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint production_batch_stages_batch_fk foreign key (workspace_id, batch_id)
    references public.production_batches(workspace_id, id) on delete cascade,
  constraint production_batch_stages_unique_step unique (workspace_id, batch_id, step_order),
  check (completed_at is null or completed_at >= started_at)
);

create index production_batch_stages_batch_idx
  on public.production_batch_stages(workspace_id, batch_id, step_order);

alter table public.production_batch_stages enable row level security;
create policy "workspace members can view production batch stages"
  on public.production_batch_stages for select to authenticated
  using (private.has_workspace_role(workspace_id));
create policy "operations and admins manage production batch stages"
  on public.production_batch_stages for all to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]))
  with check (private.has_workspace_role(workspace_id, array['owner','admin','operations']::public.workspace_role[]));
grant select, insert, update, delete on public.production_batch_stages to authenticated;

create or replace function private.protect_production_batch_stage()
returns trigger
language plpgsql
set search_path = ''
as $$
declare parent_status text;
begin
  if tg_op = 'UPDATE' or tg_op = 'DELETE' then
    select b.status::text, p.status::text
      into parent_status, strict parent_status
      from public.production_batches b
      join public.menu_plans p on p.workspace_id = b.workspace_id and p.id = b.menu_plan_id
      where b.workspace_id = old.workspace_id and b.id = old.batch_id
      for update of b, p;
    if parent_status = 'completed' then
      raise exception 'Tahap pada batch selesai tidak dapat diubah.'
        using errcode = '23514';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.protect_production_batch_stage() from public, anon, authenticated;
create trigger production_batch_stages_guard
  before update or delete on public.production_batch_stages
  for each row execute function private.protect_production_batch_stage();

create or replace function private.capture_production_batch_stage_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    insert into public.production_batch_events(workspace_id, batch_id, action, before_data, actor_id)
    values (old.workspace_id, old.batch_id, 'DELETE', to_jsonb(old), auth.uid());
    return old;
  elsif tg_op = 'INSERT' then
    insert into public.production_batch_events(workspace_id, batch_id, action, after_data, actor_id)
    values (new.workspace_id, new.batch_id, 'INSERT', jsonb_build_object('stage', to_jsonb(new)), auth.uid());
    return new;
  else
    insert into public.production_batch_events(workspace_id, batch_id, action, before_data, after_data, actor_id)
    values (new.workspace_id, new.batch_id, 'UPDATE', jsonb_build_object('stage', to_jsonb(old)), jsonb_build_object('stage', to_jsonb(new)), auth.uid());
    return new;
  end if;
end;
$$;
revoke all on function private.capture_production_batch_stage_event() from public, anon, authenticated;
create trigger production_batch_stages_audit
  after insert or update or delete on public.production_batch_stages
  for each row execute function private.capture_production_batch_stage_event();
