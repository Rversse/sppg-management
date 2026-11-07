-- Require a reason for material attendance corrections and keep a review queue.
alter table public.attendance_records
  add column correction_reason text;

create table public.attendance_correction_reviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  attendance_record_id uuid not null,
  volunteer_id uuid not null,
  work_date date not null,
  correction_reason text not null check (char_length(btrim(correction_reason)) between 5 and 1000),
  before_data jsonb not null,
  after_data jsonb not null,
  requested_by uuid,
  requested_at timestamptz not null default now(),
  review_status text not null default 'pending' check (review_status in ('pending','reviewed')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text check (review_note is null or char_length(review_note) <= 1000),
  constraint attendance_correction_review_state_check check (
    (review_status = 'pending' and reviewed_at is null and reviewed_by is null)
    or (review_status = 'reviewed' and reviewed_at is not null and reviewed_by is not null)
  )
);

create index attendance_correction_reviews_workspace_status_idx
  on public.attendance_correction_reviews(workspace_id, review_status, requested_at desc);

alter table public.attendance_correction_reviews enable row level security;
create policy "HR and admins can read attendance correction reviews"
  on public.attendance_correction_reviews for select to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','hr']::public.workspace_role[]));
create policy "HR and admins can review attendance corrections"
  on public.attendance_correction_reviews for update to authenticated
  using (private.has_workspace_role(workspace_id, array['owner','admin','hr']::public.workspace_role[]))
  with check (private.has_workspace_role(workspace_id, array['owner','admin','hr']::public.workspace_role[]));
grant select, update on public.attendance_correction_reviews to authenticated;
revoke insert, delete, truncate on public.attendance_correction_reviews from anon, authenticated;

create or replace function private.require_attendance_correction_reason()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.status, new.clock_in, new.clock_out, new.notes)
     is distinct from
     (old.status, old.clock_in, old.clock_out, old.notes) then
    if new.correction_reason is null or char_length(btrim(new.correction_reason)) < 5
       or char_length(new.correction_reason) > 1000 then
      raise exception 'Alasan koreksi absensi wajib diisi (minimal 5 karakter).'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.require_attendance_correction_reason() from public, anon, authenticated;
create trigger attendance_correction_reason_guard
  before update on public.attendance_records
  for each row execute function private.require_attendance_correction_reason();

create or replace function private.capture_attendance_correction_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.status, new.clock_in, new.clock_out, new.notes)
     is distinct from
     (old.status, old.clock_in, old.clock_out, old.notes) then
    insert into public.attendance_correction_reviews (
      workspace_id, attendance_record_id, volunteer_id, work_date,
      correction_reason, before_data, after_data, requested_by
    ) values (
      new.workspace_id, new.id, new.volunteer_id, new.work_date,
      btrim(new.correction_reason),
      jsonb_build_object('status', old.status, 'clock_in', old.clock_in, 'clock_out', old.clock_out, 'notes', old.notes),
      jsonb_build_object('status', new.status, 'clock_in', new.clock_in, 'clock_out', new.clock_out, 'notes', new.notes),
      auth.uid()
    );
  end if;
  return new;
end;
$$;
revoke all on function private.capture_attendance_correction_review() from public, anon, authenticated;
create trigger attendance_correction_review_capture
  after update on public.attendance_records
  for each row execute function private.capture_attendance_correction_review();

create or replace function private.protect_attendance_correction_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.review_status <> 'pending' then
    raise exception 'Koreksi yang sudah ditinjau tidak dapat diubah lagi.'
      using errcode = '23514';
  end if;
  if (new.workspace_id, new.attendance_record_id, new.volunteer_id, new.work_date,
      new.correction_reason, new.before_data, new.after_data, new.requested_by, new.requested_at)
     is distinct from
     (old.workspace_id, old.attendance_record_id, old.volunteer_id, old.work_date,
      old.correction_reason, old.before_data, old.after_data, old.requested_by, old.requested_at) then
    raise exception 'Isi riwayat koreksi bersifat tetap.'
      using errcode = '23514';
  end if;
  if new.review_status <> 'reviewed' or new.reviewed_by is distinct from auth.uid()
     or new.reviewed_at is null then
    raise exception 'Peninjauan harus ditandai oleh pengguna yang sedang login.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_attendance_correction_review() from public, anon, authenticated;
create trigger attendance_correction_review_guard
  before update on public.attendance_correction_reviews
  for each row execute function private.protect_attendance_correction_review();
