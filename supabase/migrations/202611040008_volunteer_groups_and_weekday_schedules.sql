create table public.volunteer_groups (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 name text not null check(char_length(btrim(name)) between 1 and 80),
 start_time time not null,
 end_time time not null,
 weekdays smallint[] not null default array[1,2,3,4,5]::smallint[],
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint volunteer_groups_time_order check(end_time > start_time),
 constraint volunteer_groups_weekdays_valid check(cardinality(weekdays) between 1 and 5 and weekdays <@ array[1,2,3,4,5]::smallint[]),
 unique(workspace_id,name), unique(workspace_id,id)
);
create table public.volunteer_group_members (
 workspace_id uuid not null,
 group_id uuid not null,
 volunteer_id uuid not null,
 assigned_at timestamptz not null default now(),
 primary key(workspace_id,volunteer_id),
 foreign key(workspace_id,group_id) references public.volunteer_groups(workspace_id,id) on delete cascade,
 foreign key(workspace_id,volunteer_id) references public.volunteers(workspace_id,id) on delete cascade
);
create index volunteer_groups_workspace_idx on public.volunteer_groups(workspace_id,name);
create index volunteer_group_members_group_idx on public.volunteer_group_members(workspace_id,group_id);
alter table public.volunteer_groups enable row level security;
alter table public.volunteer_group_members enable row level security;
create policy "workspace members view volunteer groups" on public.volunteer_groups for select to authenticated using(private.has_workspace_role(workspace_id));
create policy "workforce managers insert volunteer groups" on public.volunteer_groups for insert to authenticated with check(private.has_workspace_role(workspace_id,array['owner','admin','hr','operations']::public.workspace_role[]));
create policy "workforce managers update volunteer groups" on public.volunteer_groups for update to authenticated using(private.has_workspace_role(workspace_id,array['owner','admin','hr','operations']::public.workspace_role[])) with check(private.has_workspace_role(workspace_id,array['owner','admin','hr','operations']::public.workspace_role[]));
create policy "workforce managers delete volunteer groups" on public.volunteer_groups for delete to authenticated using(private.has_workspace_role(workspace_id,array['owner','admin','hr','operations']::public.workspace_role[]));
create policy "workspace members view group members" on public.volunteer_group_members for select to authenticated using(private.has_workspace_role(workspace_id));
create policy "workforce managers insert group members" on public.volunteer_group_members for insert to authenticated with check(private.has_workspace_role(workspace_id,array['owner','admin','hr','operations']::public.workspace_role[]));
create policy "workforce managers delete group members" on public.volunteer_group_members for delete to authenticated using(private.has_workspace_role(workspace_id,array['owner','admin','hr','operations']::public.workspace_role[]));
grant select on public.volunteer_groups,public.volunteer_group_members to authenticated;
grant insert,update,delete on public.volunteer_groups to authenticated;
grant insert,delete on public.volunteer_group_members to authenticated;
comment on table public.volunteer_groups is 'Recurring volunteer work groups; weekend days are excluded from allowed weekdays.';
comment on table public.volunteer_group_members is 'Assigns a volunteer to at most one recurring work group per workspace.';