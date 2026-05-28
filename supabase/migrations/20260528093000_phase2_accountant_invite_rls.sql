-- Phase 2 security hardening: accountant invite RPC + operational RLS.
-- Run this in the Supabase SQL Editor or through your normal migration pipeline.

create or replace function public.is_current_user_accountant()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'accountant'
  );
$$;

revoke all on function public.is_current_user_accountant() from public, anon;
grant execute on function public.is_current_user_accountant() to authenticated;

create or replace function public.is_granted_accountant_for_doctor(p_doctor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles doctor
    join public.profiles accountant
      on accountant.id = auth.uid()
     and accountant.role = 'accountant'
    where doctor.id = p_doctor_id
      and doctor.accountant_access_status = 'GRANTED'
      and lower(coalesce(doctor.linked_accountant_email, '')) = lower(coalesce(auth.email(), ''))
  );
$$;

revoke all on function public.is_granted_accountant_for_doctor(uuid) from public, anon;
grant execute on function public.is_granted_accountant_for_doctor(uuid) to authenticated;

create or replace function public.accept_accountant_invite(doctor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_accountant_id uuid := auth.uid();
  v_accountant_email text := lower(coalesce(auth.email(), ''));
  v_doctor record;
  v_client jsonb;
begin
  if v_accountant_id is null or v_accountant_email = '' then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.profiles accountant
    where accountant.id = v_accountant_id
      and accountant.role = 'accountant'
  ) then
    raise exception 'ACCOUNTANT_ROLE_REQUIRED' using errcode = '42501';
  end if;

  select doctor.id, doctor.email, doctor.full_name, doctor.linked_accountant_email, doctor.accountant_access_status
    into v_doctor
  from public.profiles doctor
  where doctor.id = $1
  for update;

  if not found then
    raise exception 'DOCTOR_NOT_FOUND' using errcode = 'P0002';
  end if;

  if lower(coalesce(v_doctor.linked_accountant_email, '')) <> v_accountant_email then
    raise exception 'INVITE_EMAIL_MISMATCH' using errcode = '42501';
  end if;

  if coalesce(v_doctor.accountant_access_status, 'REVOKED') <> 'PENDING' then
    raise exception 'INVITE_NOT_PENDING' using errcode = '23514';
  end if;

  v_client := jsonb_build_object(
    'id', v_doctor.id::text,
    'name', coalesce(nullif(v_doctor.full_name, ''), 'Cliente sem nome'),
    'email', coalesce(v_doctor.email, '')
  );

  update public.profiles doctor
     set accountant_access_status = 'GRANTED',
         updated_at = now()
   where doctor.id = v_doctor.id;

  update public.profiles accountant
     set linked_clients = (
           select coalesce(jsonb_agg(client), '[]'::jsonb) || v_client
           from jsonb_array_elements(coalesce(accountant.linked_clients, '[]'::jsonb)) as existing_client(client)
           where client->>'id' <> v_doctor.id::text
         ),
         active_client_shift_id = coalesce(accountant.active_client_shift_id, v_doctor.id::text),
         updated_at = now()
   where accountant.id = v_accountant_id;

  return v_client;
end;
$$;

revoke all on function public.accept_accountant_invite(uuid) from public, anon;
grant execute on function public.accept_accountant_invite(uuid) to authenticated;

alter table public.shifts enable row level security;
alter table public.workplaces enable row level security;

drop policy if exists shifts_doctor_select_own on public.shifts;
drop policy if exists shifts_doctor_insert_own on public.shifts;
drop policy if exists shifts_doctor_update_own on public.shifts;
drop policy if exists shifts_doctor_delete_own on public.shifts;
drop policy if exists shifts_accountant_select_linked_doctors on public.shifts;
drop policy if exists shifts_deny_accountant_insert on public.shifts;
drop policy if exists shifts_deny_accountant_update on public.shifts;
drop policy if exists shifts_deny_accountant_delete on public.shifts;

create policy shifts_doctor_select_own
on public.shifts
for select
to authenticated
using (user_id = auth.uid());

create policy shifts_accountant_select_linked_doctors
on public.shifts
for select
to authenticated
using (public.is_granted_accountant_for_doctor(user_id));

create policy shifts_doctor_insert_own
on public.shifts
for insert
to authenticated
with check (user_id = auth.uid());

create policy shifts_deny_accountant_insert
on public.shifts
as restrictive
for insert
to authenticated
with check (not public.is_current_user_accountant());

create policy shifts_doctor_update_own
on public.shifts
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy shifts_deny_accountant_update
on public.shifts
as restrictive
for update
to authenticated
using (not public.is_current_user_accountant())
with check (not public.is_current_user_accountant());

create policy shifts_doctor_delete_own
on public.shifts
for delete
to authenticated
using (user_id = auth.uid());

create policy shifts_deny_accountant_delete
on public.shifts
as restrictive
for delete
to authenticated
using (not public.is_current_user_accountant());

drop policy if exists workplaces_doctor_select_own on public.workplaces;
drop policy if exists workplaces_doctor_insert_own on public.workplaces;
drop policy if exists workplaces_doctor_update_own on public.workplaces;
drop policy if exists workplaces_doctor_delete_own on public.workplaces;
drop policy if exists workplaces_accountant_select_linked_doctors on public.workplaces;
drop policy if exists workplaces_deny_accountant_insert on public.workplaces;
drop policy if exists workplaces_deny_accountant_update on public.workplaces;
drop policy if exists workplaces_deny_accountant_delete on public.workplaces;

create policy workplaces_doctor_select_own
on public.workplaces
for select
to authenticated
using (user_id = auth.uid());

create policy workplaces_accountant_select_linked_doctors
on public.workplaces
for select
to authenticated
using (public.is_granted_accountant_for_doctor(user_id));

create policy workplaces_doctor_insert_own
on public.workplaces
for insert
to authenticated
with check (user_id = auth.uid());

create policy workplaces_deny_accountant_insert
on public.workplaces
as restrictive
for insert
to authenticated
with check (not public.is_current_user_accountant());

create policy workplaces_doctor_update_own
on public.workplaces
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy workplaces_deny_accountant_update
on public.workplaces
as restrictive
for update
to authenticated
using (not public.is_current_user_accountant())
with check (not public.is_current_user_accountant());

create policy workplaces_doctor_delete_own
on public.workplaces
for delete
to authenticated
using (user_id = auth.uid());

create policy workplaces_deny_accountant_delete
on public.workplaces
as restrictive
for delete
to authenticated
using (not public.is_current_user_accountant());
