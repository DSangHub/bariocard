alter table public.partner_bars
  add column owner_user_id uuid unique references auth.users(id) on delete set null,
  add column owner_name text check (owner_name is null or char_length(owner_name) between 2 and 120),
  add column phone text check (phone is null or char_length(phone) between 7 and 40),
  add column abc_jurisdiction text,
  add column abc_verification_status text not null default 'pending'
    check (abc_verification_status in ('pending','verified','rejected')),
  add column abc_verified_at timestamptz,
  add column updated_at timestamptz not null default now();

create unique index partner_bars_abc_license_unique
  on public.partner_bars (lower(abc_jurisdiction), lower(abc_license_number))
  where abc_jurisdiction is not null and abc_license_number is not null;

create or replace function public.apply_bario_partner_bar(actor_id uuid, payload jsonb)
returns public.partner_bars
language plpgsql
set search_path = public, pg_temp
as $$
declare
  current_bar public.partner_bars;
  saved_bar public.partner_bars;
begin
  select * into current_bar from public.partner_bars where owner_user_id = actor_id for update;

  if current_bar.id is null then
    insert into public.partner_bars (
      name, owner_user_id, owner_name, phone, address, abc_license_number,
      abc_jurisdiction, status, abc_verification_status
    ) values (
      payload->>'bar_name', actor_id, payload->>'owner_name', payload->>'phone',
      payload->'address', payload->>'abc_license_number', payload->>'abc_jurisdiction',
      'pending', 'pending'
    ) returning * into saved_bar;
  else
    update public.partner_bars set
      name = payload->>'bar_name',
      owner_name = payload->>'owner_name',
      phone = payload->>'phone',
      address = payload->'address',
      abc_license_number = payload->>'abc_license_number',
      abc_jurisdiction = payload->>'abc_jurisdiction',
      status = case
        when abc_license_number is distinct from payload->>'abc_license_number'
          or abc_jurisdiction is distinct from payload->>'abc_jurisdiction' then 'pending'
        else status
      end,
      abc_verification_status = case
        when abc_license_number is distinct from payload->>'abc_license_number'
          or abc_jurisdiction is distinct from payload->>'abc_jurisdiction' then 'pending'
        else abc_verification_status
      end,
      abc_verified_at = case
        when abc_license_number is distinct from payload->>'abc_license_number'
          or abc_jurisdiction is distinct from payload->>'abc_jurisdiction' then null
        else abc_verified_at
      end,
      updated_at = now()
    where id = current_bar.id
    returning * into saved_bar;
  end if;

  insert into public.bar_staff (bar_id, auth_user_id, role, active)
  values (saved_bar.id, actor_id, 'manager', true)
  on conflict (bar_id, auth_user_id) do update set role = 'manager', active = true;

  return saved_bar;
end;
$$;

revoke all on function public.apply_bario_partner_bar(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.apply_bario_partner_bar(uuid,jsonb) to service_role;
