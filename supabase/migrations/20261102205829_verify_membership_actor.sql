create or replace function public.enroll_bario_member(actor_id uuid, payload jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare verified_email text := lower(payload->>'verified_email'); m public.members; card_id uuid; birth date;
begin
  -- Only the service role can call this function. The API supplies the email
  -- returned by Auth.getUser after checking email confirmation.
  if actor_id is null or verified_email is null or verified_email='' then raise exception 'Verified account required.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor_id::text,0));
  select * into m from public.members where auth_user_id=actor_id;
  if m.id is not null then return m.id; end if;
  -- An email-confirmed account may claim only its own legacy membership.
  select * into m from public.members where lower(email)=verified_email for update;
  if m.id is not null then
    if m.auth_user_id is not null then raise exception 'Membership already linked.'; end if;
    update public.members set auth_user_id=actor_id, updated_at=now() where id=m.id;
    return m.id;
  end if;
  birth := (payload->>'date_of_birth')::date;
  if birth is null or birth > (current_date - interval '21 years')::date then raise exception '21+ only'; end if;
  insert into public.members(member_number,full_name,email,phone,date_of_birth,auth_user_id,preferred_delivery,membership_plan)
  values(payload->>'member_number',btrim(payload->>'full_name'),verified_email,nullif(payload->>'phone',''),birth,actor_id,'pickup','free_launch') returning * into m;
  insert into public.age_verifications(member_id,method,result) values(m.id,'bar_in_person','pending');
  insert into public.cards(member_id,card_number,qr_token_hash,card_type,status,issued_by)
    values(m.id,payload->>'card_number',payload->>'qr_token_hash','digital','issued','bario') returning id into card_id;
  insert into public.member_events(member_id,kind,points_delta,description)
    values(m.id,'welcome',m.points,'Welcome to BARIO — free launch membership. Welcome points are not a cash or ride credit.');
  return m.id;
end $$;


revoke all on function public.enroll_bario_member(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.enroll_bario_member(uuid,jsonb) to service_role;
