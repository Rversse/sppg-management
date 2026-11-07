alter table public.volunteer_groups add column section_id uuid;
do $$
begin
  if exists (select 1 from public.volunteer_groups) then
    raise exception 'Cannot assign a default section to existing groups; migrate their section assignments first.';
  end if;
end $$;
alter table public.volunteer_groups alter column section_id set not null;
alter table public.volunteer_groups add constraint volunteer_groups_section_fk foreign key (workspace_id,section_id) references public.sections(workspace_id,id) on delete restrict;
create index volunteer_groups_section_idx on public.volunteer_groups(workspace_id,section_id);
create or replace function public.enforce_volunteer_group_section_match() returns trigger language plpgsql set search_path='' as $$
declare group_section uuid; person_section uuid;
begin
 select g.section_id into group_section from public.volunteer_groups g where g.workspace_id=new.workspace_id and g.id=new.group_id;
 select v.section_id into person_section from public.volunteers v where v.workspace_id=new.workspace_id and v.id=new.volunteer_id;
 if group_section is null or person_section is null or group_section<>person_section then
  raise exception 'Relawan hanya dapat ditempatkan ke grup dari bagian kerja yang sama.' using errcode='23514';
 end if;
 return new;
end; $$;
create trigger volunteer_group_member_section_match before insert or update of workspace_id,group_id,volunteer_id on public.volunteer_group_members for each row execute function public.enforce_volunteer_group_section_match();
create or replace function public.prevent_section_change_with_group_assignment() returns trigger language plpgsql set search_path='' as $$
begin
 if new.section_id is distinct from old.section_id and exists(select 1 from public.volunteer_group_members m where m.workspace_id=old.workspace_id and m.volunteer_id=old.id) then
  raise exception 'Lepaskan relawan dari grup terlebih dahulu sebelum mengubah bagian kerjanya.' using errcode='23514';
 end if; return new;
end; $$;
create trigger volunteer_section_change_guard before update of section_id on public.volunteers for each row execute function public.prevent_section_change_with_group_assignment();
create or replace function public.prevent_group_section_change_with_members() returns trigger language plpgsql set search_path='' as $$
begin
 if new.section_id is distinct from old.section_id and exists(select 1 from public.volunteer_group_members m where m.workspace_id=old.workspace_id and m.group_id=old.id) then
  raise exception 'Kosongkan anggota grup terlebih dahulu sebelum mengubah bagian kerja.' using errcode='23514';
 end if; return new;
end; $$;
create trigger volunteer_group_section_change_guard before update of section_id on public.volunteer_groups for each row execute function public.prevent_group_section_change_with_members();
comment on column public.volunteer_groups.section_id is 'The single work section this group belongs to; members must have the same section.';