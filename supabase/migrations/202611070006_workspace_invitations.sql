-- Workspace invitations: token hashes only, email-bound acceptance, one-time use.
create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role public.workspace_role not null,
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id),
  revoked_at timestamptz,
  constraint workspace_invitation_email_format check (email = lower(btrim(email)) and position('@' in email) > 1),
  constraint workspace_invitation_expiry check (expires_at > created_at),
  constraint workspace_invitation_role check (role <> 'owner')
);

create index if not exists workspace_invitations_workspace_pending_idx
  on public.workspace_invitations(workspace_id, expires_at)
  where accepted_at is null and revoked_at is null;

alter table public.workspace_invitations enable row level security;
revoke all on public.workspace_invitations from anon, authenticated;

create or replace function public.create_workspace_invitation(
  p_email text,
  p_role public.workspace_role,
  p_token_hash text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  current_workspace_id uuid;
  actor_role public.workspace_role;
  invitation_id uuid;
  normalized_email text := lower(btrim(p_email));
begin
  select wm.workspace_id, wm.role into current_workspace_id, actor_role
  from public.workspace_memberships wm
  where wm.user_id = auth.uid() order by wm.created_at asc limit 1;

  if current_workspace_id is null or actor_role not in ('owner','admin') then
    raise exception 'Hanya owner atau admin yang dapat membuat undangan' using errcode = '42501';
  end if;
  if normalized_email is null or char_length(normalized_email) > 254 or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Alamat email tidak valid' using errcode = '22023';
  end if;
  if p_token_hash is null or char_length(p_token_hash) <> 64 or p_token_hash !~ '^[a-f0-9]+$' then
    raise exception 'Token undangan tidak valid' using errcode = '22023';
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '8 days' then
    raise exception 'Masa berlaku undangan maksimal 7 hari' using errcode = '22023';
  end if;
  if p_role = 'owner' then raise exception 'Role owner hanya dapat diberikan oleh owner yang sudah ada' using errcode = '42501'; end if;
  if actor_role = 'admin' and p_role = 'admin' then raise exception 'Admin tidak dapat mengundang admin baru' using errcode = '42501'; end if;
  if exists (select 1 from public.workspace_memberships wm join auth.users u on u.id=wm.user_id
             where wm.workspace_id=current_workspace_id and lower(u.email)=normalized_email) then
    raise exception 'Email tersebut sudah menjadi anggota workspace' using errcode = '23505';
  end if;

  insert into public.workspace_invitations(workspace_id,email,role,token_hash,invited_by,expires_at)
  values(current_workspace_id,normalized_email,p_role,p_token_hash,auth.uid(),p_expires_at)
  returning id into invitation_id;
  return invitation_id;
end;
$$;

create or replace function public.list_workspace_invitations()
returns table(id uuid,email text,role public.workspace_role,created_at timestamptz,expires_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare current_workspace_id uuid; actor_role public.workspace_role;
begin
  select wm.workspace_id,wm.role into current_workspace_id,actor_role
  from public.workspace_memberships wm where wm.user_id=auth.uid() order by wm.created_at asc limit 1;
  if current_workspace_id is null or actor_role not in ('owner','admin') then raise exception 'Akses ditolak' using errcode='42501'; end if;
  return query select i.id,i.email,i.role,i.created_at,i.expires_at
  from public.workspace_invitations i
  where i.workspace_id=current_workspace_id and i.accepted_at is null and i.revoked_at is null and i.expires_at>now()
  order by i.created_at desc;
end;
$$;

create or replace function public.revoke_workspace_invitation(p_invitation_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare current_workspace_id uuid; actor_role public.workspace_role;
begin
  select wm.workspace_id,wm.role into current_workspace_id,actor_role
  from public.workspace_memberships wm where wm.user_id=auth.uid() order by wm.created_at asc limit 1;
  if current_workspace_id is null or actor_role not in ('owner','admin') then raise exception 'Akses ditolak' using errcode='42501'; end if;
  update public.workspace_invitations set revoked_at=now()
  where id=p_invitation_id and workspace_id=current_workspace_id and accepted_at is null and revoked_at is null;
  if not found then raise exception 'Undangan tidak ditemukan atau sudah tidak aktif' using errcode='P0002'; end if;
end;
$$;

create or replace function public.accept_workspace_invitation(p_token_hash text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text;
  invite public.workspace_invitations%rowtype;
begin
  if caller_id is null then raise exception 'Login diperlukan' using errcode='28000'; end if;
  select lower(u.email) into caller_email from auth.users u where u.id=caller_id;
  if caller_email is null then raise exception 'Email akun tidak ditemukan' using errcode='42501'; end if;

  select * into invite from public.workspace_invitations i
  where i.token_hash=p_token_hash and i.accepted_at is null and i.revoked_at is null and i.expires_at>now()
  for update;
  if not found then raise exception 'Undangan tidak valid, sudah dipakai, atau kedaluwarsa' using errcode='P0002'; end if;
  if invite.email<>caller_email then raise exception 'Undangan ini ditujukan ke email lain' using errcode='42501'; end if;
  if exists(select 1 from public.workspace_memberships wm where wm.user_id=caller_id) then
    raise exception 'Akun ini sudah terhubung ke workspace lain' using errcode='23505';
  end if;

  insert into public.workspace_memberships(workspace_id,user_id,role)
  values(invite.workspace_id,caller_id,invite.role);
  update public.workspace_invitations set accepted_at=now(),accepted_by=caller_id where id=invite.id;
  return invite.workspace_id;
end;
$$;

revoke all on function public.create_workspace_invitation(text,public.workspace_role,text,timestamptz) from public,anon;
revoke all on function public.list_workspace_invitations() from public,anon;
revoke all on function public.revoke_workspace_invitation(uuid) from public,anon;
revoke all on function public.accept_workspace_invitation(text) from public,anon;
grant execute on function public.create_workspace_invitation(text,public.workspace_role,text,timestamptz) to authenticated;
grant execute on function public.list_workspace_invitations() to authenticated;
grant execute on function public.revoke_workspace_invitation(uuid) to authenticated;
grant execute on function public.accept_workspace_invitation(text) to authenticated;
