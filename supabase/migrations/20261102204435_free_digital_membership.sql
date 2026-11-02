-- Customer membership is free at launch. No payment details or automatic upgrade.
alter table public.members add column auth_user_id uuid unique references auth.users(id) on delete set null;
alter table public.members add column membership_plan text not null default 'free_launch' check (membership_plan = 'free_launch');
create table public.membership_qr_sessions (
  token_hash text primary key, card_id uuid not null references public.cards(id) on delete cascade,
  expires_at timestamptz not null, used_at timestamptz, created_at timestamptz not null default now()
);
create index membership_qr_sessions_card_idx on public.membership_qr_sessions(card_id);
create index membership_qr_sessions_expiry_idx on public.membership_qr_sessions(expires_at);
create table public.member_visits (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id) on delete cascade,
  bar_id uuid not null references public.partner_bars(id), staff_user_id uuid not null references auth.users(id),
  visit_day date not null default (now() at time zone 'UTC')::date, created_at timestamptz not null default now(),
  unique(member_id, bar_id, visit_day)
);
create index member_visits_bar_idx on public.member_visits(bar_id);
create index member_visits_staff_idx on public.member_visits(staff_user_id);
create table public.member_events (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id) on delete cascade,
  bar_id uuid references public.partner_bars(id), kind text not null check(kind in ('welcome','visit')),
  points_delta integer not null default 0, description text not null, created_at timestamptz not null default now()
);
create index member_events_member_idx on public.member_events(member_id, created_at desc);
create index member_events_bar_idx on public.member_events(bar_id);
alter table public.membership_qr_sessions enable row level security;
alter table public.member_visits enable row level security;
alter table public.member_events enable row level security;
revoke all on public.membership_qr_sessions, public.member_visits, public.member_events from anon, authenticated;

-- All functions are service-only and invoker-security. Actor IDs come from a
-- verified Auth session in the API, never from user-supplied authorization claims.
create function public.enroll_bario_member(actor_id uuid, payload jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare u auth.users; m public.members; card_id uuid; birth date;
begin
  select * into u from auth.users where id=actor_id for update;
  if u.id is null or u.email_confirmed_at is null then raise exception 'Confirm your email before joining.'; end if;
  select * into m from public.members where auth_user_id=actor_id;
  if m.id is not null then return m.id; end if;
  -- An email-confirmed account may claim only its own legacy membership.
  select * into m from public.members where lower(email)=lower(u.email) for update;
  if m.id is not null then
    if m.auth_user_id is not null then raise exception 'Membership already linked.'; end if;
    update public.members set auth_user_id=actor_id, updated_at=now() where id=m.id;
    return m.id;
  end if;
  birth := (payload->>'date_of_birth')::date;
  if birth is null or birth > (current_date - interval '21 years')::date then raise exception '21+ only'; end if;
  insert into public.members(member_number,full_name,email,phone,date_of_birth,auth_user_id,preferred_delivery,membership_plan)
  values(payload->>'member_number',btrim(payload->>'full_name'),lower(u.email),nullif(payload->>'phone',''),birth,actor_id,'pickup','free_launch') returning * into m;
  insert into public.age_verifications(member_id,method,result) values(m.id,'bar_in_person','pending');
  insert into public.cards(member_id,card_number,qr_token_hash,card_type,status,issued_by)
    values(m.id,payload->>'card_number',payload->>'qr_token_hash','digital','issued','bario') returning id into card_id;
  insert into public.member_events(member_id,kind,points_delta,description)
    values(m.id,'welcome',m.points,'Welcome to BARIO — free launch membership. Welcome points are not a cash or ride credit.');
  return m.id;
end $$;

create function public.issue_bario_qr(actor_id uuid, new_hash text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare m public.members; c public.cards; deadline timestamptz := now()+interval '90 seconds';
begin
  select * into m from public.members where auth_user_id=actor_id for update;
  if m.id is null or m.status in ('suspended','expired','replaced') then raise exception 'Membership unavailable.'; end if;
  select * into c from public.cards where member_id=m.id and card_type='digital' and status in ('issued','active')
    and (expires_at is null or expires_at>now()) order by issued_at desc limit 1;
  if c.id is null then raise exception 'No current digital card. Contact membership support.'; end if;
  delete from public.membership_qr_sessions where card_id=c.id or expires_at < now();
  insert into public.membership_qr_sessions(token_hash,card_id,expires_at) values(new_hash,c.id,deadline);
  return jsonb_build_object('cardNumber',c.card_number,'expiresAt',deadline);
end $$;

create function public.scan_bario_card(actor_id uuid, target_bar uuid, scanned_hash text, id_checked boolean default false)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare q public.membership_qr_sessions; c public.cards; m public.members; result text; visit_id uuid;
begin
  if not exists(select 1 from public.bar_staff s join public.partner_bars b on b.id=s.bar_id
    where s.auth_user_id=actor_id and s.bar_id=target_bar and s.active and b.status='approved') then
    raise exception 'Approved bar staff access required.';
  end if;
  select * into q from public.membership_qr_sessions where token_hash=scanned_hash for update;
  if q.card_id is null or q.used_at is not null or q.expires_at<=now() then raise exception 'QR expired or already used. Ask member to refresh.'; end if;
  select * into c from public.cards where id=q.card_id for update;
  select * into m from public.members where id=c.member_id for update;
  select v.result into result from public.age_verifications v where v.member_id=m.id order by v.created_at desc,v.id desc limit 1;
  if id_checked and m.status='age_pending' and m.date_of_birth <= (current_date-interval '21 years')::date then
    insert into public.age_verifications(member_id,method,result,verified_by_user_id,partner_bar_id,verified_at)
      values(m.id,'bar_in_person','passed',actor_id,target_bar,now());
    update public.members set status='active',updated_at=now() where id=m.id returning * into m;
    update public.cards set status='active' where id=c.id and status='issued' returning * into c;
    result := 'passed';
  end if;
  if m.status not in ('approved','issued','active') or m.date_of_birth > (current_date-interval '21 years')::date
    or result is distinct from 'passed' or c.status not in ('issued','active') or (c.expires_at is not null and c.expires_at<=now()) then
    raise exception 'Membership or age approval pending, suspended, or expired. No visit recorded.';
  end if;
  update public.membership_qr_sessions set used_at=now() where token_hash=scanned_hash;
  insert into public.card_scans(card_id,partner_bar_id,valid_at_scan) values(c.id,target_bar,true);
  insert into public.member_visits(member_id,bar_id,staff_user_id) values(m.id,target_bar,actor_id)
    on conflict(member_id,bar_id,visit_day) do nothing returning id into visit_id;
  if visit_id is not null then
    insert into public.member_events(member_id,bar_id,kind,description) values(m.id,target_bar,'visit','Verified bar visit. No points awarded automatically.');
  end if;
  return jsonb_build_object('valid',true,'memberName',m.full_name,'memberNumber',m.member_number,
    'visitRecorded',visit_id is not null,'pointsAwarded',0,'message',case when visit_id is null then 'Visit already recorded today (UTC).' else 'Visit recorded.' end);
end $$;
revoke all on function public.enroll_bario_member(uuid,jsonb),public.issue_bario_qr(uuid,text),public.scan_bario_card(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.enroll_bario_member(uuid,jsonb),public.issue_bario_qr(uuid,text),public.scan_bario_card(uuid,uuid,text,boolean) to service_role;

grant all on public.membership_qr_sessions,public.member_visits,public.member_events to service_role;
